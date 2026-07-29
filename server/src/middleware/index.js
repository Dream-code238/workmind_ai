import { randomUUID } from "crypto";
import { z } from "zod";

// ─── 请求日志 + traceId（链路追踪）───
export function requestLogger(req, res, next) {
  const traceId = req.headers["x-trace-id"] || randomUUID();
  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);

  const start = Date.now();
  res.on("finish", () => {
    const level =
      res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";

    console.log(
      `[${level}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms [${traceId.slice(0, 8)}]`,
    );
  });
  next();
}

// ─── 令牌桶限流 ───
class TokenBucket {
  constructor(capacity = 30, refillRate = 10) {
    this.capacity = capacity; // 桶容量：最多 30 个令牌
    this.refillRate = refillRate; // 每秒补充 10 个
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume() {
    const elapsed = (Date.now() - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate,
    );
    this.lastRefill = Date.now();
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }
}

const bucket = new TokenBucket();

export function rateLimiter(req, res, next) {
  if (!bucket.consume()) {
    return res.status(429).json({
      error: { code: "RATE_LIMIT", message: "请求太频繁，请稍后重试" },
    });
  }
  next();
}

// ─── 输入校验（用 Zod 定义 Schema）───
const ChatSchema = z.object({
  message: z.string().min(1, "消息不能为空").max(4000, "消息过长"),
  sessionId: z.string().optional(),
  role: z.string().optional(),
});

export function validateChat(req, res, next) {
  const result = ChatSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: { message: result.error.errors[0].message },
    });
  }
  req.body = result.data; // 用校验后的数据替换
  next();
}

// ─── Prompt 注入检测（安全防护）───
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+(all\s+)?previous/i,
  /忽略(所有)?之前的指令/,
];

export function securityCheck(req, res, next) {
  const msg = req.body.message || "";
  if (INJECTION_PATTERNS.some((p) => p.test(msg))) {
    return res.status(400).json({
      error: { message: "输入内容不符合使用规范" },
    });
  }
  next();
}
