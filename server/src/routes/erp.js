import express from "express";
import { parseExpense } from "../services/erp/parser.js";
import { runApproval } from "../services/erp/approval.js";

const router = express.Router();

// POST /api/erp/parse - 解析自然语言输入
router.post("/parse", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "请输入描述" });

    const parsed = await parseExpense(text);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/erp/submit - 提交表单并执行审批
router.post("/submit", async (req, res) => {
  // SSE 流式输出审批进度
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const formData = req.body;
    if (!formData.type)
      return res.status(400).json({ error: "表单数据不完整" });

    send("start", {});

    const result = await runApproval(formData, (progress) => {
      send("progress", progress);
    });

    send("done", result);
  } catch (err) {
    send("error", { message: err.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

export default router;
