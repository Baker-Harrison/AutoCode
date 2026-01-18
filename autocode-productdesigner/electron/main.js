const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { createTerminalManager } = require("./services/terminal");
const { closeDatabase } = require("./services/db");
const { registerAllIpcHandlers } = require("./ipc/index");

let mainWindow;
const terminalManager = createTerminalManager();

const isDev = Boolean(process.env.ELECTRON_START_URL);
const allowedDevHosts = new Set(["localhost", "127.0.0.1"]);

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

  return mainWindow;
}

const state = {
  workspacePath: null,
  mainWindow: null
};

const windowRef = createWindow();
state.mainWindow = windowRef;

ipcMain.on("window:ready", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("window:ready");
  }
});

registerAllIpcHandlers(ipcMain, state, terminalManager);

app.whenReady().then(() => {
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow();
      state.mainWindow = newWindow;
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
