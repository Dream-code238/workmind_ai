// 工作流模块状态：模板选择、节点执行状态、人工审核、结果
import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { fetchStream } from "@/utils/http.js";
import http from "@/utils/http.js";
import { useAppStore } from "./app.js";

export const useWorkflowStore = defineStore("workflow", () => {
  const appStore = useAppStore();

  // ── 模板列表（内置 4 个模板，也可从后端加载）────────────
  const templates = ref([
    {
      id: "weekly_report",
      title: "周报生成",
      icon: "📊",
      desc: "输入本周工作要点，自动提炼亮点、识别风险，生成规范周报",
      inputLabel: "本周工作要点",
      inputPlaceholder: "请简单描述本周完成的主要工作，一条一行...",
      extraField: {
        key: "dept",
        label: "部门名称",
        placeholder: "如：前端研发组",
      },
      nodes: [
        { id: "extract_highlights", label: "提炼工作亮点" },
        { id: "identify_risks", label: "识别风险阻塞" },
        { id: "human_review", label: "人工审核", isHuman: true },
        { id: "generate_report", label: "生成周报" },
      ],
      resultKey: "report",
    },
    // ... meeting_minutes、email_polish、prd_skeleton 类似结构省略
  ]);

  // ── 当前工作流运行状态 ─────────────────────────────────────
  const selectedTemplate = ref("");
  const nodeStates = reactive({}); // { [nodeId]: 'idle' | 'running' | 'done' | 'waiting' }
  const nodeOutputs = reactive({}); // { [nodeId]: '节点输出预览文本' }
  const running = ref(false);
  const paused = ref(false);
  const currentThreadId = ref(""); // 暂停时保存的线程 ID，恢复时用
  const intermediates = ref([]); // 暂停时的中间产物（供人工审核查看）
  const result = ref("");
  const streamBuffer = ref(""); // 最后一个节点流式输出的累积内容

  // ── 重置状态 ────────────────────────────────────────────────
  function reset() {
    const templateMeta = templates.value.find(
      (t) => t.id === selectedTemplate.value,
    );
    if (templateMeta) {
      templateMeta.nodes.forEach((n) => {
        nodeStates[n.id] = "idle";
        nodeOutputs[n.id] = "";
      });
    }
    running.value = false;
    paused.value = false;
    currentThreadId.value = "";
    intermediates.value = [];
    result.value = "";
    streamBuffer.value = "";
  }

  function selectTemplate(id) {
    selectedTemplate.value = id;
    reset();
  }

  // ── 启动工作流 ─────────────────────────────────────────────
  async function startWorkflow(input) {
    if (running.value) return;
    running.value = true;
    reset();

    await fetchStream(
      "/api/workflow/start/stream",
      { workflowId: selectedTemplate.value, input },
      {
        onEvent: (event, data) => {
          if (event === "start") {
            currentThreadId.value = data.threadId;
          }
          if (event === "node_start") {
            nodeStates[data.nodeId] = "running";
          }
          if (event === "node_done") {
            nodeStates[data.nodeId] = "done";
            if (data.preview) nodeOutputs[data.nodeId] = data.preview;
          }
          if (event === "paused") {
            // 到达 human_review 节点，保存状态等待人工输入
            currentThreadId.value = data.threadId;
            intermediates.value = data.intermediates || [];
            paused.value = true;
            running.value = false;
            nodeStates["human_review"] = "waiting";
          }
          if (event === "completed") {
            result.value = data.result;
            running.value = false;
          }
        },
        onDone: () => {
          running.value = false;
        },
        onError: (err) => {
          running.value = false;
          appStore.toast.error(err.message || "工作流执行失败");
        },
      },
    );
  }

  // ── 恢复工作流（注入人工反馈后继续）────────────────────────
  async function resumeWorkflow(feedback = "") {
    if (!currentThreadId.value || running.value) return;
    running.value = true;
    paused.value = false;
    nodeStates["human_review"] = "done";
    streamBuffer.value = "";

    await fetchStream(
      "/api/workflow/resume/stream",
      { threadId: currentThreadId.value, feedback },
      {
        onToken: (token) => {
          streamBuffer.value += token;
        },
        onEvent: (event, data) => {
          if (event === "node_start") {
            nodeStates[data.nodeId] = "running";
          }
          if (event === "node_done") {
            nodeStates[data.nodeId] = "done";
          }
          if (event === "completed") {
            result.value = data.result || streamBuffer.value;
            streamBuffer.value = "";
            running.value = false;
          }
        },
        onDone: () => {
          if (streamBuffer.value && !result.value)
            result.value = streamBuffer.value;
          running.value = false;
        },
        onError: (err) => {
          running.value = false;
          appStore.toast.error(err.message || "恢复失败");
        },
      },
    );
  }

  return {
    templates,
    selectedTemplate,
    nodeStates,
    nodeOutputs,
    running,
    paused,
    currentThreadId,
    intermediates,
    result,
    streamBuffer,
    loadTemplates,
    selectTemplate,
    startWorkflow,
    resumeWorkflow,
    reset,
  };
});
