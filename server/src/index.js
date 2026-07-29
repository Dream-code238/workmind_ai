import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { validateConfig, config } from "./config/index.js";
import { requestLogger } from "./middleware/index.js";
import { errorMiddleware } from "./utils/errors.js";
import { logger } from "./utils/logger.js";
import { healthRouter } from "./routes/health.js";

// 启动前校验配置
validateConfig();

const app = express();

// ─── 基础中间件（注册顺序很重要！）───

// 1. 安全头
app.use(helmet({ contentSecurityPolicy: false }));
// 2. 响应压缩
app.use(compression());
// 3. 跨域
app.use(
  cors({
    origin: config.app.allowedOrigins,
    credentials: true,
  }),
);
// 4. JSON 解析
app.use(express.json({ limit: "5mb" }));
// 5. 请求日志
app.use(requestLogger);

// ─── 路由注册 ───
app.use("/health", healthRouter);
// 后续章节会逐步添加更多路由

// 404 处理
app.use("*", (req, res) => {
  res.status(404).json({ error: { message: "接口不存在" } });
});

// 错误处理（必须在所有路由之后）
app.use(errorMiddleware);

// 启动服务
const server = app.listen(config.app.port, () => {
  logger.info("server started", { port: config.app.port, env: config.app.env });
  console.log(`\n WorkMind Server 已启动`);
  console.log(` 地址: http://localhost:${config.app.port}\n`);
});

// 优雅退出
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function shutdown(signal) {
  logger.info("shutdown", { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
}
