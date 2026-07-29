/**
 * @description 所有错误统一分类，给用户友好的提示，给开发者详细的日志。
 */

// 自定义错误类：带业务信息的 Error
export class AppError extends Error {
  constructor(
    message,
    { code = "UNKNOWN", statusCode = 500, retryable = false, userMessage } = {},
  ) {
    super(message);
    this.code = code; // 错误码
    this.statusCode = statusCode; // HTTP 状态码
    this.retryable = retryable; // 是否可重试
    this.userMessage = userMessage || "服务暂时不可用，请稍后重试";
  }
}

// 把各种原始错误转成统一的 AppError
export function classifyError(err) {
  if (err instanceof AppError) return err;
  const status = err.status || err.statusCode;

  if (status === 429) {
    return new AppError("API 限流", {
      code: "RATE_LIMIT",
      statusCode: 429,
      retryable: true,
      userMessage: "请求太频繁，请稍后重试",
    });
  }

  if (status === 401 || status === 403) {
    return new AppError("认证失败", {
      code: "AUTH_ERROR",
      statusCode: 500,
      retryable: false,
      userMessage: "服务配置错误，请联系管理员",
    });
  }

  if (status >= 500 || err.message?.includes("ECONNRESET")) {
    return new AppError("服务不可用", {
      code: "SERVICE_ERROR",
      statusCode: 503,
      retryable: true,
    });
  }

  return new AppError(err.message, { code: "UNKNOWN", retryable: false });
}

// Express 错误处理中间件（必须注册在所有路由之后）
export function errorMiddleware(err, req, res, next) {
  const appErr = classifyError(err);
  res.status(appErr.statusCode).json({
    error: {
      code: appErr.code,
      message: appErr.userMessage,
      retryable: appErr.retryable,
    },
  });
}

export function sendSseError(res, err) {
  const appErr = classifyError(err);

  if (!res.writableEnded) {
    res.write(
      `event: error\ndata: ${JSON.stringify({
        message: appErr.userMessage,
        retryable: appErr.retryable,
      })}\n\n`,
    );
    res.end();
  }
}
