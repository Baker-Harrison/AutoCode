import { IpcMainEvent } from "electron";
import { WorkspaceState } from "./workspace";
import { createGitService, GitService } from "../services/git";

export type GitHandlers = ReturnType<typeof createGitHandlers>;

export function createGitHandlers(state: WorkspaceState, gitService: GitService) {
  function ensureWorkspace(): string {
    if (!state.workspacePath) {
      throw new Error("Workspace not selected");
    }
    return state.workspacePath;
  }

  return {
    "git:status": async (): Promise<ReturnType<GitService["getGitStatus"]>> => {
      return gitService.getGitStatus(ensureWorkspace());
    },

    "git:stage": async (
      _event: IpcMainEvent,
      payload: { path: string }
    ): Promise<void> => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid stage payload");
      }
      await gitService.stageFile(ensureWorkspace(), payload.path);
    },

    "git:stage-all": async (): Promise<void> => {
      await gitService.stageAll(ensureWorkspace());
    },

    "git:unstage-all": async (): Promise<void> => {
      await gitService.unstageAll(ensureWorkspace());
    },

    "git:unstage": async (
      _event: IpcMainEvent,
      payload: { path: string }
    ): Promise<void> => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid unstage payload");
      }
      await gitService.unstageFile(ensureWorkspace(), payload.path);
    },

    "git:discard": async (
      _event: IpcMainEvent,
      payload: { path: string }
    ): Promise<void> => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid discard payload");
      }
      await gitService.discardChanges(ensureWorkspace(), payload.path);
    },

    "git:commit": async (
      _event: IpcMainEvent,
      payload: { message: string; amend?: boolean; signOff?: boolean }
    ): Promise<void> => {
      if (!payload || typeof payload.message !== "string") {
        throw new Error("Invalid commit payload");
      }
      await gitService.commit(ensureWorkspace(), payload.message, {
        amend: payload.amend || false,
        signOff: payload.signOff || false
      });
    },

    "git:diff": async (
      _event: IpcMainEvent,
      payload: { path: string }
    ): Promise<string> => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid diff payload");
      }
      return gitService.getDiff(ensureWorkspace(), payload.path);
    },

    "git:staged-diff": async (): Promise<string> => {
      return gitService.getStagedDiff(ensureWorkspace());
    },

    "git:log": async (
      _event: IpcMainEvent,
      payload?: { limit?: number; skip?: number }
    ): Promise<ReturnType<GitService["getLog"]>> => {
      return gitService.getLog(ensureWorkspace(), payload?.limit || 20, payload?.skip || 0);
    },

    "git:branches": async (): Promise<ReturnType<GitService["getBranches"]>> => {
      return gitService.getBranches(ensureWorkspace());
    },

    "git:remote-branches": async (): Promise<ReturnType<GitService["getRemoteBranches"]>> => {
      return gitService.getRemoteBranches(ensureWorkspace());
    },

    "git:branch-create": async (
      _event: IpcMainEvent,
      payload: { name: string }
    ): Promise<void> => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid branch create payload");
      }
      await gitService.createBranch(ensureWorkspace(), payload.name);
    },

    "git:branch-delete": async (
      _event: IpcMainEvent,
      payload: { name: string; force?: boolean }
    ): Promise<void> => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid branch delete payload");
      }
      await gitService.deleteBranch(ensureWorkspace(), payload.name, payload.force || false);
    },

    "git:branch-rename": async (
      _event: IpcMainEvent,
      payload: { name: string }
    ): Promise<void> => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid branch rename payload");
      }
      await gitService.renameBranch(ensureWorkspace(), payload.name);
    },

    "git:branch-checkout": async (
      _event: IpcMainEvent,
      payload: { name: string }
    ): Promise<void> => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid branch checkout payload");
      }
      await gitService.checkoutBranch(ensureWorkspace(), payload.name);
    },

    "git:is-repo": async (): Promise<boolean> => {
      return gitService.isRepo(ensureWorkspace());
    },

    "git:merge": async (
      _event: IpcMainEvent,
      payload: { sourceBranch: string; message?: string }
    ): Promise<void> => {
      if (!payload || typeof payload.sourceBranch !== "string") {
        throw new Error("Invalid merge payload");
      }
      await gitService.mergeBranch(ensureWorkspace(), payload.sourceBranch, payload.message);
    },

    "git:rebase": async (
      _event: IpcMainEvent,
      payload: { branch: string }
    ): Promise<void> => {
      if (!payload || typeof payload.branch !== "string") {
        throw new Error("Invalid rebase payload");
      }
      await gitService.rebaseBranch(ensureWorkspace(), payload.branch);
    },

    "git:rebase-abort": async (): Promise<void> => {
      await gitService.abortRebase(ensureWorkspace());
    },

    "git:rebase-continue": async (): Promise<void> => {
      await gitService.continueRebase(ensureWorkspace());
    },

    "git:fetch": async (): Promise<void> => {
      await gitService.fetch(ensureWorkspace());
    },

    "git:pull": async (
      _event: IpcMainEvent,
      payload?: { rebase?: boolean }
    ): Promise<void> => {
      await gitService.pull(ensureWorkspace(), { rebase: payload?.rebase || false });
    },

    "git:push": async (
      _event: IpcMainEvent,
      payload?: { branch?: string; upstream?: boolean; tags?: boolean }
    ): Promise<void> => {
      if (payload?.branch) {
        await gitService.pushBranch(ensureWorkspace(), payload.branch, payload.upstream || false);
      } else {
        await gitService.push(ensureWorkspace(), { tags: payload?.tags || false });
      }
    },

    "git:remotes": async (): Promise<ReturnType<GitService["getRemotes"]>> => {
      return gitService.getRemotes(ensureWorkspace());
    },

    "git:remote-add": async (
      _event: IpcMainEvent,
      payload: { name: string; url: string }
    ): Promise<void> => {
      if (!payload || typeof payload.name !== "string" || typeof payload.url !== "string") {
        throw new Error("Invalid remote add payload");
      }
      await gitService.addRemote(ensureWorkspace(), payload.name, payload.url);
    },

    "git:remote-remove": async (
      _event: IpcMainEvent,
      payload: { name: string }
    ): Promise<void> => {
      if (!payload || typeof payload.name !== "string") {
        throw new Error("Invalid remote remove payload");
      }
      await gitService.removeRemote(ensureWorkspace(), payload.name);
    },

    "git:last-commit-message": async (): Promise<string> => {
      return gitService.getLastCommitMessage(ensureWorkspace());
    },

    "git:commit-details": async (
      _event: IpcMainEvent,
      hash: string
    ): Promise<ReturnType<GitService["getCommitDetails"]>> => {
      if (typeof hash !== "string" || !/^[0-9a-f]{7,40}$/i.test(hash)) {
        throw new Error("Invalid commit hash");
      }
      return gitService.getCommitDetails(ensureWorkspace(), hash);
    },

    "git:diff-branches": async (
      _event: IpcMainEvent,
      branch1: string,
      branch2: string
    ): Promise<string> => {
      if (typeof branch1 !== "string" || typeof branch2 !== "string") {
        throw new Error("Invalid branch diff payload");
      }
      return gitService.diffBranches(ensureWorkspace(), branch1, branch2);
    },

    "git:init": async (): Promise<ReturnType<GitService["initRepo"]>> => {
      return gitService.initRepo(ensureWorkspace());
    }
  };
}
