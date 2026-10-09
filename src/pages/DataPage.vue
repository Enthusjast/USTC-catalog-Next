<script setup lang="ts">
import { ref } from "vue";
import { Trash2 } from "@lucide/vue";
import { clearCache } from "../api/cache";
import { API_BASE } from "../api/client";
import { clearPlanner } from "../features/usePlanner";
import { useFavorites } from "../features/useFavorites";
import { usePreferences } from "../features/usePreferences";
import { clearFilterPreferences } from "../features/filterPreferences";
import PageHeading from "../components/PageHeading.vue";
const message = ref(""),
  { clear } = useFavorites(),
  { theme } = usePreferences();
async function clearLocal() {
  try {
    await clearCache();
    clearPlanner();
    clear();
    clearFilterPreferences();
    theme.value = "light";
    message.value = "本机查询缓存、候选清单、收藏、筛选和主题偏好已清除。";
  } catch (cause) {
    message.value = (cause as Error).message;
  }
}
</script>
<template>
  <PageHeading
    title="数据来源与使用说明"
    description="了解公开数据来自哪里、查询和缓存时间意味着什么，以及本机规划的适用范围。"
    eyebrow="ABOUT / 数据说明"
  />
  <article class="panel prose">
    <h2>独立公共查询工具</h2>
    <p>
      科大目录非中国科学技术大学官方系统。本站查询公开只读资料，提供浏览器内的检索与规划辅助；不要求账号，不读取学生身份、成绩或个人选课关系。
    </p>
    <h2>数据来源</h2>
    <p>
      原始公开资料来自<a
        href="https://catalog.ustc.edu.cn/"
        target="_blank"
        rel="noopener noreferrer"
        >中国科大教务目录</a
      >。页面通过镜像接口
      <a :href="API_BASE" target="_blank" rel="noopener noreferrer">{{
        API_BASE
      }}</a>
      读取数据。历史培养方案和官方汇总文件通过明确的来源链接打开。
    </p>
    <p>
      公开教学班、考试和替代关系可能次日更新。最终排课、考试与选课结果以<a
        href="https://jw.ustc.edu.cn/"
        target="_blank"
        rel="noopener noreferrer"
        >综合教务系统</a
      >为准。
    </p>
    <h2>查询时间与缓存</h2>
    <ul>
      <li><strong>在线读取：</strong>本次成功从 API 读取并校验数据。</li>
      <li>
        <strong>本机缓存：</strong
        >浏览器使用尚未达到重查期限的结果。不同访问者的缓存相互独立。
      </li>
      <li>
        <strong>离线 · 缓存已过期：</strong
        >网络连接失败后展示通过字段校验的旧结果，保存时间和缓存年龄会同时显示。
      </li>
      <li>
        <strong>查询时间：</strong
        >本浏览器最近成功读取此接口的时间，不是教务数据更新时间。接口未提供可信更新字段时，本站不推测更新时间。
      </li>
    </ul>
    <p>
      学期、院系和培养计划缓存 24
      小时，课程搜索、详情、教学班、考试和替代关系缓存 30 分钟，教室记录缓存 5
      分钟。可通过“刷新”重新查询。HTTP 错误、HTML 响应或字段变化会显示接口错误。
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
    <h2>本机数据与隐私</h2>
    <p>
      查询缓存保存在 IndexedDB，筛选偏好、主题、课程收藏和候选清单保存在
      localStorage。浏览器禁用存储时，仍可查询，但偏好和清单可能无法在重开页面后保留。本站不使用分析追踪脚本，API
      请求不发送 Cookie。
    </p>
    <p>
      打开没有查询参数的页面时恢复本机筛选；分享链接中的条件优先，清除筛选后不会自动恢复旧条件。
    </p>
    <p>
      清除本机数据会移除此浏览器中的查询缓存、候选清单、收藏、筛选和主题偏好。清除前可在教学班或考试页导出
      ICS。
    </p>
    <button class="button secondary" @click="clearLocal">
      <Trash2 :size="16" />清除本机数据
    </button>
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
