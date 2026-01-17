const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "data"]);
const MAX_FILE_SIZE = 512 * 1024;
const MAX_RESULTS = 200;

function walkDir(root, callback) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      const shouldContinue = walkDir(fullPath, callback);
      if (shouldContinue === false) {
        return false;
      }
    } else {
      const shouldContinue = callback(fullPath);
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
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const lowerQuery = trimmed.toLowerCase();
  const results = [];

  walkDir(workspacePath, (filePath) => {
    if (results.length >= MAX_RESULTS) {
      return false;
    }
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) {
      return true;
    }

    const relativePath = path.relative(workspacePath, filePath);
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
