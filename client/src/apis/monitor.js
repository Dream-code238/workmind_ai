/**
 * @description 监控看板：统计数据、预算管理
 */

import http from "@/utils/http.js";

/** 加载监控统计数据 */
export function fetchStats() {
  return http.get("/monitor/stats");
}

/** 更新日预算 */
export function updateBudget(dailyBudget) {
  return http.put("/monitor/budget", { dailyBudget });
}
