import express from "express";
import { getWorkflowTemplates } from "../services/workflow/workflows.js";

const router = express.Router();

// GET /api/workflow/templates - 获取工作流模板列表
router.get("/templates", (req, res) => {
  const templates = getWorkflowTemplates().map((t) => ({
    id: t.id,
    name: t.name,
    desc: t.desc,
    icon: t.icon,
    fields: t.fields,
  }));
  res.json({ templates });
});

// POST /api/workflow/generate - 执行工作流生成
router.post("/generate", async (req, res) => {
  const { templateId, fields } = req.body;

  const template = getWorkflowTemplates().find((t) => t.id === templateId);
  if (!template) {
    return res.status(400).json({ error: "无效的工作流模板" });
  }

  // SSE 流式输出
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    send("start", { templateId });

    const result = await template.generate(fields, (token) => {
      send("token", { token });
    });

    send("done", { result });
  } catch (err) {
    send("error", { message: err.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

export default router;
