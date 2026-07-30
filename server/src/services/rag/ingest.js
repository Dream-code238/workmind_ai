import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embeddings } from "../model.js";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { logger } from "../../utils/logger.js";

// 内存存储（生产环境换真实的 Chroma/PGVector）
const docStore = new Map(); // docId → { chunks, metadata }

// 创建文本分片器
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500, // 每片 500 字符
  chunkOverlap: 50, // 片与片重叠 50 字符（防止关键信息被切断）
});

/**
 * 处理上传的文本内容并分片入库
 */
export async function ingestText(fileName, text, metadata = {}) {
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  logger.info("ingesting", { docId, fileName, textLen: text.length });

  // 步骤 1：创建文档对象
  const docs = [
    { pageContent: text, metadata: { fileName, docId, ...metadata } },
  ];

  // 步骤 2：分片
  const chunks = await splitter.splitDocuments(docs);

  // 步骤 3：为每个分片生成向量
  if (embeddings) {
    for (const chunk of chunks) {
      chunk.embedding = await embeddings.embedQuery(chunk.pageContent);
    }
  }

  // 步骤 4：存入内存
  docStore.set(docId, {
    id: docId,
    fileName,
    chunks,
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
  });

  return {
    docId,
    fileName,
    chunkCount: chunks.length,
  };
}

/**
 * 解析 PDF 文件内容
 */
export async function parsePDF(buffer, fileName) {
  // 临时保存 PDF
  const fs = await import("fs/promises");
  const path = await import("path");
  const os = await import("os");

  const tmpPath = path.join(os.tmpdir(), `workmind_${Date.now()}.pdf`);
  await fs.writeFile(tmpPath, buffer);

  try {
    const loader = new PDFLoader(tmpPath);
    const docs = await loader.load();
    const text = docs.map((d) => d.pageContent).join("\n");
    return text;
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

export function getDocStore() {
  return docStore;
}
