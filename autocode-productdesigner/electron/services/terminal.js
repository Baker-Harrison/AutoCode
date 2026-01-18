const { randomUUID } = require("crypto");
const path = require("path");
const os = require("os");
const fs = require("fs");

const MAX_INPUT_SIZE = 10000;

function createTerminalManager() {
  const terminals = new Map();
  const terminalNames = new Map();
  let terminalCounter = 1;

  let pty = null;
  let usePty = true;

  try {
    pty = require("node-pty");
  } catch (error) {
    console.warn("node-pty not available, falling back to child_process");
    usePty = false;
  }

  function safeSend(webContents, channel, payload) {
    if (!webContents || webContents.isDestroyed()) {
      return;
    }
    try {
      webContents.send(channel, payload);
    } catch (error) {
      console.error("Failed to send terminal data", error);
    }
  }

  function getDefaultShell() {
    const platform = os.platform();
    if (platform === "win32") {
      return "powershell.exe";
    } else if (platform === "linux") {
      return process.env.SHELL || "/bin/bash";
    } else {
      return process.env.SHELL || "/bin/zsh";
    }
  }

  function resolveShellPath(shellPath) {
    const platform = os.platform();
    const shells = getAvailableShells();
    const allowedShells = new Set(shells.map((shell) => shell.path));

    const candidate = typeof shellPath === "string" ? shellPath.trim() : "";
    if (candidate && allowedShells.has(candidate)) {
      return candidate;
    }

    const fallback = platform === "win32" ? "powershell.exe" : "/bin/zsh";
    if (allowedShells.has(fallback)) {
      return fallback;
    }

    return shells[0]?.path || fallback;
  }


  function validateCwd(cwd) {
    if (!cwd || typeof cwd !== "string") {
      return false;
    }
    try {
      return fs.existsSync(cwd) && fs.statSync(cwd).isDirectory();
    } catch (error) {
      return false;
    }
  }

  function getAvailableShells() {
    const shells = [];
    const platform = os.platform();

    if (platform === "win32") {
      shells.push({ name: "PowerShell", path: "powershell.exe" });
      shells.push({ name: "Command Prompt", path: "cmd.exe" });
      shells.push({ name: "WSL", path: "wsl.exe" });

      try {
        const gitBashPath = path.join(process.env.ProgramFiles || "C:\\Program Files", "Git", "bin", "bash.exe");
        require("fs").existsSync(gitBashPath) && shells.push({ name: "Git Bash", path: gitBashPath });
      } catch (e) {}

      const gitForWindowsPath = path.join(process.env.LocalAppData || process.env.AppData || "", "Programs", "Git", "bin", "bash.exe");
      try {
        require("fs").existsSync(gitForWindowsPath) && shells.push({ name: "Git Bash", path: gitForWindowsPath });
      } catch (e) {}
    } else {
      shells.push({ name: "Bash", path: "/bin/bash" });
      shells.push({ name: "Zsh", path: "/bin/zsh" });
      shells.push({ name: "Fish", path: "/usr/bin/fish" });
      shells.push({ name: process.env.SHELL || "Shell", path: process.env.SHELL || "/bin/zsh" });
    }

    return shells;
  }

  function getShellArgs(shell) {
    const platform = os.platform();
    const shellLower = shell.toLowerCase();

    if (platform === "win32") {
      if (shellLower.includes("powershell")) {
        return ["-NoLogo", "-Command", "-"];
      } else if (shellLower.includes("cmd")) {
        return ["/K", "cls"];
      } else if (shellLower.includes("wsl")) {
        return ["-e", "bash"];
      } else {
        return ["--login", "-i"];
      }
    } else {
      return ["--login", "-i"];
    }
  }

  function createPtyTerminal(cwd, webContents, shellPath) {
    const platform = os.platform();

    let shellExecutable, shellArgs;

    if (shellPath) {
      shellExecutable = shellPath;
      shellArgs = getShellArgs(shellPath);
    } else {
      if (platform === "win32") {
        shellExecutable = "powershell.exe";
        shellArgs = ["-NoLogo", "-Command", "-"];
      } else {
        shellExecutable = process.env.SHELL || "/bin/zsh";
        shellArgs = ["--login", "-i"];
      }
    }

    const env = { ...process.env, TERM: "xterm-256color" };

    const shellProcess = pty.spawn(shellExecutable, shellArgs, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: cwd,
      env: env
    });

    return shellProcess;
  }

  function createChildProcessTerminal(cwd, webContents, shellPath) {
    const { spawn } = require("child_process");
    const platform = os.platform();

    let shellExecutable, shellArgs;

    if (shellPath) {
      shellExecutable = shellPath;
      shellArgs = getShellArgs(shellPath);
    } else {
      if (platform === "win32") {
        shellExecutable = "powershell.exe";
        shellArgs = ["-NoLogo", "-Command", "-"];
      } else {
        shellExecutable = process.env.SHELL || "/bin/zsh";
        shellArgs = ["--login", "-i"];
      }
    }

    const shellProcess = spawn(shellExecutable, shellArgs, {
      cwd,
      env: { ...process.env, TERM: "xterm-256color" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    return shellProcess;
  }

  function create(cwd, webContents, shellPath) {
    const terminalId = `term_${randomUUID()}`;
    const platform = os.platform();
    const resolvedShell = resolveShellPath(shellPath);

    if (!validateCwd(cwd)) {
      const message = `\r\n[terminal error: invalid working directory ${cwd}]\r\n`;
      safeSend(webContents, "terminal:data", { terminalId, data: message });
      return { terminalId, usePty: false, error: "Invalid working directory" };
    }

    if (!usePty || !pty) {
      const message = "\r\n[terminal error: PTY unavailable; interactive terminal disabled]\r\n";
      safeSend(webContents, "terminal:data", { terminalId, data: message });
      return { terminalId, usePty: false, error: "PTY unavailable" };
    }

    let shellProcess;
    try {
      shellProcess = createPtyTerminal(cwd, webContents, resolvedShell);
    } catch (error) {
      console.error("Failed to create terminal with pty:", error);
      const message = `\r\n[terminal error: PTY spawn failed for ${resolvedShell}. ${error.message}]\r\n`;
      safeSend(webContents, "terminal:data", { terminalId, data: message });
      return { terminalId, usePty: false, error: `PTY spawn failed for ${resolvedShell}. ${error.message}`, shell: resolvedShell };
    }

    const terminalUsesPty = true;

    shellProcess.onData((data) => {
      safeSend(webContents, "terminal:data", { terminalId, data: data.toString() });
    });

    shellProcess.onExit(({ exitCode }) => {
      terminals.delete(terminalId);
      terminalNames.delete(terminalId);
      safeSend(webContents, "terminal:data", {
        terminalId,
        data: `\r\n[terminal closed with code ${exitCode}]\r\n`
      });
    });

    terminals.set(terminalId, {
      process: shellProcess,
      xterm: null,
      cols: 80,
      rows: 24,
      usePty: terminalUsesPty
    });

    const name = `Shell ${terminalCounter++}`;
    terminalNames.set(terminalId, name);

    const shellName = resolvedShell ? path.basename(resolvedShell).replace(".exe", "") : (platform === "win32" ? "PowerShell" : "Shell");
    const welcomeMsg = `\x1b[32m${shellName}\x1b[0m started. Type commands below.\r\n`;
    safeSend(webContents, "terminal:data", {
      terminalId,
      data: welcomeMsg
    });

    return { terminalId, usePty: terminalUsesPty, shell: resolvedShell };
  }

  function write(terminalId, data) {
    if (typeof data !== "string") {
      return;
    }
    const termData = terminals.get(terminalId);
    if (termData && termData.process && !termData.process.killed) {
      const normalized = data.replace(/\x00/g, "");
      const chunk = normalized.length > MAX_INPUT_SIZE ? normalized.slice(0, MAX_INPUT_SIZE) : normalized;
      try {
        if (termData.usePty) {
          termData.process.write(chunk);
        } else {
          if (termData.process.stdin && !termData.process.stdin.destroyed) {
            termData.process.stdin.write(chunk);
          }
        }
      } catch (error) {
        console.error("Failed to write to terminal", error);
      }
    }
  }


  function resize(terminalId, cols, rows) {
    const termData = terminals.get(terminalId);
    if (!termData) {
      return;
    }
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) {
      return;
    }
    termData.cols = cols;
    termData.rows = rows;
    if (termData.process && !termData.process.killed) {
      try {
        if (termData.usePty) {
          termData.process.resize(cols, rows);
        }
      } catch (error) {
        console.error("Failed to resize pty", error);
      }
    }
    if (termData.xterm) {
      try {
        termData.xterm.resize(cols, rows);
      } catch (error) {
        console.error("Failed to resize xterm", error);
      }
    }
  }

  function killProcessOnPlatform(process, platform) {
    if (!process || process.killed) return;

    if (platform === "win32") {
      try {
        require("child_process").execSync(`taskkill /F /PID ${process.pid}`, { stdio: "ignore" });
      } catch (error) {
        console.error("Failed to kill process on Windows", error);
      }
    } else {
      try {
        process.kill("SIGKILL");
      } catch (error) {
        try {
          process.kill("SIGTERM");
        } catch (e) {
          console.error("Failed to kill process", e);
        }
      }
    }
  }

  function dispose(terminalId) {
    const termData = terminals.get(terminalId);
    if (termData) {
      try {
        if (termData.usePty) {
          killProcessOnPlatform(termData.process, os.platform());
        } else {
          if (termData.process.stdin && !termData.process.stdin.destroyed) {
            termData.process.stdin.end();
          }
          if (!termData.process.killed) {
            killProcessOnPlatform(termData.process, os.platform());
          }
        }
      } catch (error) {
        console.error("Failed to dispose terminal", terminalId, error);
      }
      terminals.delete(terminalId);
      terminalNames.delete(terminalId);
    }
  }

  function disposeAll() {
    const platform = os.platform();
    for (const [terminalId, termData] of terminals.entries()) {
      try {
        if (termData.usePty) {
          killProcessOnPlatform(termData.process, platform);
        } else {
          if (termData.process.stdin && !termData.process.stdin.destroyed) {
            termData.process.stdin.end();
          }
          if (!termData.process.killed) {
            killProcessOnPlatform(termData.process, platform);
          }
        }
      } catch (error) {
        console.error("Failed to dispose terminal", terminalId, error);
      }
    }
    terminals.clear();
    terminalNames.clear();
  }

  function list() {
    const result = [];
    for (const [terminalId, termData] of terminals.entries()) {
      const name = terminalNames.get(terminalId) || `Shell ${terminalCounter}`;
      const isRunning = termData.process && !termData.process.killed;
      result.push({
        id: terminalId,
        name,
        isRunning,
        shell: termData.process?.spawnfile || termData.process?.spawnargs?.[0] || "unknown"
      });
    }
    return result;
  }

  function rename(terminalId, newName) {
    if (terminalNames.has(terminalId)) {
      terminalNames.set(terminalId, newName);
    }
  }

  function killProcess(terminalId) {
    const termData = terminals.get(terminalId);
    if (termData && termData.process && !termData.process.killed) {
      try {
        killProcessOnPlatform(termData.process, os.platform());
      } catch (error) {
        console.error("Failed to kill process", error);
      }
    }
  }

  return {
    create,
    write,
    resize,
    dispose,
    disposeAll,
    list,
    rename,
    killProcess,
    getAvailableShells
  };
}

module.exports = {
  createTerminalManager
};
