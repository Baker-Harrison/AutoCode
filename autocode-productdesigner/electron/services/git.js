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

  function getTeamsConfigPath(workspacePath) {
    return require("path").join(workspacePath, ".workspace", "teams.json");
  }

  async function loadTeams(workspacePath) {
    const fs = require("fs").promises;
    const path = require("path");
    const configPath = getTeamsConfigPath(workspacePath);

    try {
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      const data = await fs.readFile(configPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return { teams: [] };
      }
      throw error;
    }
  }

  async function saveTeams(workspacePath, teamsData) {
    const fs = require("fs").promises;
    const configPath = getTeamsConfigPath(workspacePath);
    await fs.writeFile(configPath, JSON.stringify(teamsData, null, 2), "utf8");
  }

  async function listTeams(workspacePath) {
    const teamsData = await loadTeams(workspacePath);
    return teamsData.teams;
  }

  async function createTeam(workspacePath, name) {
    if (!name || typeof name !== "string") {
      throw new Error("Team name is required");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error("Team name can only contain letters, numbers, hyphens, and underscores");
    }

    const teamsData = await loadTeams(workspacePath);
    const existingTeam = teamsData.teams.find(t => t.name === name);
    if (existingTeam) {
      throw new Error(`Team '${name}' already exists`);
    }

    const leaderBranch = `team-${name}`;
    const team = {
      name,
      leaderBranch,
      subBranches: [],
      createdAt: new Date().toISOString()
    };

    teamsData.teams.push(team);
    await saveTeams(workspacePath, teamsData);

    const git = await getRepo(workspacePath);
    const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);
    await git.checkoutLocalBranch(leaderBranch);

    return team;
  }

  async function listTeamBranches(workspacePath, teamName) {
    const teamsData = await loadTeams(workspacePath);
    const team = teamsData.teams.find(t => t.name === teamName);
    if (!team) {
      throw new Error(`Team '${teamName}' not found`);
    }

    const git = await getRepo(workspacePath);
    const allBranches = await git.branch();

    const teamBranches = [team.leaderBranch];
    teamBranches.push(...team.subBranches.map(sb => `${team.leaderBranch}/${sb}`));

    const branches = allBranches.all.filter(b => teamBranches.includes(b));
    const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);

    return branches.map(name => ({
      name,
      current: name === currentBranch,
      isLeader: name === team.leaderBranch,
      subBranchName: name !== team.leaderBranch ? name.substring(team.leaderBranch.length + 1) : null
    }));
  }

  async function createTeamBranch(workspacePath, teamName, subBranchName) {
    if (!teamName || typeof teamName !== "string") {
      throw new Error("Team name is required");
    }
    if (!subBranchName || typeof subBranchName !== "string") {
      throw new Error("Sub-branch name is required");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(subBranchName)) {
      throw new Error("Sub-branch name can only contain letters, numbers, hyphens, and underscores");
    }

    const teamsData = await loadTeams(workspacePath);
    const team = teamsData.teams.find(t => t.name === teamName);
    if (!team) {
      throw new Error(`Team '${teamName}' not found`);
    }

    if (team.subBranches.includes(subBranchName)) {
      throw new Error(`Sub-branch '${subBranchName}' already exists in team '${teamName}'`);
    }

    const fullBranchName = `${team.leaderBranch}/${subBranchName}`;

    const git = await getRepo(workspacePath);
    const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);

    await git.checkout(team.leaderBranch);
    await git.checkoutLocalBranch(fullBranchName);

    team.subBranches.push(subBranchName);
    await saveTeams(workspacePath, teamsData);

    return { name: fullBranchName, subBranchName };
  }

  async function createTeamPR(workspacePath, teamName, fromBranch, title, description) {
    const teamsData = await loadTeams(workspacePath);
    const team = teamsData.teams.find(t => t.name === teamName);
    if (!team) {
      throw new Error(`Team '${teamName}' not found`);
    }

    const git = await getRepo(workspacePath);
    const remotes = await git.remote(["get-url", "origin"]).catch(() => null);

    if (!remotes) {
      throw new Error("No remote repository configured. Please add a remote to create PRs.");
    }

    const { execSync } = require("child_process");

    try {
      const owner = require("path").basename(workspacePath);
      const repoName = require("path").basename(workspacePath);
      const remoteUrl = remotes.trim();

      const titleEscaped = title.replace(/"/g, '\\"');
      const descEscaped = description ? description.replace(/"/g, '\\"') : "";

      const cmd = `gh pr create --base "${team.leaderBranch}" --head "${fromBranch}" --title "${titleEscaped}" ${descEscaped ? `--body "${descEscaped}"` : ""}`;
      const result = execSync(cmd, { cwd: workspacePath, encoding: "utf8" });

      const prUrlMatch = result.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/);
      if (!prUrlMatch) {
        throw new Error("Failed to create PR or extract PR URL");
      }

      const prUrl = prUrlMatch[0];
      const prId = prUrl.split("/").pop();

      return {
        id: prId,
        url: prUrl,
        title,
        fromBranch,
        toBranch: team.leaderBranch
      };
    } catch (error) {
      throw new Error(`Failed to create PR: ${error.message}`);
    }
  }

  async function mergeTeamPR(workspacePath, teamName, prId, approved) {
    if (!approved) {
      throw new Error("PR must be approved before merging");
    }

    const teamsData = await loadTeams(workspacePath);
    const team = teamsData.teams.find(t => t.name === teamName);
    if (!team) {
      throw new Error(`Team '${teamName}' not found`);
    }

    const { execSync } = require("child_process");

    try {
      execSync(`gh pr merge ${prId} --merge --delete-branch`, { cwd: workspacePath, encoding: "utf8" });
      return { success: true, prId };
    } catch (error) {
      throw new Error(`Failed to merge PR: ${error.message}`);
    }
  }

  async function listTeamCommits(workspacePath, teamName) {
    const teamsData = await loadTeams(workspacePath);
    const team = teamsData.teams.find(t => t.name === teamName);
    if (!team) {
      throw new Error(`Team '${teamName}' not found`);
    }

    const git = await getRepo(workspacePath);
    const allBranches = await git.branch();

    const teamBranches = [team.leaderBranch];
    teamBranches.push(...team.subBranches.map(sb => `${team.leaderBranch}/${sb}`));

    const existingTeamBranches = teamBranches.filter(b => allBranches.all.includes(b));

    let allCommits = [];
    for (const branch of existingTeamBranches) {
      try {
        const branchCommits = await git.log({ maxCount: 50, from: branch });
        allCommits = allCommits.concat(
          branchCommits.all.map(entry => ({
            hash: entry.hash,
            shortHash: entry.hash.substring(0, 7),
            message: entry.message,
            author: entry.author_name,
            date: entry.date,
            body: entry.body || "",
            branch
          }))
        );
      } catch (error) {
        console.warn(`Failed to get commits for branch ${branch}:`, error.message);
      }
    }

    allCommits.sort((a, b) => new Date(b.date) - new Date(a.date));

    const uniqueCommits = [];
    const seenHashes = new Set();
    for (const commit of allCommits) {
      if (!seenHashes.has(commit.hash)) {
        seenHashes.add(commit.hash);
        uniqueCommits.push(commit);
      }
    }

    return uniqueCommits;
  }

  async function listTeamPRs(workspacePath, teamName) {
    const teamsData = await loadTeams(workspacePath);
    const team = teamsData.teams.find(t => t.name === teamName);
    if (!team) {
      throw new Error(`Team '${teamName}' not found`);
    }

    const { execSync } = require("child_process");

    try {
      const result = execSync(`gh pr list --base "${team.leaderBranch}" --json number,title,state,headRefName,url,createdAt,author`, { cwd: workspacePath, encoding: "utf8" });
      const prs = JSON.parse(result);

      return prs.map(pr => ({
        id: String(pr.number),
        title: pr.title,
        state: pr.state,
        fromBranch: pr.headRefName,
        toBranch: team.leaderBranch,
        url: pr.url,
        createdAt: pr.createdAt,
        author: pr.author?.login || "unknown"
      }));
    } catch (error) {
      if (error.message.includes("no open pull requests")) {
        return [];
      }
      throw new Error(`Failed to list PRs: ${error.message}`);
    }
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
    getFileContentAtCommit,
    listTeams,
    createTeam,
    listTeamBranches,
    createTeamBranch,
    createTeamPR,
    mergeTeamPR,
    listTeamCommits,
    listTeamPRs
  };
}

module.exports = { createGitService };
