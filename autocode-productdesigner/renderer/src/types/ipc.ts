export type FileEntry = {
  name: string;
  path: string;
  relativePath: string;
  type: "file" | "directory";
};

export type Tab = {
  id: string;
  file: FileEntry;
  content: string;
  isDirty: boolean;
};

export type PlanningOption = {
  id: string;
  label: string;
  implications: string;
};

export type PlanningQuestion = {
  id: string;
  text: string;
  options: PlanningOption[];
  recommendedOption: string;
};

export type PlanningSpec = {
  prompt: string;
  generatedAt: string;
  summary: string;
  assumptions: string[];
};

export type EventLog = {
  id: string;
  level: string;
  message: string;
  created_at: string;
  session_id?: string;
};

export type SearchResult = {
  path: string;
  relativePath: string;
  line: number;
  preview: string;
};

export type TaskItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export type CreateFilePayload = {
  path: string;
  content?: string;
};

export type CreateDirPayload = {
  path: string;
};

export type DeletePayload = {
  path: string;
};

export type RenamePayload = {
  sourcePath: string;
  targetPath: string;
};

export type ExistsResult = {
  exists: boolean;
  isDirectory: boolean;
};

export type GitFileStatus = {
  path: string;
  status: 'modified' | 'staged' | 'untracked' | 'added' | 'deleted';
  oldPath?: string;
};

export type GitStatus = {
  currentBranch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
  isRepo: boolean;
};

export type GitCommit = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  body?: string;
};

export type GitCommitDetails = {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
};

export type GitDiff = {
  diff: string;
  diffStat: string;
  hunks: DiffHunk[];
};

export type DiffHunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
};

export type GitBranch = {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
};

export type GitRemote = {
  name: string;
  url: string;
};

export type GitCommitPayload = {
  message: string;
  workspace?: string;
  amend?: boolean;
  signOff?: boolean;
};

export type GitStagePayload = {
  path: string;
  workspace?: string;
};

export type GitUnstagePayload = {
  path: string;
  workspace?: string;
};

export type GitDiscardPayload = {
  path: string;
  workspace?: string;
};

export type GitDiffPayload = {
  path: string;
  workspace?: string;
};

export type GitCreateBranchPayload = {
  name: string;
  workspace?: string;
};

export type GitCheckoutBranchPayload = {
  name: string;
  workspace?: string;
};

export type GitDeleteBranchPayload = {
  name: string;
  force?: boolean;
  workspace?: string;
};

export type GitRenameBranchPayload = {
  name: string;
  workspace?: string;
};

export type GitMergePayload = {
  sourceBranch: string;
  message?: string;
  workspace?: string;
};

export type GitRebasePayload = {
  branch: string;
  workspace?: string;
};

export type GitFetchPayload = {
  workspace?: string;
};

export type GitPullPayload = {
  rebase?: boolean;
  workspace?: string;
};

export type GitPushPayload = {
  tags?: boolean;
  branch?: string;
  upstream?: boolean;
  workspace?: string;
};

export type GitRemotePayload = {
  name: string;
  url: string;
  workspace?: string;
};

export type GitLogPayload = {
  limit?: number;
  skip?: number;
  workspace?: string;
};
