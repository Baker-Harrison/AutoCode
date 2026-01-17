import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { GitStatus, GitCommit, GitDiff, GitBranch } from "@/types/ipc";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { GitCommit as GitCommitIcon, GitBranch as GitBranchIcon, Plus, Minus, ChevronDown, Trash2, ArrowUp, ArrowDown, Loader2, RefreshCw, GitPullRequest, Copy, Check, MoreHorizontal, Eye, FileSignature, History, FolderGit2, Download, Upload } from "lucide-react";
import { DiffViewer } from "./DiffViewer";

type GitPanelProps = {
  workspace: string | null;
  onFileOpen: (path: string) => void;
};

type DialogType = 'createBranch' | 'deleteBranch' | 'renameBranch' | 'mergeBranch' | 'commitDetails' | 'remote' | null;

export const GitPanel = ({ workspace, onFileOpen }: GitPanelProps) => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [remoteBranches, setRemoteBranches] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<GitDiff | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [lastCommitMessage, setLastCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commitsSkip, setCommitsSkip] = useState(0);
  const [amend, setAmend] = useState(false);
  const [signOff, setSignOff] = useState(false);
  const [viewMode, setViewMode] = useState<'files' | 'history'>('files');
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [commitDetails, setCommitDetails] = useState<{ message: string; author: string; date: string; files: string[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showStaged, setShowStaged] = useState(false);
  const [dialogOpen, setDialogOpen] = useState<DialogType>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [dialogValue2, setDialogValue2] = useState("");
  const [dialogError, setDialogError] = useState("");
  const { showToast } = useToast();
  const commitTextareaRef = useRef<HTMLTextAreaElement>(null);

  const getWorkspaceArg = useCallback(() => workspace || undefined, [workspace]);

  const fetchGitData = useCallback(async (resetCommits = true) => {
    if (!workspace) return;
    setLoading(true);
    try {
      const [statusData, branchesData, remoteBranchesData, lastCommitMsg] = await Promise.all([
        window.ide.gitStatus(workspace),
        window.ide.gitBranches(),
        window.ide.gitRemoteBranches().catch(() => []),
        window.ide.gitLastCommitMessage(workspace).catch(() => "")
      ]);
      setStatus(statusData);
      setBranches(branchesData);
      setRemoteBranches(remoteBranchesData);
      setLastCommitMessage(lastCommitMsg);

      if (resetCommits) {
        setCommitsSkip(0);
        const commitsData = await window.ide.gitLog({ limit: 20, skip: 0, workspace });
        setCommits(commitsData);
      }
    } catch (error) {
      console.error("Failed to fetch git data:", error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  const loadMoreCommits = useCallback(async () => {
    if (!workspace || loadingMore) return;
    setLoadingMore(true);
    try {
      const newSkip = commitsSkip + 20;
      const newCommits = await window.ide.gitLog({ limit: 20, skip: newSkip, workspace });
      setCommitsSkip(newSkip);
      setCommits(prev => [...prev, ...newCommits]);
    } catch (error) {
      console.error("Failed to load more commits:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [workspace, commitsSkip, loadingMore]);

  useEffect(() => {
    fetchGitData();
  }, [fetchGitData]);

  useEffect(() => {
    if (amend && lastCommitMessage && !commitMessage) {
      setCommitMessage(lastCommitMessage);
    }
  }, [amend, lastCommitMessage, commitMessage]);

  const handleStage = async (filePath: string) => {
    try {
      await window.ide.gitStage({ path: filePath, workspace });
      await fetchGitData(false);
    } catch (error) {
      showToast("Failed to stage file", "error");
      console.error(error);
    }
  };

  const handleUnstage = async (filePath: string) => {
    try {
      await window.ide.gitUnstage({ path: filePath, workspace });
      await fetchGitData(false);
    } catch (error) {
      showToast("Failed to unstage file", "error");
      console.error(error);
    }
  };

  const handleStageAll = async () => {
    try {
      await window.ide.gitStageAll(workspace);
      await fetchGitData(false);
      showToast("All changes staged", "success");
    } catch (error) {
      showToast("Failed to stage all files", "error");
      console.error(error);
    }
  };

  const handleUnstageAll = async () => {
    try {
      await window.ide.gitUnstageAll(workspace);
      await fetchGitData(false);
      showToast("All files unstaged", "success");
    } catch (error) {
      showToast("Failed to unstage all files", "error");
      console.error(error);
    }
  };

  const handleDiscard = async (filePath: string) => {
    try {
      await window.ide.gitDiscard({ path: filePath, workspace });
      await fetchGitData(false);
    } catch (error) {
      showToast("Failed to discard changes", "error");
      console.error(error);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      showToast("Commit message required", "error");
      return;
    }
    setIsCommitting(true);
    try {
      await window.ide.gitCommit({ message: commitMessage, workspace, amend, signOff });
      setCommitMessage("");
      setAmend(false);
      setSignOff(false);
      await fetchGitData(true);
      showToast(amend ? "Commit amended" : "Commit created", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to create commit", "error");
      console.error(error);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleShowDiff = async (filePath: string) => {
    setSelectedFile(filePath);
    try {
      const diffData = await window.ide.gitDiff({ path: filePath, workspace });
      setDiff(diffData);
      setViewMode('files');
    } catch (error) {
      showToast("Failed to get diff", "error");
      console.error(error);
    }
  };

  const handleShowStagedDiff = async () => {
    setSelectedFile("Staged Changes");
    try {
      const diffData = await window.ide.gitStagedDiff(workspace);
      setDiff(diffData);
      setViewMode('files');
      setShowStaged(true);
    } catch (error) {
      showToast("Failed to get staged diff", "error");
      console.error(error);
    }
  };

  const handleCheckoutBranch = async (branchName: string) => {
    try {
      await window.ide.gitCheckoutBranch({ name: branchName, workspace });
      await fetchGitData();
      setBranchDropdownOpen(false);
      showToast(`Switched to ${branchName}`, "success");
    } catch (error: any) {
      showToast(error.message || "Failed to switch branch", "error");
      console.error(error);
    }
  };

  const handleCreateBranch = async () => {
    if (!dialogValue.trim()) {
      setDialogError("Branch name required");
      return;
    }
    try {
      await window.ide.gitCreateBranch({ name: dialogValue, workspace });
      await fetchGitData();
      setDialogOpen(null);
      setDialogValue("");
      setDialogError("");
      showToast(`Created branch ${dialogValue}`, "success");
    } catch (error: any) {
      setDialogError(error.message || "Failed to create branch");
    }
  };

  const handleDeleteBranch = async () => {
    if (!dialogValue.trim()) {
      setDialogError("Branch name required");
      return;
    }
    const currentBranch = status?.currentBranch;
    if (dialogValue === currentBranch) {
      setDialogError("Cannot delete current branch");
      return;
    }
    try {
      await window.ide.gitDeleteBranch({ name: dialogValue, force: false, workspace });
      await fetchGitData();
      setDialogOpen(null);
      setDialogValue("");
      setDialogError("");
      showToast(`Deleted branch ${dialogValue}`, "success");
    } catch (error: any) {
      setDialogError(error.message || "Failed to delete branch");
    }
  };

  const handleRenameBranch = async () => {
    if (!dialogValue.trim()) {
      setDialogError("New branch name required");
      return;
    }
    try {
      await window.ide.gitRenameBranch({ name: dialogValue, workspace });
      await fetchGitData();
      setDialogOpen(null);
      setDialogValue("");
      setDialogError("");
      showToast(`Branch renamed to ${dialogValue}`, "success");
    } catch (error: any) {
      setDialogError(error.message || "Failed to rename branch");
    }
  };

  const handleMergeBranch = async () => {
    if (!dialogValue.trim()) {
      setDialogError("Branch name required");
      return;
    }
    try {
      const mergeMessage = dialogValue2 || `Merge branch '${dialogValue}'`;
      await window.ide.gitMerge({ sourceBranch: dialogValue, message: mergeMessage, workspace });
      await fetchGitData();
      setDialogOpen(null);
      setDialogValue("");
      setDialogValue2("");
      setDialogError("");
      showToast(`Merged ${dialogValue} into ${status?.currentBranch}`, "success");
    } catch (error: any) {
      setDialogError(error.message || "Failed to merge branch");
    }
  };

  const handleRebase = async (branchName: string) => {
    try {
      await window.ide.gitRebase({ branch: branchName, workspace });
      await fetchGitData();
      showToast(`Rebased onto ${branchName}`, "success");
    } catch (error: any) {
      showToast(error.message || "Failed to rebase", "error");
    }
  };

  const handleFetch = async () => {
    try {
      await window.ide.gitFetch(workspace);
      await fetchGitData();
      showToast("Fetched from remote", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to fetch", "error");
    }
  };

  const handlePull = async (rebase = false) => {
    try {
      await window.ide.gitPull({ rebase, workspace });
      await fetchGitData();
      showToast(rebase ? "Pulled with rebase" : "Pulled", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to pull", "error");
    }
  };

  const handlePush = async (tags = false) => {
    try {
      await window.ide.gitPush({ tags, workspace });
      await fetchGitData();
      showToast(tags ? "Pushed tags" : "Pushed", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to push", "error");
    }
  };

  const handleViewCommitDetails = async (commit: GitCommit) => {
    try {
      const details = await window.ide.gitCommitDetails(commit.hash, workspace);
      setSelectedCommit(commit);
      setCommitDetails(details);
      setDialogOpen('commitDetails');
    } catch (error) {
      showToast("Failed to get commit details", "error");
    }
  };

  const handleCopyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeDialog = () => {
    setDialogOpen(null);
    setDialogValue("");
    setDialogValue2("");
    setDialogError("");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleCommit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commitMessage, isCommitting, amend, signOff]);

  if (!workspace) {
    return (
      <div className="p-3 text-xs text-zed-text-muted">
        Select a workspace to view git status.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <Loader2 className="animate-spin text-zed-text-muted" size={20} />
      </div>
    );
  }

  if (!status?.isRepo) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2 text-xs text-zed-text-muted">
          <FolderGit2 size={16} />
          Not a git repository
        </div>
        <Button size="sm" onClick={async () => {
          try {
            await window.ide.gitInit();
            await fetchGitData();
            showToast("Git repository initialized", "success");
          } catch (error: any) {
            showToast(error.message || "Failed to initialize repository", "error");
          }
        }}>
          Initialize Repository
        </Button>
      </div>
    );
  }

  const stagedFiles = status?.files.filter(f => f.status === 'staged') || [];
  const modifiedFiles = status?.files.filter(f => f.status === 'modified') || [];
  const untrackedFiles = status?.files.filter(f => f.status === 'untracked') || [];
  const deletedFiles = status?.files.filter(f => f.status === 'deleted') || [];

  const hasChanges = stagedFiles.length > 0 || modifiedFiles.length > 0 || untrackedFiles.length > 0 || deletedFiles.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zed-border-alt px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="flex items-center gap-2 text-xs text-zed-text hover:text-zed-text"
            >
              <GitBranchIcon size={14} />
              <span className="font-medium">{status?.currentBranch}</span>
              <ChevronDown size={12} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {(status?.ahead || 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-green-400" title={`${status?.ahead} commits ahead`}>
                <ArrowUp size={10} />{status?.ahead}
              </span>
            )}
            {(status?.behind || 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400" title={`${status?.behind} commits behind`}>
                <ArrowDown size={10} />{status?.behind}
              </span>
            )}
            <button
              onClick={handleFetch}
              className="p-1 text-zed-text-muted hover:text-zed-text"
              title="Fetch"
            >
              <RefreshCw size={12} />
            </button>
            <div className="relative">
              <button
                onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                className="p-1 text-zed-text-muted hover:text-zed-text"
                title="More actions"
              >
                <MoreHorizontal size={12} />
              </button>
              {actionDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border border-zed-border bg-zed-panel shadow-lg">
                  <button
                    onClick={() => { handlePull(false); setActionDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element"
                  >
                    <CloudPull size={12} /> Pull
                  </button>
                  <button
                    onClick={() => { handlePull(true); setActionDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element"
                  >
                    <GitPullRequest size={12} /> Pull --rebase
                  </button>
                  <button
                    onClick={() => { handlePush(false); setActionDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element"
                  >
                    <CloudPush size={12} /> Push
                  </button>
                  <button
                    onClick={() => { handlePush(true); setActionDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element"
                  >
                    <CloudPush size={12} /> Push --tags
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {branchDropdownOpen && (
          <div className="absolute left-52 top-16 z-50 mt-1 max-h-60 w-48 overflow-auto rounded-md border border-zed-border bg-zed-panel shadow-lg">
            <div className="sticky top-0 border-b border-zed-border-alt bg-zed-panel px-2 py-1">
              <div className="flex gap-1">
                <button
                  onClick={() => { setDialogOpen('createBranch'); setBranchDropdownOpen(false); }}
                  className="flex-1 rounded px-2 py-1 text-[10px] text-zed-text hover:bg-zed-element"
                >
                  + New Branch
                </button>
                <button
                  onClick={() => { setDialogOpen('mergeBranch'); setBranchDropdownOpen(false); }}
                  className="flex-1 rounded px-2 py-1 text-[10px] text-zed-text hover:bg-zed-element"
                >
                  Merge
                </button>
              </div>
            </div>
            <div className="py-1">
              {branches.filter(b => !b.name.startsWith('remotes/')).map(branch => (
                <button
                  key={branch.name}
                  onClick={() => handleCheckoutBranch(branch.name)}
                  className={`flex w-full items-center gap-2 px-3 py-1 text-xs ${
                    branch.name === status?.currentBranch
                      ? "bg-zed-element text-zed-text"
                      : "text-zed-text-muted hover:bg-zed-element"
                  }`}
                >
                  {branch.name === status?.currentBranch && <span className="text-green-400">●</span>}
                  <span className="flex-1 truncate">{branch.name}</span>
                </button>
              ))}
            </div>
            {remoteBranches.length > 0 && (
              <>
                <div className="border-t border-zed-border-alt px-3 py-1 text-[10px] text-zed-text-muted">
                  Remote
                </div>
                {remoteBranches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => handleCheckoutBranch(branch)}
                    className="flex w-full items-center gap-2 px-3 py-1 text-xs text-zed-text-muted hover:bg-zed-element"
                  >
                    <span className="truncate">{branch}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex border-b border-zed-border-alt">
          <button
            onClick={() => setViewMode('files')}
            className={`flex-1 px-3 py-1.5 text-[10px] ${viewMode === 'files' ? 'bg-zed-element text-zed-text' : 'text-zed-text-muted hover:bg-zed-element'}`}
          >
            Files
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex-1 px-3 py-1.5 text-[10px] ${viewMode === 'history' ? 'bg-zed-element text-zed-text' : 'text-zed-text-muted hover:bg-zed-element'}`}
          >
            History
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {viewMode === 'files' ? (
            <>
              {hasChanges && (
                <div className="flex items-center gap-2 border-b border-zed-border-alt px-3 py-1">
                  <Button size="sm" variant="ghost" onClick={handleStageAll} className="h-6 px-2 text-[10px]">
                    <Plus size={10} /> Stage All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleUnstageAll} className="h-6 px-2 text-[10px]">
                    <Minus size={10} /> Unstage All
                  </Button>
                  {stagedFiles.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={handleShowStagedDiff} className="h-6 px-2 text-[10px]">
                      <Eye size={10} /> View Staged
                    </Button>
                  )}
                </div>
              )}

              {stagedFiles.length > 0 && (
                <div className="border-b border-zed-border-alt px-3 py-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-green-400">
                    <span>Staged ({stagedFiles.length})</span>
                  </div>
                  {stagedFiles.map(file => (
                    <div
                      key={file.path}
                      className="group flex items-center justify-between rounded px-2 py-1 text-xs text-zed-text hover:bg-zed-element"
                    >
                      <button
                        onClick={() => handleShowDiff(file.path)}
                        className="flex-1 truncate text-left"
                      >
                        {file.path}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleUnstage(file.path)}
                          className="p-0.5"
                          title="Unstage"
                        >
                          <Minus size={14} className="text-amber-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(modifiedFiles.length > 0 || deletedFiles.length > 0) && (
                <div className="border-b border-zed-border-alt px-3 py-2">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-zed-text-muted">
                    Changes ({modifiedFiles.length + deletedFiles.length})
                  </div>
                  {modifiedFiles.map(file => (
                    <div
                      key={file.path}
                      className="group flex items-center justify-between rounded px-2 py-1 text-xs text-zed-text hover:bg-zed-element"
                    >
                      <button
                        onClick={() => handleShowDiff(file.path)}
                        className="flex-1 truncate text-left"
                      >
                        {file.path}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleStage(file.path)}
                          className="p-0.5"
                          title="Stage"
                        >
                          <Plus size={14} className="text-green-400" />
                        </button>
                        <button
                          onClick={() => handleDiscard(file.path)}
                          className="p-0.5"
                          title="Discard"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {deletedFiles.map(file => (
                    <div
                      key={file.path}
                      className="group flex items-center justify-between rounded px-2 py-1 text-xs text-zed-text hover:bg-zed-element"
                    >
                      <button
                        onClick={() => handleShowDiff(file.path)}
                        className="flex-1 truncate text-left"
                      >
                        {file.path}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleStage(file.path)}
                          className="p-0.5"
                          title="Stage"
                        >
                          <Plus size={14} className="text-green-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {untrackedFiles.length > 0 && (
                <div className="border-b border-zed-border-alt px-3 py-2">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-zed-text-muted">
                    Untracked ({untrackedFiles.length})
                  </div>
                  {untrackedFiles.map(file => (
                    <div
                      key={file.path}
                      className="group flex items-center justify-between rounded px-2 py-1 text-xs text-zed-text hover:bg-zed-element"
                    >
                      <button
                        onClick={() => onFileOpen(file.path)}
                        className="flex-1 truncate text-left"
                      >
                        {file.path}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleStage(file.path)}
                          className="p-0.5"
                          title="Stage"
                        >
                          <Plus size={14} className="text-green-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!hasChanges && (
                <div className="p-3 text-center text-xs text-zed-text-muted">
                  No changes to commit
                </div>
              )}

              {selectedFile && diff && (
                <DiffViewer diff={diff} filePath={selectedFile} />
              )}
            </>
          ) : (
            <div className="px-3 py-2">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-zed-text-muted">
                Commit History
              </div>
              <div className="space-y-1">
                {commits.map(commit => (
                  <div
                    key={commit.hash}
                    className="flex items-start gap-2 rounded px-2 py-1.5 text-xs text-zed-text hover:bg-zed-element cursor-pointer"
                    onClick={() => handleViewCommitDetails(commit)}
                  >
                    <GitCommitIcon size={14} className="mt-0.5 text-zed-text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{commit.message}</div>
                      <div className="flex items-center gap-1 text-[10px] text-zed-text-muted">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopyHash(commit.hash); }}
                          className="hover:text-zed-text"
                        >
                          {copied ? <Check size={10} /> : commit.shortHash}
                        </button>
                        <span>•</span>
                        <span>{commit.author}</span>
                        <span>•</span>
                        <span>{new Date(commit.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMoreCommits}
                disabled={loadingMore}
                className="mt-2 w-full text-xs"
              >
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : "Load more"}
              </Button>
            </div>
          )}
        </div>

        <div className="border-t border-zed-border-alt p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[10px] text-zed-text-muted">
                <input
                  type="checkbox"
                  checked={amend}
                  onChange={(e) => setAmend(e.target.checked)}
                  className="rounded border-zed-border"
                />
                Amend
              </label>
              <label className="flex items-center gap-1 text-[10px] text-zed-text-muted">
                <input
                  type="checkbox"
                  checked={signOff}
                  onChange={(e) => setSignOff(e.target.checked)}
                  className="rounded border-zed-border"
                />
                <FileSignature size={10} />
              </label>
            </div>
            {amend && (
              <span className="text-[10px] text-amber-400">Editing last commit</span>
            )}
          </div>
          <textarea
            ref={commitTextareaRef}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder={amend ? "Edit commit message..." : "Commit message (Ctrl+Enter to commit)"}
            className="mb-2 w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-xs text-zed-text placeholder:text-zed-text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            rows={3}
          />
          <Button
            size="sm"
            onClick={handleCommit}
            disabled={!commitMessage.trim() || isCommitting}
            className="w-full"
          >
            {isCommitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Committing...
              </>
            ) : (
              <>
                <GitCommitIcon size={14} /> {amend ? "Amend" : "Commit"}
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen !== null} onClose={closeDialog} title={
        dialogOpen === 'createBranch' ? 'Create Branch' :
        dialogOpen === 'deleteBranch' ? 'Delete Branch' :
        dialogOpen === 'renameBranch' ? 'Rename Branch' :
        dialogOpen === 'mergeBranch' ? 'Merge Branch' :
        dialogOpen === 'commitDetails' && selectedCommit ? `Commit ${selectedCommit.shortHash}` :
        'Git Remote'
      }>
        {dialogOpen === 'createBranch' && (
          <>
            <Input
              value={dialogValue}
              onChange={(e) => setDialogValue(e.target.value)}
              placeholder="branch-name"
              className="mb-2"
            />
            {dialogError && <div className="text-xs text-red-400">{dialogError}</div>}
            <DialogFooter>
              <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
              <Button onClick={handleCreateBranch}>Create</Button>
            </DialogFooter>
          </>
        )}
        {dialogOpen === 'deleteBranch' && (
          <>
            <select
              value={dialogValue}
              onChange={(e) => setDialogValue(e.target.value)}
              className="w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-xs text-zed-text mb-2"
            >
              <option value="">Select branch...</option>
              {branches.filter(b => b.name !== status?.currentBranch).map(branch => (
                <option key={branch.name} value={branch.name}>{branch.name}</option>
              ))}
            </select>
            {dialogError && <div className="text-xs text-red-400">{dialogError}</div>}
            <DialogFooter>
              <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteBranch}>Delete</Button>
            </DialogFooter>
          </>
        )}
        {dialogOpen === 'renameBranch' && (
          <>
            <Input
              value={dialogValue}
              onChange={(e) => setDialogValue(e.target.value)}
              placeholder="new-branch-name"
              className="mb-2"
            />
            {dialogError && <div className="text-xs text-red-400">{dialogError}</div>}
            <DialogFooter>
              <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
              <Button onClick={handleRenameBranch}>Rename</Button>
            </DialogFooter>
          </>
        )}
        {dialogOpen === 'mergeBranch' && (
          <>
            <select
              value={dialogValue}
              onChange={(e) => setDialogValue(e.target.value)}
              className="w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-xs text-zed-text mb-2"
            >
              <option value="">Select branch to merge...</option>
              {branches.filter(b => b.name !== status?.currentBranch).map(branch => (
                <option key={branch.name} value={branch.name}>{branch.name}</option>
              ))}
            </select>
            <Input
              value={dialogValue2}
              onChange={(e) => setDialogValue2(e.target.value)}
              placeholder="Merge message (optional)"
              className="mb-2"
            />
            {dialogError && <div className="text-xs text-red-400">{dialogError}</div>}
            <DialogFooter>
              <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
              <Button onClick={handleMergeBranch} disabled={!dialogValue}><GitMerge size={14} /> Merge</Button>
            </DialogFooter>
          </>
        )}
        {dialogOpen === 'commitDetails' && commitDetails && selectedCommit && (
          <>
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs text-zed-text-muted mb-1">
                <button
                  onClick={() => handleCopyHash(selectedCommit.hash)}
                  className="flex items-center gap-1 hover:text-zed-text"
                >
                  {copied ? <Check size={10} /> : <History size={10} />}
                  {selectedCommit.shortHash}
                </button>
              </div>
              <div className="text-sm text-zed-text mb-2">{commitDetails.message}</div>
              <div className="text-[10px] text-zed-text-muted">
                <div>{commitDetails.author}</div>
                <div>{new Date(commitDetails.date).toLocaleString()}</div>
              </div>
            </div>
            {commitDetails.files.length > 0 && (
              <div className="border-t border-zed-border-alt pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-zed-text-muted">
                  Changed Files ({commitDetails.files.length})
                </div>
                <div className="max-h-40 overflow-auto space-y-1">
                  {commitDetails.files.map((file, i) => (
                    <div key={i} className="text-xs text-zed-text truncate">{file}</div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={closeDialog}>Close</Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
};
