import { IpcMainEvent } from "electron";
import { randomUUID } from "crypto";
import { getDb, insertEvent } from "../services/db";
import { generatePlanning } from "../services/planning";
import { WorkspaceState } from "./workspace";

export type PlanningHandlers = ReturnType<typeof createPlanningHandlers>;

export function createPlanningHandlers(state: WorkspaceState) {
  function ensureWorkspace(): string {
    if (!state.workspacePath) {
      throw new Error("Workspace not selected");
    }
    return state.workspacePath;
  }

  return {
    "planning:start": async (
      _event: IpcMainEvent,
      prompt: string
    ): Promise<{ sessionId: string; questions: unknown[]; spec: unknown }> => {
      if (typeof prompt !== "string" || !prompt.trim()) {
        throw new Error("Prompt is required");
      }
      const db = getDb();
      const sessionId = `sess_${randomUUID()}`;
      const createdAt = new Date().toISOString();
      const { questions, spec } = generatePlanning(prompt);

      db.run("BEGIN TRANSACTION");

      try {
        db.run(
          "INSERT INTO sessions (id, prompt, status, created_at) VALUES (?, ?, ?, ?)",
          [sessionId, prompt, "planning", createdAt]
        );

        for (const question of questions) {
          db.run(
            "INSERT INTO questions (id, session_id, text, options_json, recommended_option, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [question.id, sessionId, question.text, JSON.stringify(question.options), question.recommendedOption, createdAt]
          );

          db.run(
            "INSERT INTO answers (id, session_id, question_id, answer, created_at) VALUES (?, ?, ?, ?, ?)",
            [`ans_${question.id}`, sessionId, question.id, question.recommendedOption, createdAt]
          );
        }

        db.run(
          "INSERT INTO specs (id, session_id, spec_json, created_at) VALUES (?, ?, ?, ?)",
          [`spec_${sessionId}`, sessionId, JSON.stringify(spec), createdAt]
        );

        const tasks = [
          "Generate architecture plan",
          "Establish agent roles",
          "Prepare execution graph"
        ];

        tasks.forEach((title, index) => {
          db.run(
            "INSERT INTO tasks (id, session_id, title, status, created_at) VALUES (?, ?, ?, ?, ?)",
            [`task_${sessionId}_${index + 1}`, sessionId, title, "queued", createdAt]
          );
        });

        db.run("COMMIT");
      } catch (error) {
        db.run("ROLLBACK");
        throw error;
      }

      insertEvent(sessionId, "info", "Planning complete with auto-selected defaults.");

      return { sessionId, questions, spec };
    },

    "planning:answer": async (
      _event: IpcMainEvent,
      payload: { answer: string; sessionId: string; questionId: string }
    ): Promise<{ ok: boolean }> => {
      if (!payload || typeof payload.answer !== "string") {
        throw new Error("Invalid answer payload");
      }
      const db = getDb();
      db.run(
        "UPDATE answers SET answer = ? WHERE session_id = ? AND question_id = ?",
        [payload.answer, payload.sessionId, payload.questionId]
      );
      insertEvent(payload.sessionId, "info", `Answer updated for ${payload.questionId}`);
      return { ok: true };
    },

    "events:list": async (
      _event: IpcMainEvent,
      sessionId: string | null
    ): Promise<Record<string, unknown>[]> => {
      const db = getDb();
      const result = db.exec(
        "SELECT id, level, message, created_at, session_id FROM events WHERE session_id IS ? ORDER BY created_at DESC LIMIT 200",
        [sessionId || null]
      );
      if (result.length === 0) return [];
      return result[0].values.map((row, index) => {
        const columns = result[0].columns;
        const obj: Record<string, unknown> = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    },

    "logs:clear": async (): Promise<{ ok: boolean }> => {
      const db = getDb();
      db.run("DELETE FROM events");
      return { ok: true };
    },

    "tasks:list": async (
      _event: IpcMainEvent,
      sessionId: string
    ): Promise<Record<string, unknown>[]> => {
      const db = getDb();
      const result = db.exec(
        "SELECT id, title, status, created_at FROM tasks WHERE session_id = ? ORDER BY created_at ASC",
        [sessionId]
      );
      if (result.length === 0) return [];
      return result[0].values.map((row, index) => {
        const columns = result[0].columns;
        const obj: Record<string, unknown> = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    }
  };
}
