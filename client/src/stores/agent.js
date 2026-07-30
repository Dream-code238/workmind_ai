// Agent 模块状态：任务历史、工具调用步骤、执行状态
import { defineStore } from "pinia";
import { ref } from "vue";
import { fetchStream } from "@/utils/http.js";
import http from "@/utils/http.js";
import { useAppStore } from "./app.js";

export const useAgentStore = defineStore("agent", () => {
  const appStore = useAppStore();

  // ── 工具列表（从后端加载，默认值保证始终可见）──────────────
  const toolList = ref([
    {
      name: "web_search",
      label: "联网搜索",
      description: "搜索最新技术资讯和信息",
    },
    {
      name: "read_doc",
      label: "文档检索",
      description: "从公司知识库检索文档",
    },
    {
      name: "calculate",
      label: "数学计算",
      description: "金额、工期等数学计算",
    },
    {
      name: "get_date",
      label: "日期查询",
      description: "日期查询和工作日计算",
    },
    {
      name: "write_report",
      label: "生成报告",
      description: "生成并保存分析报告",
    },
    {
      name: "send_notify",
      label: "发送通知",
      description: "发送通知给相关人员",
    },
  ]);

  async function loadMeta() {
    try {
      const [toolsRes, examplesRes] = await Promise.all([
        http.get("/agent/tools"),
        http.get("/agent/examples"),
      ]);
      if (toolsRes.tools?.length) toolList.value = toolsRes.tools;
      if (examplesRes.examples?.length) examples.value = examplesRes.examples;
    } catch {}
  }

  // ── 任务执行历史 ───────────────────────────────────────────
  const tasks = ref([]);
  const running = ref(false);
  const currentTask = ref(null); // 正在执行的任务

  let taskId = 0;

  async function runTask(taskText) {
    if (!taskText.trim() || running.value) return;

    running.value = true;
    const id = ++taskId;
    const startTime = Date.now();

    const task = {
      id,
      task: taskText,
      steps: [], // 工具调用步骤数组
      answer: "", // 最终回答
      status: "running",
      startTime: new Date().toISOString(),
      duration: 0,
    };

    tasks.value.unshift(task);
    currentTask.value = task;

    await fetchStream(
      "/api/agent/run",
      { task: taskText },
      {
        onToken: (token) => {
          task.answer += token;
        },

        onEvent: (event, data) => {
          if (event === "start") {
            task.status = "running";
          }

          // 工具被调用：记录步骤
          if (event === "tool_call") {
            task.steps.push({
              id: task.steps.length + 1,
              toolName: data.toolName,
              label: data.label,
              args: data.args,
              result: null,
              status: "running",
              startMs: Date.now(),
            });
          }

          // 工具执行完毕：找到最后一个 running 步骤，标记为 done
          if (event === "tool_result") {
            const step = [...task.steps]
              .reverse()
              .find(
                (s) => s.toolName === data.toolName && s.status === "running",
              );
            if (step) {
              step.result = data.resultText;
              step.status = "done";
              step.durationMs = Date.now() - step.startMs;
            }
          }

          if (event === "done") {
            task.status = "done";
            task.duration = Date.now() - startTime;
            currentTask.value = null;
          }

          if (event === "error") {
            task.status = "error";
            task.answer = task.answer || data.message || "任务执行失败";
            currentTask.value = null;
            appStore.toast.error(data.message || "执行出错");
          }
        },

        onDone: () => {
          task.status = "done";
          task.duration = Date.now() - startTime;
          currentTask.value = null;
        },

        onError: (err) => {
          task.status = "error";
          task.answer = task.answer || "网络错误，请重试";
          currentTask.value = null;
          appStore.toast.error(err.message);
        },
      },
    );

    running.value = false;
  }

  function clearTasks() {
    tasks.value = [];
    currentTask.value = null;
  }

  return {
    toolList,
    examples,
    tasks,
    running,
    currentTask,
    loadMeta,
    runTask,
    clearTasks,
  };
});
