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
