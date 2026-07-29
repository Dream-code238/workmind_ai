// 自动读取 .env 文件
import "dotenv/config";

/**
 * @description 统一入口（改配置只看一个文件）、类型转换（PORT 字符串→数字）、默认值（没配置时用合理的值）、启动校验（缺少必填项直接退出，避免运行时才发现）。
 */

export const config = {
  app: {
    port: Number(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || "development",
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
    ],
  },
  ai: {
    deepseekKey: process.env.DEEPSEEK_API_KEY,
    zhipuKey: process.env.ZHIPU_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
    primaryModel: process.env.PRIMARY_MODEL || "deepseek-chat",
    baseURL: "https://api.deepseek.com/v1",
    embedBaseURL: process.env.EMBED_BASE_URL || "https://api.siliconflow.cn/v1",
  },
  cache: {
    ttl: Number(process.env.CACHE_TTL) || 1800000, // 30 分钟
  },
};

// 启动时校验必填项
export function validateConfig() {
  if (!config.ai.deepseekKey) {
    console.error("缺少 DEEPSEEK_API_KEY，请在 .env 文件中配置");
    process.exit(1);
  }
  console.log("配置校验通过");
}
