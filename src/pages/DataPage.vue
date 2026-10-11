<script setup lang="ts">
import { ref } from "vue";
import { Trash2, Download, RefreshCw } from "@lucide/vue";
import { clearCache } from "../api/cache";
import { clearAllLocalData } from "../features/clearLocalData";
import { usePWA } from "../features/usePWA";
import WorkspaceBackup from "../components/WorkspaceBackup.vue";
import PageHeading from "../components/PageHeading.vue";
const message = ref(""),
  clearing = ref(false),
  confirmClear = ref(false);
const {
  installed,
  installAvailable,
  installing,
  needRefresh,
  updating,
  install,
  update,
  message: pwaMessage,
} = usePWA();
async function clearLocal(all = false) {
  if (clearing.value) return;
  clearing.value = true;
  message.value = "";
  try {
    if (all) await clearAllLocalData();
    else await clearCache();
    message.value = all
      ? "全部本机查询资料、方案、收藏及偏好已清除。"
      : "查询缓存已清除，方案和收藏已保留。";
  } catch (cause) {
    message.value = `清除未完成：${(cause as Error).message}`;
  } finally {
    clearing.value = false;
    confirmClear.value = false;
  }
}
</script>
<template>
  <PageHeading
    title="站点说明"
    description="了解本站功能和本机数据管理。"
    eyebrow="ABOUT / 关于本站"
  />
  <article class="panel prose">
    <h2>独立公共查询工具</h2>
    <p>
      USTC-catalog-Next
      非中国科学技术大学官方系统。本站查询公开只读资料，提供浏览器内的检索与规划辅助；不要求账号，不读取学生身份、成绩或个人选课关系。
    </p>
    <h2>公开资料</h2>
    <p>
      原始公开资料来自<a
        href="https://catalog.ustc.edu.cn/"
        target="_blank"
        rel="noopener noreferrer"
        >中国科大教务目录</a
      >。历史培养方案和官方汇总文件可通过相应页面打开。
    </p>
    <p>
      公开教学班、考试和替代关系可能次日更新。最终排课、考试与选课结果以<a
        href="https://jw.ustc.edu.cn/"
        target="_blank"
        rel="noopener noreferrer"
        >综合教务系统</a
      >为准。
    </p>
    <h2>课程、计划与时间判断</h2>
    <ul>
      <li>
        课程目录中的“当前有效”不保证每学期开课。历史静态培养方案与 API
        执行计划分别展示。
      </li>
      <li>
        候选教学班与收藏只表示本机规划，不表示选课成功、已修学分、完成进度或毕业资格。
      </li>
      <li>
        冲突提示仅表示公开安排存在时间重叠。无法识别的周次、课节或日期会标为未知。
      </li>
      <li>
        教学班 ICS 需要使用者确认第 1
        教学周周一日期。默认导出含课节说明的全天提醒；钟点模式使用明确选定的课节表，须对照实际校区与校历核对。考试
        ICS 只导出有准确日期和时间的记录。
      </li>
      <li>
        教室时段状态仅根据公开记录推算，不代表可预约、可进入或已获批准。缺少定位、时间或记录覆盖范围时，状态为未知。
      </li>
      <li>课程替代只展示直接关系与原始课程组合，不推导多跳替代资格。</li>
    </ul>
    <h2>安装与离线使用</h2>
    <p>
      首次联网加载完成后，可以离线打开应用并阅读已查询的资料。未查询的内容仍需要联网，公开数据不会在后台自动更新。
    </p>
    <p v-if="installed">已作为应用安装。</p>
    <button
      v-else-if="installAvailable"
      class="button secondary"
      :disabled="installing"
      @click="install"
    >
      <Download :size="16" />{{
        installing ? "正在安装…" : "安装 USTC-catalog-Next"
      }}
    </button>
    <p v-else>可通过浏览器菜单选择“安装应用”或“添加到主屏幕”。</p>
    <button
      v-if="needRefresh"
      class="button secondary"
      :disabled="updating"
      @click="update"
    >
      <RefreshCw :size="16" />{{ updating ? "正在更新…" : "更新应用" }}
    </button>
    <p v-if="pwaMessage" role="status">{{ pwaMessage }}</p>
    <WorkspaceBackup />
    <h2>本机数据与隐私</h2>
    <p>
      查询缓存保存在 IndexedDB，筛选偏好、主题、课程收藏和候选清单保存在
      localStorage，教室浏览位置保存在
      sessionStorage。浏览器禁用存储时，仍可查询，但偏好和清单可能无法在重开页面后保留。本站不使用分析追踪脚本，API
      请求不发送 Cookie。
    </p>
    <p>
      打开没有查询参数的页面时恢复本机筛选；分享链接中的条件优先，清除筛选后不会自动恢复旧条件。
    </p>
    <p>
      清除查询缓存保留方案与收藏；清除全部本机数据还会移除新旧候选清单、收藏、筛选、主题及浏览位置。清除前可导出
      JSON 备份。
    </p>
    <div class="flex-actions">
      <button
        class="button secondary"
        :disabled="clearing"
        @click="clearLocal(false)"
      >
        <Trash2 :size="16" />清除查询缓存
      </button>
      <button
        class="button secondary"
        :disabled="clearing"
        @click="confirmClear = true"
      >
        <Trash2 :size="16" />清除全部本机数据
      </button>
    </div>
    <div
      v-if="confirmClear"
      class="notice"
      role="group"
      aria-label="确认清除全部本机数据"
    >
      <p>此浏览器中的方案与收藏也将被删除。</p>
      <div class="flex-actions">
        <button class="button" :disabled="clearing" @click="clearLocal(true)">
          确认清除
        </button>
        <button
          class="button secondary"
          :disabled="clearing"
          @click="confirmClear = false"
        >
          取消
        </button>
      </div>
    </div>
    <p v-if="message" role="status" style="margin-top: 16px">{{ message }}</p>
    <h2>项目与许可证</h2>
    <p>
      源码：<a
        href="https://github.com/Enthusjast/USTC-catalog-Next"
        target="_blank"
        rel="noopener noreferrer"
        >USTC-catalog-Next</a
      >。接口模型和课节表参考<a
        href="https://github.com/Enthusjast/USTC-catalog-CLI"
        target="_blank"
        rel="noopener noreferrer"
        >USTC-catalog-CLI</a
      >，按 MIT 许可证保留许可声明。
    </p>
  </article>
</template>
