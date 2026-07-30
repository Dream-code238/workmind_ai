import { embeddings } from "../model.js";
import { getDocStore } from "./ingest.js";
import { logger } from "../../utils/logger.js";

/**
 * 在已入库的文档中检索最相关的内容
 * @returns {array} [{ content, fileName, score }, ...]
 */
export async function searchKnowledge(query, options = {}) {
  const { topK = 3, minScore = 0.3 } = options;
  const docStore = getDocStore();

  if (docStore.size === 0) return [];

  // 步骤 1：将问题向量化
  const queryEmbedding = embeddings ? await embeddings.embedQuery(query) : null;

  if (!queryEmbedding) return [];

  // 步骤 2：收集所有分片
  const allChunks = [];
  for (const [, doc] of docStore) {
    for (const chunk of doc.chunks) {
      allChunks.push({ ...chunk, docFileName: doc.fileName });
    }
  }

  // 步骤 3：计算余弦相似度并排序
  const scored = allChunks.map((chunk) => ({
    content: chunk.pageContent,
    fileName: chunk.docFileName,
    score: cosineSimilarity(queryEmbedding, chunk.embedding || []),
  }));

  scored.sort((a, b) => b.score - a.score);

  // 步骤 4：过滤低分，返回 Top-K
  return scored.filter((item) => item.score >= minScore).slice(0, topK);
}

/**
 * 余弦相似度计算
 * cos(θ) = (A·B) / (||A|| * ||B||)
 */
function cosineSimilarity(a, b) {
  if (!a.length || !b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
