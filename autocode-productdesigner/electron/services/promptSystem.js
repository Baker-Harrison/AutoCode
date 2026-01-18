const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const AI_DIR = ".ai";
const SYSTEM_DIR = path.join(AI_DIR, "system");
const PROJECTS_DIR = path.join(AI_DIR, "projects");
const BEHAVIOURS_DIR = path.join(AI_DIR, "behaviours");

const DEFAULT_PROMPT_FILES = {
  main: `# AutoCode AI Agent

{{ include "role.md" }}

{{ include "environment.md" }}

{{ include "communication.md" }}

{{ include "solving.md" }}

{{ include "tips.md" }}

{{ include "behaviour.md" }}`,

  role: `# Role

You are an expert software engineering AI assistant integrated into AutoCode, a modern IDE built with Electron and React. Your primary purpose is to help developers write, understand, refactor, and debug code efficiently and effectively.`,

  environment: `# Environment

- Workspace: {{workspace_root}}
- Git Branch: {{git_branch}}
- OS: {{os_name}} {{os_version}}
- Active Agents: {{active_agents}}`,

  communication: `# Communication

Be concise and direct in your responses. Use technical terminology appropriately. When providing code examples, focus on the essential parts rather than including complete implementations unless explicitly requested.`,

  solving: `# Problem Solving

1. First, understand the problem by reading relevant code and context
2. Consider multiple approaches before implementing
3. Choose the simplest solution that meets requirements
4. Test edge cases and potential issues
5. Document any assumptions made`,

  tips: `# Tips

- Always follow existing code conventions and patterns
- Use libraries and frameworks already in the project
- Consider security implications of any changes
- Maintain backward compatibility when possible
- Write self-documenting code with clear variable names`,

  behaviour: ``
};

const DEFAULT_BEHAVIOUR = `# Behavior Guidelines

1. **Be Proactive, Not Surprising**: Take initiative when asked, but don't make unexpected changes without confirmation.

2. **Follow Conventions**: Always mimic existing code style, patterns, and conventions in the codebase.

3. **Security First**: Never introduce code that exposes secrets, logs sensitive data, or creates security vulnerabilities.

4. **Context Awareness**: Consider the broader impact of changes on the entire codebase, not just the immediate function.

5. **Ask Before Breaking**: Before making significant refactoring or API changes, ask for confirmation.`;

function ensureAIStructure(workspacePath) {
  const systemPath = path.join(workspacePath, SYSTEM_DIR);
  const behavioursPath = path.join(workspacePath, BEHAVIOURS_DIR);
  const toolsPath = path.join(systemPath, "tools");

  [systemPath, behavioursPath, toolsPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  Object.entries(DEFAULT_PROMPT_FILES).forEach(([name, content]) => {
    const filePath = path.join(systemPath, `${name}.md`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, "utf-8");
    }
  });

  const behaviourPath = path.join(behavioursPath, "overlay.md");
  if (!fs.existsSync(behaviourPath)) {
    fs.writeFileSync(behaviourPath, DEFAULT_BEHAVIOUR, "utf-8");
  }
}

function resolveSafePath(workspacePath, targetPath) {
  const resolved = path.resolve(workspacePath, targetPath || ".");
  if (!resolved.startsWith(workspacePath)) {
    throw new Error("Invalid path outside workspace");
  }
  return resolved;
}

function loadPythonVariable(workspacePath, scriptName) {
  const scriptPath = path.join(workspacePath, SYSTEM_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    return null;
  }

  try {
    const output = execSync(`python3 "${scriptPath}"`, {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5000
    }).trim();

    try {
      return JSON.parse(output);
    } catch {
      return null;
    }
  } catch (error) {
    console.warn(`Failed to load variable from ${scriptName}:`, error.message);
    return null;
  }
}

function resolveVariables(workspacePath, template, customVars = {}) {
  let content = template;
  const trace = [];

  const resolveVar = (match, varName) => {
    const before = match;
    let value = null;

    if (customVars[varName] !== undefined) {
      value = customVars[varName];
    } else {
      switch (varName) {
        case "workspace_root":
          value = workspacePath;
          break;
        case "git_branch":
          try {
            const branch = execSync("git rev-parse --abbrev-ref HEAD", {
              cwd: workspacePath,
              encoding: "utf-8"
            }).trim();
            value = branch || "unknown";
          } catch {
            value = "unknown";
          }
          break;
        case "os_name":
          value = process.platform;
          break;
        case "os_version":
          value = process.release?.version || "unknown";
          break;
        case "active_agents":
          value = "1";
          break;
        default:
          const pyVar = loadPythonVariable(workspacePath, `${varName}.py`);
          if (pyVar !== null) {
            value = pyVar;
          }
      }
    }

    trace.push({ var: varName, before, after: String(value) });
    return String(value !== null ? value : match);
  };

  content = content.replace(/\{\{(\w+)\}\}/g, resolveVar);
  return { content, trace };
}

function resolveIncludes(workspacePath, content, depth = 0) {
  if (depth > 10) {
    throw new Error("Maximum include depth exceeded");
  }

  const includeRegex = /\{\{\s*include\s+"([^"]+)"\s*\}\}/g;
  let result = content;
  let match;

  while ((match = includeRegex.exec(content)) !== null) {
    const includePath = match[1];
    const resolvedPath = resolveSafePath(workspacePath, path.join(SYSTEM_DIR, includePath));

    if (!fs.existsSync(resolvedPath)) {
      result = result.replace(match[0], `[Include not found: ${includePath}]`);
      continue;
    }

    const includedContent = fs.readFileSync(resolvedPath, "utf-8");
    const processedContent = resolveIncludes(workspacePath, includedContent, depth + 1);
    result = result.replace(match[0], processedContent);
  }

  return result;
}

function loadBehaviourOverlay(workspacePath) {
  const overlayPath = path.join(workspacePath, BEHAVIOURS_DIR, "overlay.md");
  if (fs.existsSync(overlayPath)) {
    return fs.readFileSync(overlayPath, "utf-8");
  }
  return "";
}

function loadProjectBehaviour(workspacePath) {
  const workspaceName = path.basename(workspacePath);
  const projectBehaviourPath = path.join(workspacePath, PROJECTS_DIR, workspaceName, "behaviour.md");
  if (fs.existsSync(projectBehaviourPath)) {
    return fs.readFileSync(projectBehaviourPath, "utf-8");
  }
  return "";
}

function loadProjectInstructions(workspacePath) {
  const workspaceName = path.basename(workspacePath);
  const projectDir = path.join(workspacePath, PROJECTS_DIR, workspaceName);
  const contextPath = path.join(projectDir, "context.md");
  const rulesPath = path.join(projectDir, "rules.md");
  const projectPath = path.join(projectDir, "project.md");

  let instructions = [];

  if (fs.existsSync(projectPath)) {
    instructions.push(fs.readFileSync(projectPath, "utf-8"));
  }

  if (fs.existsSync(rulesPath)) {
    instructions.push(fs.readFileSync(rulesPath, "utf-8"));
  }

  if (fs.existsSync(contextPath)) {
    instructions.push(fs.readFileSync(contextPath, "utf-8"));
  }

  return instructions.join("\n\n---\n\n");
}

async function buildPrompt(workspacePath, options = {}) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }

  ensureAIStructure(workspacePath);

  const customVars = options.variables || {};

  let steps = [];

  steps.push({
    name: "Load global behavior overlay",
    content: loadBehaviourOverlay(workspacePath)
  });

  steps.push({
    name: "Load project-specific behavior",
    content: loadProjectBehaviour(workspacePath)
  });

  steps.push({
    name: "Load project instructions",
    content: loadProjectInstructions(workspacePath)
  });

  const mainPath = path.join(workspacePath, SYSTEM_DIR, "main.md");
  let mainTemplate = "";
  if (fs.existsSync(mainPath)) {
    mainTemplate = fs.readFileSync(mainPath, "utf-8");
  } else {
    mainTemplate = DEFAULT_PROMPT_FILES.main;
  }

  steps.push({
    name: "Resolve static variables",
    content: mainTemplate,
    trace: []
  });

  const { content: withVars, trace: varTrace } = resolveVariables(workspacePath, mainTemplate, customVars);
  steps[3].trace = varTrace;

  steps.push({
    name: "Process includes",
    content: withVars
  });

  const withIncludes = resolveIncludes(workspacePath, withVars);

  steps.push({
    name: "Final prompt assembly",
    content: withIncludes
  });

  const behaviorParts = [
    steps[0].content,
    steps[1].content
  ].filter(Boolean).join("\n\n");

  const projectParts = steps[2].content;

  const systemPrompt = [behaviorParts, projectParts, steps[4].content]
    .filter(Boolean)
    .join("\n\n---\n\n");

  return {
    template: mainTemplate,
    variables: varTrace,
    systemPrompt,
    steps
  };
}

function getPromptFiles(workspacePath) {
  if (!workspacePath) {
    return [];
  }

  const systemPath = path.join(workspacePath, SYSTEM_DIR);
  const behavioursPath = path.join(workspacePath, BEHAVIOURS_DIR);
  const projectsPath = path.join(workspacePath, PROJECTS_DIR);

  const files = [];

  const scanDirectory = (dir, category) => {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(workspacePath, fullPath);

      if (entry.isDirectory()) {
        scanDirectory(fullPath, category);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.py')) {
        files.push({
          path: relativePath,
          name: entry.name,
          category
        });
      }
    }
  };

  scanDirectory(systemPath, "system");
  scanDirectory(behavioursPath, "behaviour");
  scanDirectory(projectsPath, "project");

  return files;
}

function readPromptFile(workspacePath, relativePath) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }

  const resolved = resolveSafePath(workspacePath, relativePath);
  if (!fs.existsSync(resolved)) {
    throw new Error("File not found");
  }

  return {
    path: relativePath,
    content: fs.readFileSync(resolved, "utf-8")
  };
}

function writePromptFile(workspacePath, relativePath, content) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }

  const resolved = resolveSafePath(workspacePath, relativePath);
  const dir = path.dirname(resolved);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resolved, content, "utf-8");

  return { ok: true };
}

function createProjectDirectory(workspacePath, projectName) {
  if (!workspacePath) {
    throw new Error("Workspace not selected");
  }

  const projectDir = path.join(workspacePath, PROJECTS_DIR, projectName);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  return { ok: true, path: path.relative(workspacePath, projectDir) };
}

module.exports = {
  buildPrompt,
  getPromptFiles,
  readPromptFile,
  writePromptFile,
  createProjectDirectory,
  ensureAIStructure
};