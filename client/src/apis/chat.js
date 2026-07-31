/**
 * @description 对话模块：会话、角色、画像、流式消息
 */

import http, { fetchStream } from "@/utils/http.js";

/** 删除服务端会话 */
export function deleteSession(id) {
  return http.delete(`/chat/sessions/${id}`);
}

/** 加载角色列表 */
export function fetchRoles() {
  return http.get("/chat/roles");
}

/** 加载用户画像 */
export function fetchProfile(userId) {
  return http.get(`/chat/profile/${userId}`);
}

/** 流式发送消息 */
export function sendMessageStream(body, callbacks) {
  return fetchStream("/api/chat/stream", body, callbacks);
}
