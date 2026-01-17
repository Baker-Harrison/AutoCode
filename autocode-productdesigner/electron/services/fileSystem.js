const fs = require("fs");
const path = require("path");

function resolveSafePath(workspacePath, targetPath) {
  const resolved = path.resolve(workspacePath, targetPath || ".");
  if (!resolved.startsWith(workspacePath)) {
    throw new Error("Invalid path outside workspace");
  }
  return resolved;
}

function listDir(workspacePath, targetPath) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const resolved = resolveSafePath(workspacePath, targetPath);
  const entries = fs.readdirSync(resolved, { withFileTypes: true });

  return entries.map((entry) => {
    const absolutePath = path.join(resolved, entry.name);
    return {
      name: entry.name,
      path: absolutePath,
      relativePath: path.relative(workspacePath, absolutePath),
      type: entry.isDirectory() ? "directory" : "file"
    };
  });
}

function readFile(workspacePath, targetPath) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const resolved = resolveSafePath(workspacePath, targetPath);
  const stat = fs.statSync(resolved);
  if (stat.size > 1024 * 1024) {
    throw new Error("File too large to preview");
  }
  return fs.readFileSync(resolved, "utf-8");
}

function writeFile(workspacePath, targetPath, content) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const resolved = resolveSafePath(workspacePath, targetPath);
  fs.writeFileSync(resolved, content, "utf-8");
}

function createFile(workspacePath, relativePath, content = "") {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const resolved = resolveSafePath(workspacePath, relativePath);
  fs.writeFileSync(resolved, content, "utf-8");
  const absolutePath = path.resolve(resolved);
  return {
    ok: true,
    path: path.relative(workspacePath, absolutePath)
  };
}

function createDir(workspacePath, relativePath) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const resolved = resolveSafePath(workspacePath, relativePath);
  fs.mkdirSync(resolved, { recursive: true });
  const absolutePath = path.resolve(resolved);
  return {
    ok: true,
    path: path.relative(workspacePath, absolutePath)
  };
}

function deletePath(workspacePath, relativePath) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const resolved = resolveSafePath(workspacePath, relativePath);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(resolved);
    if (entries.length > 0) {
      throw new Error("Directory is not empty");
    }
    fs.rmdirSync(resolved);
  } else {
    fs.unlinkSync(resolved);
  }
  return { ok: true };
}

function renamePath(workspacePath, sourcePath, targetPath) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const resolvedSource = resolveSafePath(workspacePath, sourcePath);
  const resolvedTarget = resolveSafePath(workspacePath, targetPath);
  fs.renameSync(resolvedSource, resolvedTarget);
  const absolutePath = path.resolve(resolvedTarget);
  return {
    ok: true,
    newPath: path.relative(workspacePath, absolutePath)
  };
}

function pathExists(workspacePath, relativePath) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const resolved = resolveSafePath(workspacePath, relativePath);
  if (!fs.existsSync(resolved)) {
    return { exists: false, isDirectory: false };
  }
  const stat = fs.statSync(resolved);
  return {
    exists: true,
    isDirectory: stat.isDirectory()
  };
}

module.exports = {
  listDir,
  readFile,
  writeFile,
  createFile,
  createDir,
  deletePath,
  renamePath,
  pathExists
};
