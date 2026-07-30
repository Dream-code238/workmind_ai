import express from "express";
import multer from "multer";
import { ingestText, parsePDF, getDocStore } from "../services/rag/ingest.js";
import { searchKnowledge } from "../services/rag/query.js";
import { chatModel } from "../services/model.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/knowledge/upload - 上传文档
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "请上传文件" });

    let text;
    if (file.mimetype === "application/pdf") {
      text = await parsePDF(file.buffer, file.originalname);
    } else {
      text = file.buffer.toString("utf-8");
    }

    const result = await ingestText(file.originalname, text);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/knowledge/ingest-text - 直接提交文本
router.post("/ingest-text", async (req, res) => {
  try {
    const { text, fileName } = req.body;
    if (!text) return res.status(400).json({ error: "请提供文本内容" });

    const result = await ingestText(fileName || "手动输入", text);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/knowledge/ask - 基于知识库提问
router.post("/ask", async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "请输入问题" });

  // 设置 SSE 流
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    send("start", {});

    // 步骤 1：检索相关知识
    const sources = await searchKnowledge(question, { topK: 3 });
    send("sources", sources.length);

    // 步骤 2：构建 Prompt（知识 + 问题）
    const context = sources.length
      ? sources.map((s) => `【来源：${s.fileName}】\n${s.content}`).join("\n\n")
      : "没有找到相关知识。";

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `你是一个知识库助手。请根据以下知识内容回答用户问题。
        如果知识中没有相关信息，请如实告知。

        知识内容：
        {context}`,
      ],
      ["human", "{question}"],
    ]);

    const messages = await prompt.formatMessages({
      context: context || "无相关知识",
      question,
    });

    // 步骤 3：流式生成回答
    const stream = await chatModel.stream(messages);
    let fullReply = "";

    for await (const chunk of stream) {
      if (chunk.content) {
        fullReply += chunk.content;
        send("token", { token: chunk.content });
      }
    }

    // 步骤 4：追加来源引用
    if (sources.length) {
      const refText =
        "\n\n---\n**参考来源：**\n" +
        sources.map((s, i) => `${i + 1}. ${s.fileName}`).join("\n");
      // 不再通过 token 发送，而是通过 metadata 事件
      send("metadata", {
        sources: sources.map((s) => ({ fileName: s.fileName, score: s.score })),
      });
    }

    send("done", {});
  } catch (err) {
    send("error", { message: err.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// GET /api/knowledge/documents - 文档列表
router.get("/documents", (req, res) => {
  const docs = [...getDocStore().values()].map((d) => ({
    id: d.id,
    fileName: d.fileName,
    chunkCount: d.chunkCount,
    createdAt: d.createdAt,
  }));
  res.json({ documents: docs });
});

// DELETE /api/knowledge/documents/:id - 删除文档
router.delete("/documents/:id", (req, res) => {
  const store = getDocStore();
  store.delete(req.params.id);
  res.json({ success: true });
});

export default router;
