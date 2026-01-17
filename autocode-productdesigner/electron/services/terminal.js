const { randomUUID } = require("crypto");
const { spawn, execSync } = require("child_process");
const path = require("path");
const os = require("os");

const MAX_INPUT_SIZE = 10000;

function createTerminalManager() {
  const terminals = new Map();
  const terminalNames = new Map();
  let terminalCounter = 1;

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
      return process.env.SHELL || "/bin/bash";
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
      shells.push({ name: process.env.SHELL || "Shell", path: process.env.SHELL || "/bin/bash" });
    }

    return shells;
  }

  function create(cwd, webContents, shellPath) {
    const terminalId = `term_${randomUUID()}`;
    const shell = shellPath || getDefaultShell();

    const shellArgs = getShellArgs(shell);

    const shellProcess = spawn(shell, shellArgs, {
      cwd,
      env: { ...process.env, TERM: "xterm-256color" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    shellProcess.stdout.on("data", (data) => {
      safeSend(webContents, "terminal:data", { terminalId, data: data.toString() });
    });

    shellProcess.stderr.on("data", (data) => {
      safeSend(webContents, "terminal:data", { terminalId, data: data.toString() });
    });

    shellProcess.on("close", (code) => {
      const name = terminalNames.get(terminalId);
      terminals.delete(terminalId);
      terminalNames.delete(terminalId);
      safeSend(webContents, "terminal:data", {
        terminalId,
        data: `\r\n[terminal closed with code ${code}]\r\n`
      });
    });

    shellProcess.on("error", (error) => {
      console.error("Terminal spawn error:", error);
      safeSend(webContents, "terminal:data", {
        terminalId,
        data: `\r\n[terminal error: ${error.message}]\r\n`
      });
    });

    terminals.set(terminalId, {
      process: shellProcess,
      xterm: null,
      cols: 80,
      rows: 24
    });

    const name = `Shell ${terminalCounter++}`;
    terminalNames.set(terminalId, name);

    const welcomeMsg = getWelcomeMessage(shell);
    safeSend(webContents, "terminal:data", {
      terminalId,
      data: welcomeMsg
    });

    return terminalId;
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

  function getWelcomeMessage(shell) {
    const platform = os.platform();
    const shellName = path.basename(shell).replace(".exe", "");

    if (platform === "win32") {
      return `\x1b[32m${shellName}\x1b[0m started. Type commands below.\r\n`;
    } else {
      return `\x1b[32m${shellName}\x1b[0m started. Type commands below.\r\n`;
    }
  }

  function write(terminalId, data) {
    if (typeof data !== "string") {
      return;
    }
    const termData = terminals.get(terminalId);
    if (termData && termData.process && !termData.process.killed) {
      const chunk = data.length > MAX_INPUT_SIZE ? data.slice(0, MAX_INPUT_SIZE) : data;
      try {
        termData.process.stdin.write(chunk);
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
    if (termData.process && !termData.process.killed && termData.process.resize) {
      try {
        termData.process.resize(cols, rows);
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

  function dispose(terminalId) {
    const termData = terminals.get(terminalId);
    if (termData) {
      try {
        if (termData.process.stdin && !termData.process.killed) {
          termData.process.stdin.end();
        }
        if (!termData.process.killed) {
          termData.process.kill("SIGTERM");
        }
      } catch (error) {
        console.error("Failed to dispose terminal", terminalId, error);
      }
      terminals.delete(terminalId);
      terminalNames.delete(terminalId);
    }
  }

  function disposeAll() {
    for (const [terminalId, termData] of terminals.entries()) {
      try {
        if (termData.process.stdin && !termData.process.killed) {
          termData.process.stdin.end();
        }
        if (!termData.process.killed) {
          termData.process.kill("SIGTERM");
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
        shell: termData.process?.spawnfile || "unknown"
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
        termData.process.kill("SIGKILL");
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
