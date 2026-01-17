const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");
const { randomUUID } = require("crypto");
const { initDatabase, closeDatabase, getDb, insertEvent } = require("./services/db");
const { generatePlanning } = require("./services/planning");
const { listDir, readFile, writeFile, createFile, createDir, deletePath, renamePath, pathExists } = require("./services/fileSystem");
const { createTerminalManager } = require("./services/terminal");
const { searchWorkspace } = require("./services/search");
const { createGitService } = require("./services/git");

let mainWindow;
let workspacePath = null;
const terminalManager = createTerminalManager();
const gitService = createGitService();

const isDev = Boolean(process.env.ELECTRON_START_URL);
const allowedDevHosts = new Set(["localhost", "127.0.0.1"]);
const MAX_QUERY_LENGTH = 200;

function getDevUrl() {
  const value = process.env.ELECTRON_START_URL;
  if (!value) {
    throw new Error("ELECTRON_START_URL not set");
  }
  const url = new URL(value);
  if (!allowedDevHosts.has(url.hostname) || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("ELECTRON_START_URL must be a local http(s) address");
  }
  return url.toString();
}

function ensureWorkspace() {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  return workspacePath;
}

function withErrorHandling(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("IPC handler failed", error);
      throw error;
    }
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#020617",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL(getDevUrl());
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "renderer", "index.html");
    mainWindow.loadFile(indexPath);
  }
}

async function selectWorkspace() {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  workspacePath = result.filePaths[0];
  terminalManager.disposeAll();
  await initDatabase(workspacePath);
  insertEvent(null, "info", `Workspace selected: ${workspacePath}`);
  return workspacePath;
}

ipcMain.handle(
  "workspace:select",
  withErrorHandling(async () => {
    return selectWorkspace();
  })
);
ipcMain.handle("workspace:get", () => workspacePath);

ipcMain.handle(
  "fs:list",
  withErrorHandling(async (_event, targetPath) => {
    return listDir(ensureWorkspace(), targetPath || ".");
  })
);

ipcMain.handle(
  "fs:readFile",
  withErrorHandling(async (_event, targetPath) => {
    if (typeof targetPath !== "string") {
      throw new Error("Invalid read path");
    }
    return readFile(ensureWorkspace(), targetPath);
  })
);

ipcMain.handle(
  "fs:writeFile",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.path !== "string" || typeof payload.content !== "string") {
      throw new Error("Invalid write payload");
    }
    writeFile(ensureWorkspace(), payload.path, payload.content);
    insertEvent(null, "info", `Saved file: ${payload.path}`);
    return { ok: true };
  })
);

ipcMain.handle(
  "fs:createFile",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.path !== "string") {
      throw new Error("Invalid create file payload");
    }
    return createFile(ensureWorkspace(), payload.path, payload.content || "");
  })
);

ipcMain.handle(
  "fs:createDir",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.path !== "string") {
      throw new Error("Invalid create dir payload");
    }
    return createDir(ensureWorkspace(), payload.path);
  })
);

ipcMain.handle(
  "fs:delete",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.path !== "string") {
      throw new Error("Invalid delete payload");
    }
    return deletePath(ensureWorkspace(), payload.path);
  })
);

ipcMain.handle(
  "fs:rename",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.sourcePath !== "string" || typeof payload.targetPath !== "string") {
      throw new Error("Invalid rename payload");
    }
    return renamePath(ensureWorkspace(), payload.sourcePath, payload.targetPath);
  })
);

ipcMain.handle(
  "fs:exists",
  withErrorHandling(async (_event, path) => {
    if (typeof path !== "string") {
      throw new Error("Invalid exists path");
    }
    return pathExists(ensureWorkspace(), path);
  })
);

ipcMain.handle("fs:refreshTree", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("fs:treeRefresh");
  }
});

ipcMain.handle(
  "fs:revealPath",
  withErrorHandling(async (_event, relativePath) => {
    if (typeof relativePath !== "string") {
      throw new Error("Invalid path");
    }
    const workspace = ensureWorkspace();
    const resolved = path.resolve(workspace, relativePath);
    if (!resolved.startsWith(workspace)) {
      throw new Error("Path outside workspace");
    }
    const success = await shell.showItemInFolder(resolved);
    return { success };
  })
);

ipcMain.handle(
  "search:run",
  withErrorHandling(async (_event, query) => {
    if (typeof query !== "string") {
      throw new Error("Invalid search query");
    }
    if (query.length > MAX_QUERY_LENGTH) {
      throw new Error("Search query too long");
    }
    return searchWorkspace(ensureWorkspace(), query);
  })
);

ipcMain.handle(
  "planning:start",
  withErrorHandling(async (_event, prompt) => {
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Prompt is required");
    }
    const db = getDb();
    const sessionId = `sess_${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const { questions, spec } = generatePlanning(prompt);

    db.run("BEGIN TRANSACTION");

    try {
      db.run(
        "INSERT INTO sessions (id, prompt, status, created_at) VALUES (?, ?, ?, ?)",
        [sessionId, prompt, "planning", createdAt]
      );

      for (const question of questions) {
        db.run(
          "INSERT INTO questions (id, session_id, text, options_json, recommended_option, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [question.id, sessionId, question.text, JSON.stringify(question.options), question.recommendedOption, createdAt]
        );

        db.run(
          "INSERT INTO answers (id, session_id, question_id, answer, created_at) VALUES (?, ?, ?, ?, ?)",
          [`ans_${question.id}`, sessionId, question.id, question.recommendedOption, createdAt]
        );
      }

      db.run(
        "INSERT INTO specs (id, session_id, spec_json, created_at) VALUES (?, ?, ?, ?)",
        [`spec_${sessionId}`, sessionId, JSON.stringify(spec), createdAt]
      );

      const tasks = [
        "Generate architecture plan",
        "Establish agent roles",
        "Prepare execution graph"
      ];

      tasks.forEach((title, index) => {
        db.run(
          "INSERT INTO tasks (id, session_id, title, status, created_at) VALUES (?, ?, ?, ?, ?)",
          [`task_${sessionId}_${index + 1}`, sessionId, title, "queued", createdAt]
        );
      });

      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }

    insertEvent(sessionId, "info", "Planning complete with auto-selected defaults.");

    return { sessionId, questions, spec };
  })
);

ipcMain.handle(
  "planning:answer",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.answer !== "string") {
      throw new Error("Invalid answer payload");
    }
    const db = getDb();
    db.run(
      "UPDATE answers SET answer = ? WHERE session_id = ? AND question_id = ?",
      [payload.answer, payload.sessionId, payload.questionId]
    );
    insertEvent(payload.sessionId, "info", `Answer updated for ${payload.questionId}`);
    return { ok: true };
  })
);

ipcMain.handle(
  "events:list",
  withErrorHandling(async (_event, sessionId) => {
    const db = getDb();
    const result = db.exec("SELECT id, level, message, created_at, session_id FROM events WHERE session_id IS ? ORDER BY created_at DESC LIMIT 200", [sessionId || null]);
    if (result.length === 0) return [];
    return result[0].values.map((row, index) => {
      const columns = result[0].columns;
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  })
);

ipcMain.handle(
  "logs:clear",
  withErrorHandling(async () => {
    const db = getDb();
    db.run("DELETE FROM events");
    return { ok: true };
  })
);

ipcMain.handle(
  "run:command",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.command !== "string" || typeof payload.cwd !== "string") {
      throw new Error("Invalid command payload");
    }
    const { execSync } = require("child_process");
    try {
      const output = execSync(payload.command, {
        cwd: payload.cwd,
        encoding: "utf-8",
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024
      });
      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || "",
        error: error.message
      };
    }
  })
);

ipcMain.handle(
  "tasks:list",
  withErrorHandling(async (_event, sessionId) => {
    const db = getDb();
    const result = db.exec("SELECT id, title, status, created_at FROM tasks WHERE session_id = ? ORDER BY created_at ASC", [sessionId]);
    if (result.length === 0) return [];
    return result[0].values.map((row, index) => {
      const columns = result[0].columns;
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  })
);

ipcMain.handle(
  "terminal:start",
  withErrorHandling(async () => {
    const activeWorkspace = ensureWorkspace();
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error("Main window is not ready");
    }
    const terminalId = terminalManager.create(activeWorkspace, mainWindow.webContents);
    return { terminalId };
  })
);

ipcMain.handle(
  "terminal:create",
  withErrorHandling(async (_event, payload) => {
    const activeWorkspace = ensureWorkspace();
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error("Main window is not ready");
    }
    const shell = payload?.shell || "powershell.exe";
    const terminalId = terminalManager.create(activeWorkspace, mainWindow.webContents, shell);
    return { terminalId };
  })
);

ipcMain.handle("terminal:list", () => {
  return terminalManager.list();
});

ipcMain.handle(
  "terminal:rename",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.terminalId !== "string" || typeof payload.name !== "string") {
      throw new Error("Invalid rename payload");
    }
    terminalManager.rename(payload.terminalId, payload.name);
    return { ok: true };
  })
);

ipcMain.handle(
  "terminal:kill",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.terminalId !== "string") {
      throw new Error("Invalid kill payload");
    }
    terminalManager.killProcess(payload.terminalId);
    return { ok: true };
  })
);

ipcMain.handle("terminal:getShells", () => {
  return terminalManager.getAvailableShells();
});

ipcMain.on("terminal:input", (_event, payload) => {
  if (!payload || typeof payload.terminalId !== "string" || typeof payload.data !== "string") {
    return;
  }
  terminalManager.write(payload.terminalId, payload.data);
});

ipcMain.on("terminal:resize", (_event, payload) => {
  if (!payload || typeof payload.terminalId !== "string") {
    return;
  }
  terminalManager.resize(payload.terminalId, payload.cols, payload.rows);
});

ipcMain.on("terminal:dispose", (_event, payload) => {
  if (!payload || typeof payload.terminalId !== "string") {
    return;
  }
  terminalManager.dispose(payload.terminalId);
});

ipcMain.handle(
  "git:status",
  withErrorHandling(async (_event, workspace) => {
    const targetPath = workspace || ensureWorkspace();
    return gitService.getGitStatus(targetPath);
  })
);

  ipcMain.handle(
    "git:stage",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid stage payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.stageFile(targetPath, payload.path);
    })
  );

  ipcMain.handle(
    "git:stage-all",
    withErrorHandling(async (_event, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      await gitService.stageAll(targetPath);
    })
  );

  ipcMain.handle(
    "git:unstage-all",
    withErrorHandling(async (_event, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      await gitService.unstageAll(targetPath);
    })
  );

  ipcMain.handle(
    "git:unstage",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid unstage payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.unstageFile(targetPath, payload.path);
    })
  );

ipcMain.handle(
  "git:discard",
  withErrorHandling(async (_event, payload) => {
    if (!payload || typeof payload.path !== "string") {
      throw new Error("Invalid discard payload");
    }
    const targetPath = payload.workspace || ensureWorkspace();
    await gitService.discardChanges(targetPath, payload.path);
  })
);

  ipcMain.handle(
    "git:commit",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.message !== "string") {
        throw new Error("Invalid commit payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.commit(targetPath, payload.message, {
        amend: payload.amend || false,
        signOff: payload.signOff || false
      });
    })
  );

  ipcMain.handle(
    "git:diff",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid diff payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      return gitService.getDiff(targetPath, payload.path);
    })
  );

  ipcMain.handle(
    "git:staged-diff",
    withErrorHandling(async (_event, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      return gitService.getStagedDiff(targetPath);
    })
  );

  ipcMain.handle(
    "git:log",
    withErrorHandling(async (_event, payload) => {
      const targetPath = payload?.workspace || ensureWorkspace();
      return gitService.getLog(targetPath, payload?.limit || 20, payload?.skip || 0);
    })
  );

  ipcMain.handle(
    "git:branches",
    withErrorHandling(async () => {
      return gitService.getBranches(ensureWorkspace());
    })
  );

  ipcMain.handle(
    "git:remote-branches",
    withErrorHandling(async () => {
      return gitService.getRemoteBranches(ensureWorkspace());
    })
  );

  ipcMain.handle(
    "git:branch-create",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid branch create payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.createBranch(targetPath, payload.name);
    })
  );

  ipcMain.handle(
    "git:branch-delete",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid branch delete payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.deleteBranch(targetPath, payload.name, payload.force || false);
    })
  );

  ipcMain.handle(
    "git:branch-rename",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid branch rename payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.renameBranch(targetPath, payload.name);
    })
  );

  ipcMain.handle(
    "git:branch-checkout",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid branch checkout payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.checkoutBranch(targetPath, payload.name);
    })
  );

  ipcMain.handle(
    "git:is-repo",
    withErrorHandling(async (_event, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      return gitService.isRepo(targetPath);
    })
  );

  ipcMain.handle(
    "git:merge",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.sourceBranch !== "string") {
        throw new Error("Invalid merge payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.mergeBranch(targetPath, payload.sourceBranch, payload.message);
    })
  );

  ipcMain.handle(
    "git:rebase",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.branch !== "string") {
        throw new Error("Invalid rebase payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.rebaseBranch(targetPath, payload.branch);
    })
  );

  ipcMain.handle(
    "git:rebase-abort",
    withErrorHandling(async (_event, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      await gitService.abortRebase(targetPath);
    })
  );

  ipcMain.handle(
    "git:rebase-continue",
    withErrorHandling(async (_event, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      await gitService.continueRebase(targetPath);
    })
  );

  ipcMain.handle(
    "git:fetch",
    withErrorHandling(async (_event, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      await gitService.fetch(targetPath);
    })
  );

  ipcMain.handle(
    "git:pull",
    withErrorHandling(async (_event, payload) => {
      const targetPath = payload?.workspace || ensureWorkspace();
      await gitService.pull(targetPath, { rebase: payload?.rebase || false });
    })
  );

  ipcMain.handle(
    "git:push",
    withErrorHandling(async (_event, payload) => {
      const targetPath = payload?.workspace || ensureWorkspace();
      if (payload?.branch) {
        await gitService.pushBranch(targetPath, payload.branch, payload.upstream || false);
      } else {
        await gitService.push(targetPath, { tags: payload?.tags || false });
      }
    })
  );

  ipcMain.handle(
    "git:remotes",
    withErrorHandling(async () => {
      return gitService.getRemotes(ensureWorkspace());
    })
  );

  ipcMain.handle(
    "git:remote-add",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.name !== "string" || typeof payload.url !== "string") {
        throw new Error("Invalid remote add payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.addRemote(targetPath, payload.name, payload.url);
    })
  );

  ipcMain.handle(
    "git:remote-remove",
    withErrorHandling(async (_event, payload) => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid remote remove payload");
      }
      const targetPath = payload.workspace || ensureWorkspace();
      await gitService.removeRemote(targetPath, payload.name);
    })
  );

  ipcMain.handle(
    "git:last-commit-message",
    withErrorHandling(async (_event, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      return gitService.getLastCommitMessage(targetPath);
    })
  );

  ipcMain.handle(
    "git:commit-details",
    withErrorHandling(async (_event, hash, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      return gitService.getCommitDetails(targetPath, hash);
    })
  );

  ipcMain.handle(
    "git:diff-branches",
    withErrorHandling(async (_event, branch1, branch2, workspace) => {
      const targetPath = workspace || ensureWorkspace();
      return gitService.diffBranches(targetPath, branch1, branch2);
    })
  );

ipcMain.handle(
  "git:init",
  withErrorHandling(async () => {
    return gitService.initRepo(ensureWorkspace());
  })
);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  terminalManager.disposeAll();
  closeDatabase();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
