export const IpcChannels = {
  workspace: {
    select: 'workspace:select',
    get: 'workspace:get',
    ensure: 'workspace:ensure'
  },
  fileSystem: {
    list: 'fs:list',
    readFile: 'fs:readFile',
    writeFile: 'fs:writeFile',
    createFile: 'fs:createFile',
    createDir: 'fs:createDir',
    delete: 'fs:delete',
    rename: 'fs:rename',
    exists: 'fs:exists',
    refreshTree: 'fs:refreshTree',
    revealPath: 'fs:revealPath'
  },
  search: {
    run: 'search:run'
  },
  planning: {
    start: 'planning:start',
    answer: 'planning:answer'
  },
  events: {
    list: 'events:list'
  },
  logs: {
    clear: 'logs:clear'
  },
  tasks: {
    list: 'tasks:list'
  },
  run: {
    command: 'run:command'
  },
  terminal: {
    start: 'terminal:start',
    create: 'terminal:create',
    list: 'terminal:list',
    rename: 'terminal:rename',
    kill: 'terminal:kill',
    getShells: 'terminal:getShells',
    input: 'terminal:input',
    resize: 'terminal:resize',
    dispose: 'terminal:dispose'
  },
  git: {
    status: 'git:status',
    stage: 'git:stage',
    stageAll: 'git:stage-all',
    unstageAll: 'git:unstage-all',
    unstage: 'git:unstage',
    discard: 'git:discard',
    commit: 'git:commit',
    diff: 'git:diff',
    stagedDiff: 'git:staged-diff',
    log: 'git:log',
    branches: 'git:branches',
    remoteBranches: 'git:remote-branches',
    branchCreate: 'git:branch-create',
    branchDelete: 'git:branch-delete',
    branchRename: 'git:branch-rename',
    branchCheckout: 'git:branch-checkout',
    isRepo: 'git:is-repo',
    merge: 'git:merge',
    rebase: 'git:rebase',
    rebaseAbort: 'git:rebase-abort',
    rebaseContinue: 'git:rebase-continue',
    fetch: 'git:fetch',
    pull: 'git:pull',
    push: 'git:push',
    remotes: 'git:remotes',
    remoteAdd: 'git:remote-add',
    remoteRemove: 'git:remote-remove',
    lastCommitMessage: 'git:last-commit-message',
    commitDetails: 'git:commit-details',
    diffBranches: 'git:diff-branches',
    init: 'git:init'
  }
} as const;

export type IpcChannel = string;
