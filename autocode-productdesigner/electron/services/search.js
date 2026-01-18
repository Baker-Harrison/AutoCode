const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "data"]);
const MAX_FILE_SIZE = 512 * 1024;
const MAX_RESULTS = 200;

function isInsideRoot(root, target) {
  const relative = path.relative(root, target);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function walkDir(root, workspaceRoot, callback) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (error) {
    return true;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    let stat;

    try {
      stat = fs.lstatSync(fullPath);
    } catch (error) {
      continue;
    }

    if (stat.isSymbolicLink()) {
      continue;
    }

    let realPath = fullPath;
    try {
      realPath = fs.realpathSync(fullPath);
    } catch (error) {
      continue;
    }

    if (!isInsideRoot(workspaceRoot, realPath)) {
      continue;
    }

    if (stat.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      const shouldContinue = walkDir(realPath, workspaceRoot, callback);
      if (shouldContinue === false) {
        return false;
      }
    } else {
      const shouldContinue = callback(realPath);
      if (shouldContinue === false) {
        return false;
      }
    }
  }
  return true;
}

function searchWorkspace(workspacePath, query) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }
  const trimmed = typeof query === "string" ? query.trim() : "";
  if (!trimmed) {
    return [];
  }

  const root = fs.realpathSync(workspacePath);
  const lowerQuery = trimmed.toLowerCase();
  const results = [];

  walkDir(root, root, (filePath) => {
    if (results.length >= MAX_RESULTS) {
      return false;
    }
    let stat;
    try {
      stat = fs.statSync(filePath, { throwIfNoEntry: false });
    } catch (error) {
      return true;
    }
    if (!stat || !stat.isFile() || stat.size > MAX_FILE_SIZE) {
      return true;
    }

    const relativePath = path.relative(root, filePath);
    const matchesName = path.basename(filePath).toLowerCase().includes(lowerQuery);
    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      console.warn("Failed to read file", filePath, error);
      return true;
    }

    if (matchesName) {
      results.push({
        path: filePath,
        relativePath,
        line: 0,
        preview: "Filename match"
      });
      if (results.length >= MAX_RESULTS) {
        return false;
      }
    }

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (results.length >= MAX_RESULTS) {
        return false;
      }
      const line = lines[index];
      if (line.toLowerCase().includes(lowerQuery)) {
        results.push({
          path: filePath,
          relativePath,
          line: index + 1,
          preview: line.trim().slice(0, 160)
        });
      }
    }

    return true;
  });

  return results;
}

module.exports = {
  searchWorkspace
};
