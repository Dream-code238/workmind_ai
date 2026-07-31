import axios from "axios";

// ─── axios 实例 ───
const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// 请求拦截器
http.interceptors.request.use((config) => config);

// 响应拦截器（统一错误处理）
http.interceptors.response.use(
  (response) => response.data, // 直接返回 data，不用每次写 .data
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("请求超时");
    } else if (error.response?.status === 429) {
      console.error("请求太频繁");
    } else if (error.response?.status >= 500) {
      console.error("服务器异常");
    }
    return Promise.reject(error);
  },
);

// ─── SSE 流式请求工具 ★★★ 核心！───
/**
 * 使用浏览器原生 fetch + ReadableStream 实现 SSE 流式请求
 *
 * @param {string} url     - 请求地址
 * @param {object} body    - 请求体
 * @param {object} options - 回调函数
 * @param {function} options.onToken - 收到 token 时调用
 * @param {function} options.onEvent - 收到其他事件时调用
 * @param {function} options.onDone  - 流结束时的回调
 * @param {function} options.onError - 错误时的回调
 */
export async function fetchStream(
  url,
  body,
  { onToken, onEvent, onDone, onError } = {},
) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE 格式：每条消息用 \n\n 分隔
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? ""; // 最后一段不完整，留着下次拼

      for (const part of parts) {
        if (!part.trim()) continue;

        const lines = part.split("\n");
        let event = "message";
        let dataStr = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) event = line.slice(7).trim();
          if (line.startsWith("data: ")) dataStr = line.slice(6);
        }

        if (!dataStr) continue;
        let data;
        try {
          data = JSON.parse(dataStr);
        } catch {
          continue;
        }

        // 按事件类型分发
        if (event === "token" && onToken) {
          onToken(data.token || "");
        } else if (event === "done" && onDone) {
          onDone(data);
        } else if (event === "error") {
          onError?.(new Error(data.message || "流式请求出错"));
          return;
        } else if (onEvent) {
          onEvent(event, data);
        }
      }
    }
  } catch (err) {
    onError?.(err);
  }
}

export default http;
