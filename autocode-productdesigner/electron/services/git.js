const simpleGit = require("simple-git");

function createGitService() {
  async function getRepo(workspacePath) {
    const git = simpleGit(workspacePath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error("Not a git repository");
    }
    return git;
  }

  async function getGitStatus(workspacePath) {
    const git = await getRepo(workspacePath);
    const status = await git.status();
    const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
    const [ahead, behind] = await Promise.all([
      git.revparse(["rev-list", "--count", "--right-only", "@{u}..HEAD"]).catch(() => "0"),
      git.revparse(["rev-list", "--count", "--left-only", "@{u}..HEAD"]).catch(() => "0")
    ]);

    const files = [];

    for (const file of status.modified) {
      files.push({ path: file, status: "modified" });
    }
    for (const file of status.staged) {
      files.push({ path: file, status: "staged" });
    }
    for (const file of status.not_added) {
      files.push({ path: file, status: "untracked" });
    }
    for (const file of status.created) {
      const existsInStaged = status.staged.includes(file);
      files.push({ path: file, status: existsInStaged ? "staged" : "untracked" });
    }
    for (const file of status.deleted) {
      files.push({ path: file, status: "deleted" });
    }

    return {
      files,
      currentBranch: branch,
      ahead: parseInt(ahead, 10) || 0,
      behind: parseInt(behind, 10) || 0,
      isRepo: true
    };
  }

  async function stageFile(workspacePath, filePath) {
    const git = await getRepo(workspacePath);
    await git.add(filePath);
  }

  async function unstageFile(workspacePath, filePath) {
    const git = await getRepo(workspacePath);
    await git.reset(["HEAD", "--", filePath]);
  }

  async function stageAll(workspacePath) {
    const git = await getRepo(workspacePath);
    await git.add(["."]);
  }

  async function unstageAll(workspacePath) {
    const git = await getRepo(workspacePath);
    await git.reset(["HEAD"]);
  }

  async function discardChanges(workspacePath, filePath) {
    const git = await getRepo(workspacePath);
    await git.checkout(["--", filePath]);
  }

  async function commit(workspacePath, message, options = {}) {
    const git = await getRepo(workspacePath);
    const args = [];

    if (options.amend) {
      args.push("--amend");
    }

    if (options.signOff) {
      args.push("--signoff");
    }

    args.push("-m", message);

    await git.commit(args);
  }

  async function getDiff(workspacePath, filePath) {
    const git = await getRepo(workspacePath);
    const diff = await git.diff([filePath]);
    const diffStat = await git.diff(["--stat", filePath]);

    const hunks = [];
    const lines = diff.split("\n");

    let currentHunk = null;
    for (const line of lines) {
      const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (hunkMatch) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        currentHunk = {
          oldStart: parseInt(hunkMatch[1], 10),
          oldLines: parseInt(hunkMatch[2] || "1", 10),
          newStart: parseInt(hunkMatch[3], 10),
          newLines: parseInt(hunkMatch[4] || "1", 10),
          lines: []
        };
      } else if (currentHunk) {
        currentHunk.lines.push(line);
      }
    }
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return {
      diff,
      diffStat,
      hunks
    };
  }

  async function getStagedDiff(workspacePath) {
    const git = await getRepo(workspacePath);
    const diff = await git.diff(["--cached"]);
    const diffStat = await git.diff(["--stat", "--cached"]);

    const hunks = [];
    const lines = diff.split("\n");

    let currentHunk = null;
    for (const line of lines) {
      const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (hunkMatch) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        currentHunk = {
          oldStart: parseInt(hunkMatch[1], 10),
          oldLines: parseInt(hunkMatch[2] || "1", 10),
          newStart: parseInt(hunkMatch[3], 10),
          newLines: parseInt(hunkMatch[4] || "1", 10),
          lines: []
        };
      } else if (currentHunk) {
        currentHunk.lines.push(line);
      }
    }
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return {
      diff,
      diffStat,
      hunks
    };
  }

  async function getLog(workspacePath, limit = 20, skip = 0) {
    const git = await getRepo(workspacePath);
    const log = await git.log({ maxCount: limit, skip });
    return log.all.map(entry => ({
      hash: entry.hash,
      shortHash: entry.hash.substring(0, 7),
      message: entry.message,
      author: entry.author_name,
      date: entry.date,
      body: entry.body || ""
    }));
  }

  async function getBranches(workspacePath) {
    const git = await getRepo(workspacePath);
    const branches = await git.branch();
    const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);

    return branches.all.map(name => ({
      name,
      current: name === currentBranch
    }));
  }

  async function getRemoteBranches(workspacePath) {
    const git = await getRepo(workspacePath);
    const branches = await git.branch(["-r"]);
    return branches.all;
  }

  async function createBranch(workspacePath, branchName) {
    const git = await getRepo(workspacePath);
    await git.checkoutLocalBranch(branchName);
  }

  async function deleteBranch(workspacePath, branchName, force = false) {
    const git = await getRepo(workspacePath);
    const args = force ? ["-D", branchName] : ["-d", branchName];
    await git.branch(args);
  }

  async function renameBranch(workspacePath, newName) {
    const git = await getRepo(workspacePath);
    await git.branch(["-m", newName]);
  }

  async function checkoutBranch(workspacePath, branchName) {
    const git = await getRepo(workspacePath);
    await git.checkout(branchName);
  }

  async function mergeBranch(workspacePath, sourceBranch, commitMessage) {
    const git = await getRepo(workspacePath);
    await git.merge([sourceBranch, "-m", commitMessage || `Merge branch '${sourceBranch}'`]);
  }

  async function rebaseBranch(workspacePath, branchName) {
    const git = await getRepo(workspacePath);
    await git.rebase([branchName]);
  }

  async function abortRebase(workspacePath) {
    const git = await getRepo(workspacePath);
    await git.rebase(["--abort"]);
  }

  async function continueRebase(workspacePath) {
    const git = await getRepo(workspacePath);
    await git.rebase(["--continue"]);
  }

  async function fetch(workspacePath) {
    const git = await getRepo(workspacePath);
    await git.fetch();
  }

  async function pull(workspacePath, options = {}) {
    const git = await getRepo(workspacePath);
    if (options.rebase) {
      await git.pull(["--rebase"]);
    } else {
      await git.pull();
    }
  }

  async function push(workspacePath, options = {}) {
    const git = await getRepo(workspacePath);
    const args = [];
    if (options.tags) {
      args.push("--tags");
    }
    await git.push(args);
  }

  async function pushBranch(workspacePath, branchName, upstream = false) {
    const git = await getRepo(workspacePath);
    if (upstream) {
      await git.push(["-u", "origin", branchName]);
    } else {
      await git.push(["origin", branchName]);
    }
  }

  async function addRemote(workspacePath, name, url) {
    const git = await getRepo(workspacePath);
    await git.remote(["add", name, url]);
  }

  async function removeRemote(workspacePath, name) {
    const git = await getRepo(workspacePath);
    await git.remote(["remove", name]);
  }

  async function getRemotes(workspacePath) {
    const git = await getRepo(workspacePath);
    const result = await git.remote(["get-url", "--all", "origin"]).catch(() => null);
    return result ? [{ name: "origin", url: result }] : [];
  }

  async function initRepo(workspacePath) {
    const git = simpleGit(workspacePath);
    await git.init();
    return git;
  }

  async function isRepo(workspacePath) {
    try {
      const git = simpleGit(workspacePath);
      return await git.checkIsRepo();
    } catch {
      return false;
    }
  }

  async function getLastCommitMessage(workspacePath) {
    try {
      const git = await getRepo(workspacePath);
      const log = await git.log({ maxCount: 1 });
      if (log.latest) {
        return log.latest.message;
      }
      return "";
    } catch {
      return "";
    }
  }

  async function getCommitDetails(workspacePath, hash) {
    const git = await getRepo(workspacePath);
    const commit = await git.show(["--no-patch", hash]);
    const files = await git.show(["--name-only", "--pretty=format:", hash]);

    const fileList = files.split("\n").filter(f => f.trim());

    return {
      hash,
      message: commit.split("\n")[0],
      author: commit.split("\n")[1]?.match(/Author:\s*(.+)/)?.[1] || "",
      date: commit.split("\n")?.find(l => l.startsWith("Date:"))?.substring(5) || "",
      files: fileList
    };
  }

  async function diffBranches(workspacePath, branch1, branch2) {
    const git = await getRepo(workspacePath);
    const diff = await git.diff([branch1, branch2]);
    return diff;
  }

  async function getFileContentAtCommit(workspacePath, filePath, commitHash) {
    const git = await getRepo(workspacePath);
    return git.show([`${commitHash}:${filePath}`]);
  }

  return {
    getGitStatus,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    discardChanges,
    commit,
    getDiff,
    getStagedDiff,
    getLog,
    getBranches,
    getRemoteBranches,
    createBranch,
    deleteBranch,
    renameBranch,
    checkoutBranch,
    mergeBranch,
    rebaseBranch,
    abortRebase,
    continueRebase,
    fetch,
    pull,
    push,
    pushBranch,
    addRemote,
    removeRemote,
    getRemotes,
    initRepo,
    isRepo,
    getLastCommitMessage,
    getCommitDetails,
    diffBranches,
    getFileContentAtCommit
  };
}

module.exports = { createGitService };
