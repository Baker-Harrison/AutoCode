const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const { randomUUID } = require("crypto");

const MEMORY_AREAS = ["MAIN", "FRAGMENTS", "SOLUTIONS", "INSTRUMENTS", "KNOWLEDGE"];
const SUPPORTED_EXTENSIONS = new Set([".txt", ".md", ".pdf", ".csv", ".json", ".html"]);
const MAX_TEXT_LENGTH = 4000;

class VectorStore {
  constructor(db) {
    this.db = db;
  }

  tokenize(text) {
    const tokens = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
    const termFreq = {};
    tokens.forEach(token => {
      termFreq[token] = (termFreq[token] || 0) + 1;
    });
    return termFreq;
  }

  computeVector(termFreq, idf) {
    const vector = {};
    for (const [term, freq] of Object.entries(termFreq)) {
      vector[term] = freq * (idf[term] || 0);
    }
    return vector;
  }

  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const allTerms = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);

    for (const term of allTerms) {
      const v1 = vec1[term] || 0;
      const v2 = vec2[term] || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  buildIdf() {
    const rows = this.db.exec("SELECT id, terms FROM memory WHERE terms IS NOT NULL");
    if (rows.length === 0) return {};

    const idf = {};
    const numDocs = rows[0].values.length;

    rows[0].values.forEach(([_, termsJson]) => {
      const terms = JSON.parse(termsJson);
      for (const term of Object.keys(terms)) {
        idf[term] = (idf[term] || 0) + 1;
      }
    });

    for (const term of Object.keys(idf)) {
      idf[term] = Math.log(numDocs / idf[term]);
    }

    return idf;
  }

  search(query, limit, threshold, area, idf) {
    const queryTerms = this.tokenize(query);
    const queryVector = this.computeVector(queryTerms, idf);

    let filterClause = "";
    let params = [];

    if (area && MEMORY_AREAS.includes(area)) {
      filterClause = "AND area = ?";
      params.push(area);
    }

    const rows = this.db.exec(`SELECT id, text, metadata, area, created_at, terms FROM memory WHERE terms IS NOT NULL ${filterClause}`);
    if (rows.length === 0) return [];

    const results = [];

    rows[0].values.forEach(([id, text, metadataJson, area, createdAt, termsJson]) => {
      const terms = JSON.parse(termsJson);
      const docVector = this.computeVector(terms, idf);
      const score = this.cosineSimilarity(queryVector, docVector);

      if (score >= threshold) {
        results.push({
          id,
          text,
          metadata: metadataJson ? JSON.parse(metadataJson) : {},
          area,
          createdAt,
          score
        });
      }
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  storeText(text) {
    const terms = this.tokenize(text);
    return JSON.stringify(terms);
  }
}

class Memory {
  constructor(workspacePath, db) {
    this.workspacePath = workspacePath;
    this.db = db;
    this.vectorStore = new VectorStore(db);
    this.idf = this.vectorStore.buildIdf();
  }

  search(query, limit = 10, threshold = 0.1, filter = {}) {
    return this.vectorStore.search(query, limit, threshold, filter.area, this.idf);
  }

  insert(texts, metadata = {}) {
    const ids = [];
    const now = new Date().toISOString();

    texts.forEach(text => {
      const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
      const id = `mem_${randomUUID()}`;
      const terms = this.vectorStore.storeText(truncated);
      const area = metadata.area || "MAIN";
      const metadataJson = JSON.stringify(metadata);

      this.db.run(
        "INSERT INTO memory (id, text, metadata, area, created_at, terms) VALUES (?, ?, ?, ?, ?, ?)",
        [id, truncated, metadataJson, area, now, terms]
      );

      ids.push(id);
    });

    this.idf = this.vectorStore.buildIdf();
    return ids;
  }

  delete(ids) {
    if (!Array.isArray(ids)) ids = [ids];
    const placeholders = ids.map(() => "?").join(",");
    this.db.run(`DELETE FROM memory WHERE id IN (${placeholders})`, ids);
  }

  deleteByQuery(query, area) {
    let sql = "DELETE FROM memory";
    const params = [];

    if (query) {
      sql += " WHERE text LIKE ?";
      params.push(`%${query}%`);
    }

    if (area) {
      sql += query ? " AND area = ?" : " WHERE area = ?";
      params.push(area);
    }

    this.db.run(sql, params);
  }

  preloadKnowledge() {
    const knowledgeDir = path.join(this.workspacePath, ".knowledge");
    if (!fs.existsSync(knowledgeDir)) {
      return { imported: 0, skipped: 0, errors: [] };
    }

    const checksums = this.getKnowledgeChecksums();
    const stats = { imported: 0, skipped: 0, errors: [] };

    this.walkKnowledgeDir(knowledgeDir, (filePath, relativePath) => {
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const checksum = this.computeChecksum(content);
        const ext = path.extname(filePath).toLowerCase();

        if (!SUPPORTED_EXTENSIONS.has(ext)) {
          stats.skipped++;
          return;
        }

        if (checksums[relativePath] === checksum) {
          stats.skipped++;
          return;
        }

        const filename = path.basename(filePath);
        this.insert([content], {
          area: "KNOWLEDGE",
          source: "knowledge_import",
          filepath: relativePath,
          filename,
          extension: ext,
          checksum
        });

        this.updateKnowledgeChecksum(relativePath, checksum);
        stats.imported++;
      } catch (error) {
        stats.errors.push({ path: relativePath, error: error.message });
      }
    });

    return stats;
  }

  walkKnowledgeDir(root, callback) {
    const entries = fs.readdirSync(root, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(root, entry.name);
      const relativePath = path.relative(this.workspacePath, fullPath);

      if (entry.isDirectory()) {
        this.walkKnowledgeDir(fullPath, callback);
      } else if (entry.isFile()) {
        callback(fullPath, relativePath);
      }
    }
  }

  computeChecksum(content) {
    return createHash("md5").update(content).digest("hex");
  }

  getKnowledgeChecksums() {
    const rows = this.db.exec("SELECT filepath, checksum FROM knowledge_checksums");
    if (rows.length === 0) return {};

    const checksums = {};
    rows[0].values.forEach(([filepath, checksum]) => {
      checksums[filepath] = checksum;
    });

    return checksums;
  }

  updateKnowledgeChecksum(filepath, checksum) {
    const now = new Date().toISOString();
    this.db.run(
      "INSERT OR REPLACE INTO knowledge_checksums (filepath, checksum, updated_at) VALUES (?, ?, ?)",
      [filepath, checksum, now]
    );
  }

  getAllMemories(area) {
    let sql = "SELECT id, text, metadata, area, created_at FROM memory";
    const params = [];

    if (area && MEMORY_AREAS.includes(area)) {
      sql += " WHERE area = ?";
      params.push(area);
    }

    sql += " ORDER BY created_at DESC LIMIT 500";

    const rows = this.db.exec(sql, params);
    if (rows.length === 0) return [];

    return rows[0].values.map(([id, text, metadataJson, area, createdAt]) => ({
      id,
      text,
      metadata: metadataJson ? JSON.parse(metadataJson) : {},
      area,
      createdAt
    }));
  }

  getMemoryById(id) {
    const rows = this.db.exec("SELECT id, text, metadata, area, created_at FROM memory WHERE id = ?", [id]);
    if (rows.length === 0 || rows[0].values.length === 0) return null;

    const [memoryId, text, metadataJson, area, createdAt] = rows[0].values[0];
    return {
      id: memoryId,
      text,
      metadata: metadataJson ? JSON.parse(metadataJson) : {},
      area,
      createdAt
    };
  }

  getKnowledgeStats() {
    const rows = this.db.exec("SELECT area, COUNT(*) as count FROM memory GROUP BY area");
    if (rows.length === 0) return {};

    const stats = {};
    MEMORY_AREAS.forEach(area => stats[area] = 0);
    rows[0].values.forEach(([area, count]) => {
      stats[area] = count;
    });

    return stats;
  }
}

const memoryInstances = new Map();

function getMemoryInstance(workspacePath, db) {
  if (!memoryInstances.has(workspacePath)) {
    memoryInstances.set(workspacePath, new Memory(workspacePath, db));
  }
  return memoryInstances.get(workspacePath);
}

function clearMemoryInstance(workspacePath) {
  memoryInstances.delete(workspacePath);
}

module.exports = {
  Memory,
  getMemoryInstance,
  clearMemoryInstance,
  MEMORY_AREAS
};
