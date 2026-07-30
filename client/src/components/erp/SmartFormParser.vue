<!-- 智能填单：输入自然语言描述，AI 解析成结构化表单 -->
<template>
  <div class="smart-parser">
    <!-- 输入区域 -->
    <div class="input-section">
      <div class="input-header">
        <span class="input-label">用自然语言描述</span>
        <div class="example-chips">
          <span
            v-for="eg in currentExamples"
            :key="eg"
            class="example-chip"
            @click="inputText = eg"
          >
            {{ eg.slice(0, 18) }}...
          </span>
        </div>
      </div>
      <textarea
        v-model="inputText"
        class="input nl-input"
        :placeholder="currentPlaceholder"
        rows="3"
        :disabled="erpStore.parsing"
      />
      <div class="parse-actions">
        <span class="char-hint">{{ inputText.length }} 字</span>
        <button
          class="btn btn-primary"
          @click="doParse"
          :disabled="!inputText.trim() || erpStore.parsing"
        >
          <span v-if="erpStore.parsing" class="spinner" />{{
            erpStore.parsing ? "解析中..." : "AI 解析"
          }}
        </button>
      </div>
    </div>

    <!-- 解析结果：报销表单（含费用明细表格 + 警告提示） -->
    <div
      v-if="erpStore.parsedForm && erpStore.formType === 'expense'"
      class="parsed-form"
    >
      <div class="form-title">
        <span>报销申请单</span><span class="form-badge">AI 自动填写</span>
      </div>
      <div v-if="erpStore.parsedForm.warnings?.length" class="warnings">
        <div
          v-for="w in erpStore.parsedForm.warnings"
          :key="w"
          class="warning-item"
        >
          {{ w }}
        </div>
      </div>
      <div class="form-grid">
        <FormField label="费用类型" :value="expenseTypeLabel" />
        <FormField label="报销事由" :value="erpStore.parsedForm.reason" />
        <FormField
          label="总金额"
          :value="`¥ ${erpStore.parsedForm.totalAmount}`"
          highlight
        />
      </div>
      <div class="detail-title">费用明细</div>
      <table class="detail-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>金额</th>
            <th>日期</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in erpStore.parsedForm.items" :key="i">
            <td>{{ item.name }}</td>
            <td class="amount">¥ {{ item.amount }}</td>
            <td>{{ item.date || "—" }}</td>
            <td>{{ item.note || "—" }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>合计</strong></td>
            <td class="amount total">
              ¥ {{ erpStore.parsedForm.totalAmount }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 解析结果：请假表单 -->
    <div
      v-if="erpStore.parsedForm && erpStore.formType === 'leave'"
      class="parsed-form"
    >
      <div class="form-title">
        <span>请假申请单</span><span class="form-badge">AI 自动填写</span>
      </div>
      <div class="form-grid">
        <FormField label="假期类型" :value="leaveTypeLabel" />
        <FormField label="开始日期" :value="erpStore.parsedForm.startDate" />
        <FormField label="结束日期" :value="erpStore.parsedForm.endDate" />
        <FormField
          label="请假天数"
          :value="`${erpStore.parsedForm.workdays} 天`"
          highlight
        />
        <FormField label="请假原因" :value="erpStore.parsedForm.reason" />
      </div>
    </div>

    <!-- 提交按钮（解析完成后显示） -->
    <div
      v-if="erpStore.parsedForm && !erpStore.approving && !erpStore.finalResult"
      class="submit-area"
    >
      <div class="submit-hint">确认表单内容无误后，点击提交进入审批流程</div>
      <div class="submit-row">
        <button class="btn btn-ghost" @click="erpStore.reset()">
          重新填写
        </button>
        <button class="btn btn-primary" @click="emit('submit')">
          提交审批
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useErpStore } from "@/stores/erp.js";

const emit = defineEmits(["submit"]);
const erpStore = useErpStore();
const inputText = ref("");

const examples = {
  expense: [
    "上周去上海出差，高铁票来回980元，住宿两晚共1100元，餐饮三天共420元，请帮我填报销单",
    "购买了两本技术书籍，共158元，用于学习新框架",
    "和客户吃工作餐，消费460元，请帮我报销",
  ],
  leave: [
    "我下周一到周三请年假，去外地旅游，请帮我走申请流程",
    "我明天需要请一天事假，去医院体检",
    "我想请婚假，结婚典礼在下个月5号",
  ],
};

const currentExamples = computed(() => examples[erpStore.formType] || []);
const currentPlaceholder = computed(() =>
  erpStore.formType === "expense"
    ? '如："上周去北京出差，高铁来回820元，住宿两晚1160元，帮我填报销单"'
    : '如："我下周一到周三请年假，去外地旅游，请帮我走请假申请"',
);

async function doParse() {
  await erpStore.parseForm(inputText.value);
}
</script>
