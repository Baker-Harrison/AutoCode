const { randomUUID } = require("crypto");

const RISK_LEVELS = {
  low: {
    level: "low",
    label: "Low Risk",
    description: "Minor refactor, formatting, test additions",
    autoApprove: true,
    requiredApprover: null,
    color: "#22c55e"
  },
  medium: {
    level: "medium",
    label: "Medium Risk",
    description: "Non-breaking feature, minor API change",
    autoApprove: false,
    requiredApprover: "lead",
    color: "#f59e0b"
  },
  high: {
    level: "high",
    label: "High Risk",
    description: "Architecture change, scope expansion, breaking change",
    autoApprove: false,
    requiredApprover: "user",
    color: "#ef4444"
  },
  critical: {
    level: "critical",
    label: "Critical Risk",
    description: "Security fix, data loss risk, infra change",
    autoApprove: false,
    requiredApprover: "user",
    color: "#dc2626"
  }
};

const RISK_INDICATORS = {
  "delete-file": { level: "medium", keywords: ["delete", "remove"] },
  "delete-dir": { level: "high", keywords: ["delete", "remove"] },
  "rename-file": { level: "low", keywords: ["rename"] },
  "rename-dir": { level: "medium", keywords: ["rename"] },
  "write-file": { level: "low", keywords: ["write", "save", "update"] },
  "create-file": { level: "low", keywords: ["create", "new", "add"] },
  "create-dir": { level: "low", keywords: ["create", "new", "add"] },
  "git-commit": { level: "low", keywords: ["commit"] },
  "git-push": { level: "medium", keywords: ["push", "remote"] },
  "git-merge": { level: "high", keywords: ["merge"] },
  "git-rebase": { level: "high", keywords: ["rebase"] },
  "git-branch-delete": { level: "high", keywords: ["delete"] },
  "run-command": { level: "medium", keywords: ["execute", "run"] },
  "install-deps": { level: "medium", keywords: ["install", "npm", "yarn", "pip"] },
  "db-migration": { level: "critical", keywords: ["migration", "schema", "database"] },
  "config-change": { level: "medium", keywords: ["config", "setting"] },
  "auth-change": { level: "critical", keywords: ["auth", "token", "key", "secret"] },
  "deploy": { level: "high", keywords: ["deploy", "release", "production"] }
};

class ApprovalSystem {
  constructor(db) {
    this.db = db;
    this.initTables();
  }

  initTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS approval_rules (
        id TEXT PRIMARY KEY,
        rule_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        auto_approve INTEGER NOT NULL DEFAULT 0,
        pattern TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS approval_records (
        id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        approver TEXT NOT NULL,
        approver_role TEXT NOT NULL,
        approval_level TEXT NOT NULL,
        comments TEXT,
        escalated_from TEXT,
        created_at TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS escalation_records (
        id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        original_risk_level TEXT NOT NULL,
        escalated_to TEXT NOT NULL,
        reason TEXT NOT NULL,
        escalated_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS approval_queue (
        id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_description TEXT,
        risk_level TEXT NOT NULL,
        diff_preview TEXT,
        agent_rationale TEXT,
        bundle_id TEXT,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
      );
    `);

    this.insertDefaultRules();
  }

  insertDefaultRules() {
    const defaultRules = [
      { actionType: "file-write", riskLevel: "low", autoApprove: true, pattern: "*.md,*.txt,*.json" },
      { actionType: "file-write", riskLevel: "medium", autoApprove: false, pattern: "*.js,*.ts,*.tsx,*.jsx" },
      { actionType: "file-delete", riskLevel: "medium", autoApprove: false, pattern: "*" },
      { actionType: "git-commit", riskLevel: "low", autoApprove: true, pattern: null },
      { actionType: "git-push", riskLevel: "medium", autoApprove: false, pattern: null },
      { actionType: "git-merge", riskLevel: "high", autoApprove: false, pattern: null },
      { actionType: "command-run", riskLevel: "medium", autoApprove: false, pattern: null }
    ];

    const existingRules = this.db.exec("SELECT COUNT(*) as count FROM approval_rules");
    const count = existingRules.length > 0 ? existingRules[0].values[0][0] : 0;

    if (count === 0) {
      const now = new Date().toISOString();
      defaultRules.forEach(rule => {
        this.db.run(
          `INSERT INTO approval_rules (id, rule_name, action_type, risk_level, auto_approve, pattern, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`rule_${randomUUID()}`, `Default ${rule.actionType} rule`, rule.actionType, rule.riskLevel, rule.autoApprove ? 1 : 0, rule.pattern, now, now]
        );
      });
    }
  }

  assessRisk(actionType, actionData = {}) {
    let riskLevel = "low";
    let matchedIndicator = null;

    const indicator = RISK_INDICATORS[actionType];
    if (indicator) {
      riskLevel = indicator.level;
      matchedIndicator = indicator;
    }

    const description = (actionData.description || "").toLowerCase();
    const path = (actionData.path || "").toLowerCase();

    for (const [type, info] of Object.entries(RISK_INDICATORS)) {
      if (info.level !== riskLevel && this.shouldEscalate(riskLevel, info.level)) {
        for (const keyword of info.keywords) {
          if (description.includes(keyword) || path.includes(keyword)) {
            riskLevel = info.level;
            matchedIndicator = info;
            break;
          }
        }
      }
    }

    const customRules = this.db.exec(
      "SELECT risk_level, auto_approve, pattern FROM approval_rules WHERE action_type = ?",
      [actionType]
    );

    if (customRules.length > 0) {
      const rules = customRules[0].values.map(row => ({
        riskLevel: row[0],
        autoApprove: row[1] === 1,
        pattern: row[2]
      }));

      for (const rule of rules) {
        if (this.matchesPattern(path, rule.pattern)) {
          if (this.shouldEscalate(riskLevel, rule.riskLevel)) {
            riskLevel = rule.riskLevel;
          }
          if (rule.autoApprove) {
            return { riskLevel, autoApprove: true, matchedRule: rule };
          }
        }
      }
    }

    const riskInfo = RISK_LEVELS[riskLevel];
    return {
      riskLevel,
      autoApprove: riskInfo.autoApprove,
      requiredApprover: riskInfo.requiredApprover,
      matchedIndicator,
      riskInfo
    };
  }

  shouldEscalate(currentLevel, newLevel) {
    const levels = ["low", "medium", "high", "critical"];
    return levels.indexOf(newLevel) > levels.indexOf(currentLevel);
  }

  matchesPattern(path, pattern) {
    if (!pattern) return true;
    const patterns = pattern.split(",").map(p => p.trim());
    return patterns.some(p => {
      if (p === "*") return true;
      if (p.endsWith("*")) {
        return path.startsWith(p.slice(0, -1));
      }
      return path === p;
    });
  }

  createApproval(actionId, actionType, actionDescription, riskLevel, diffPreview = "", agentRationale = "", bundleId = null) {
    const id = `approval_${randomUUID()}`;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO approval_queue (id, action_id, action_type, action_description, risk_level, diff_preview, agent_rationale, bundle_id, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, actionId, actionType, actionDescription, riskLevel, diffPreview, agentRationale, bundleId, now, "pending"]
    );

    return id;
  }

  approveRequest(approvalId, approver, approverRole, comments = "") {
    const approval = this.getApproval(approvalId);
    if (!approval) {
      throw new Error("Approval request not found");
    }

    const recordId = `rec_${randomUUID()}`;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO approval_records (id, action_id, action_type, risk_level, approver, approver_role, approval_level, comments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        approval.actionId,
        approval.actionType,
        approval.riskLevel,
        approver,
        approverRole,
        this.getRequiredApprovalLevel(approval.riskLevel),
        comments,
        now
      ]
    );

    this.db.run("UPDATE approval_queue SET status = 'approved' WHERE id = ?", [approvalId]);

    return { recordId, status: "approved" };
  }

  rejectRequest(approvalId, approver, approverRole, comments = "") {
    const approval = this.getApproval(approvalId);
    if (!approval) {
      throw new Error("Approval request not found");
    }

    const recordId = `rec_${randomUUID()}`;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO approval_records (id, action_id, action_type, risk_level, approver, approver_role, approval_level, comments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        approval.actionId,
        approval.actionType,
        approval.riskLevel,
        approver,
        approverRole,
        "rejected",
        comments,
        now
      ]
    );

    this.db.run("UPDATE approval_queue SET status = 'rejected' WHERE id = ?", [approvalId]);

    return { recordId, status: "rejected" };
  }

  escalateRequest(approvalId, escalatedTo, reason, escalatedBy) {
    const approval = this.getApproval(approvalId);
    if (!approval) {
      throw new Error("Approval request not found");
    }

    const escalationId = `esc_${randomUUID()}`;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO escalation_records (id, action_id, original_risk_level, escalated_to, reason, escalated_by, created_at, resolved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [escalationId, approval.actionId, approval.riskLevel, escalatedTo, reason, escalatedBy, now, 0]
    );

    const newRiskLevel = this.escalateRiskLevel(approval.riskLevel, escalatedTo);
    this.db.run(
      "UPDATE approval_queue SET risk_level = ?, status = 'escalated' WHERE id = ?",
      [newRiskLevel, approvalId]
    );

    return { escalationId, newRiskLevel };
  }

  escalateRiskLevel(currentLevel, targetApprover) {
    const levels = ["low", "medium", "high", "critical"];
    const currentIndex = levels.indexOf(currentLevel);

    switch (targetApprover) {
      case "lead":
        return Math.max(currentIndex, 1) < levels.length ? levels[Math.max(currentIndex, 1)] : currentLevel;
      case "manager":
        return Math.max(currentIndex, 2) < levels.length ? levels[Math.max(currentIndex, 2)] : currentLevel;
      case "vp":
        return "critical";
      default:
        return currentLevel;
    }
  }

  getRequiredApprovalLevel(riskLevel) {
    const riskInfo = RISK_LEVELS[riskLevel];
    return riskInfo.requiredApprover || "auto";
  }

  getApproval(approvalId) {
    const result = this.db.exec("SELECT * FROM approval_queue WHERE id = ?", [approvalId]);
    if (result.length === 0) return null;

    const row = result[0].values[0];
    const columns = result[0].columns;
    const approval = {};
    columns.forEach((col, i) => {
      approval[col] = row[i];
    });

    return approval;
  }

  getPendingApprovals(limit = 50) {
    const result = this.db.exec(
      "SELECT * FROM approval_queue WHERE status = 'pending' OR status = 'escalated' ORDER BY created_at DESC LIMIT ?",
      [limit]
    );

    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const approval = {};
      columns.forEach((col, i) => {
        approval[col] = row[i];
      });
      return approval;
    });
  }

  getApprovalHistory(filters = {}) {
    let query = "SELECT * FROM approval_records WHERE 1=1";
    const params = [];

    if (filters.actionType) {
      query += " AND action_type = ?";
      params.push(filters.actionType);
    }

    if (filters.riskLevel) {
      query += " AND risk_level = ?";
      params.push(filters.riskLevel);
    }

    if (filters.approver) {
      query += " AND approver = ?";
      params.push(filters.approver);
    }

    if (filters.approverRole) {
      query += " AND approver_role = ?";
      params.push(filters.approverRole);
    }

    if (filters.startTime) {
      query += " AND created_at >= ?";
      params.push(filters.startTime);
    }

    if (filters.endTime) {
      query += " AND created_at <= ?";
      params.push(filters.endTime);
    }

    query += " ORDER BY created_at DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    const result = this.db.exec(query, params);
    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const record = {};
      columns.forEach((col, i) => {
        record[col] = row[i];
      });
      return record;
    });
  }

  getEscalations(filters = {}) {
    let query = "SELECT * FROM escalation_records WHERE 1=1";
    const params = [];

    if (!filters.includeResolved) {
      query += " AND resolved = 0";
    }

    if (filters.actionId) {
      query += " AND action_id = ?";
      params.push(filters.actionId);
    }

    query += " ORDER BY created_at DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    const result = this.db.exec(query, params);
    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const record = {};
      columns.forEach((col, i) => {
        record[col] = row[i];
      });
      return record;
    });
  }

  resolveEscalation(escalationId) {
    this.db.run("UPDATE escalation_records SET resolved = 1 WHERE id = ?", [escalationId]);
  }

  getRules() {
    const result = this.db.exec("SELECT * FROM approval_rules ORDER BY action_type, risk_level");
    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const rule = {};
      columns.forEach((col, i) => {
        rule[col] = row[i];
      });
      return rule;
    });
  }

  createRule(ruleName, actionType, riskLevel, autoApprove, pattern = null) {
    const id = `rule_${randomUUID()}`;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO approval_rules (id, rule_name, action_type, risk_level, auto_approve, pattern, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ruleName, actionType, riskLevel, autoApprove ? 1 : 0, pattern, now, now]
    );

    return id;
  }

  updateRule(ruleId, updates) {
    const setClauses = [];
    const params = [];

    if (updates.ruleName !== undefined) {
      setClauses.push("rule_name = ?");
      params.push(updates.ruleName);
    }
    if (updates.riskLevel !== undefined) {
      setClauses.push("risk_level = ?");
      params.push(updates.riskLevel);
    }
    if (updates.autoApprove !== undefined) {
      setClauses.push("auto_approve = ?");
      params.push(updates.autoApprove ? 1 : 0);
    }
    if (updates.pattern !== undefined) {
      setClauses.push("pattern = ?");
      params.push(updates.pattern);
    }

    if (setClauses.length === 0) {
      throw new Error("No updates provided");
    }

    setClauses.push("updated_at = ?");
    params.push(new Date().toISOString());
    params.push(ruleId);

    this.db.run(
      `UPDATE approval_rules SET ${setClauses.join(", ")} WHERE id = ?`,
      params
    );
  }

  deleteRule(ruleId) {
    this.db.run("DELETE FROM approval_rules WHERE id = ?", [ruleId]);
  }

  getBundleApprovals(bundleId) {
    const result = this.db.exec(
      "SELECT * FROM approval_queue WHERE bundle_id = ? ORDER BY created_at",
      [bundleId]
    );

    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const approval = {};
      columns.forEach((col, i) => {
        approval[col] = row[i];
      });
      return approval;
    });
  }

  bulkApprove(bundleId, approver, approverRole, comments = "", vetoIds = []) {
    const approvals = this.getBundleApprovals(bundleId);

    const results = [];
    for (const approval of approvals) {
      if (vetoIds.includes(approval.id)) {
        results.push({ id: approval.id, status: "vetoed" });
        continue;
      }

      const result = this.approveRequest(approval.id, approver, approverRole, comments);
      results.push(result);
    }

    return results;
  }

  bulkReject(bundleId, approver, approverRole, comments = "") {
    const approvals = this.getBundleApprovals(bundleId);

    const results = [];
    for (const approval of approvals) {
      const result = this.rejectRequest(approval.id, approver, approverRole, comments);
      results.push(result);
    }

    return results;
  }

  getRiskLevels() {
    return RISK_LEVELS;
  }
}

function createApprovalSystem(db) {
  return new ApprovalSystem(db);
}

module.exports = {
  createApprovalSystem,
  RISK_LEVELS,
  RISK_INDICATORS
};
