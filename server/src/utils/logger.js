const isProd = process.env.NODE_ENV === "production";

function log(level, msg, ctx = {}) {
  const entry = { time: new Date().toISOString(), level, msg, ...ctx };

  if (isProd) {
    // 生产环境：输出 JSON 格式，方便日志收集工具解析
    process.stdout.write(JSON.stringify(entry) + "\n");
    return;
  }

  // 开发环境：彩色输出，更好看
  const colors = {
    info: "\x1b[36m", // 青色
    warn: "\x1b[33m", // 黄色
    error: "\x1b[31m", // 红色
    debug: "\x1b[90m", // 灰色
  };

  const c = colors[level] || "";
  const reset = "\x1b[0m";
  const time = entry.time.slice(11, 19); // 只取 HH:mm:ss
  const ctxStr = Object.keys(ctx).length ? " " + JSON.stringify(ctx) : "";
  console.log(`${c}[${time}] ${level.toUpperCase()} ${msg}${ctxStr}${reset}`);
}

export const logger = {
  info: (msg, ctx) => log("info", msg, ctx),
  warn: (msg, ctx) => log("warn", msg, ctx),
  error: (msg, ctx) => log("error", msg, ctx),
  debug: (msg, ctx) => {
    if (!isProd) log("debug", msg, ctx);
  },
};
