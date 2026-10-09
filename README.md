# 科大目录 · USTC Catalog Explorer

独立公共查询工具，非中国科学技术大学官方系统。基于公开只读接口检索课程、培养计划、教学班、考试、教室记录与直接课程替代关系。

## 本地运行

使用 Node.js 24 与 npm：

```sh
npm ci
npm run dev
```

开发地址为 `http://127.0.0.1:5173`。API 默认直连 `https://api.catalog.enthusjast.cc`，路径不包含原站的 `/api` 前缀。可复制 `.env.example` 到 `.env.local` 修改公开配置。

**本地 API 访问需要 API 服务放行开发 Origin**：`http://127.0.0.1:5173` 或 `http://localhost:5173`。生产镜像的精确 CORS 来源为 `https://catalog.enthusjast.cc`；页面能在本地加载并不表示 API 已允许该来源。被拒绝时页面展示请求错误与重试入口。

```sh
npm run typecheck
npm run build
npm run preview
npm run format
```

构建产物为 `dist`，Vue Router 使用 hash history，支持直接打开和刷新 `/#/programs/3430` 等链接。TypeScript 固定为 5.9 系列，以兼容当前 `vue-tsc`。

## 当前功能

- 首页与全站分组搜索；搜索建议支持键盘操作。
- 课程名、编号、英文名称、院系与实际字段类别筛选；有效/历史课程、课程详情、本机收藏。
- 执行计划按入学年级、培养类型、院系检索；递归模块、公共模块加载、课程详情、计划对比。
- 学期教学班分页与多条件筛选；候选清单、周课表、周次和课节冲突判断、ICS 导出。
- 课程/通识考试列表、周历、候选关联筛选、公开时间重叠与日历导出。
- 按日期展示教室公开记录；未知覆盖明确标注，时段推算不表示预约资格。
- 保留课程组合的直接替代关系；历史正文与官方归档入口。
- 查询时间、数据来源、缓存年龄、离线旧结果、错误与受限状态。
- 深浅主题、移动筛选面板、键盘焦点、本机数据清除。

教学班 API 只有课节编号。ICS 默认导出带课节说明的全天提醒；也可选用 CLI 提供的两种课节表。使用者必须对照官方校历确认第 1 周的周一和适用课节表。无法识别完整安排的教学班不会导出。考试缺少准确日期/时间时同样跳过。课节表 2 没有第 5 节映射，包含该节的安排不能按该表导出。

## 代码结构

| 路径             | 职责                                         |
| ---------------- | -------------------------------------------- |
| `src/app`        | 应用入口、hash 路由、导航与全局错误界面      |
| `src/api`        | 请求、限制状态、Zod DTO 校验、IndexedDB 缓存 |
| `src/adapters`   | 真实 API 字段到前端模型的转换、HTML 转纯文本 |
| `src/domain`     | 周次解析、时间冲突、计划比较、教室推算、ICS  |
| `src/features`   | 查询状态、URL 筛选、学期、收藏、本机候选清单 |
| `src/components` | 搜索、筛选、分页、详情、模块与课表           |
| `src/pages`      | 页面，按路由动态加载                         |

缓存只在网络失败时回退到通过校验的旧结果，HTTP、Content-Type、JSON 和 schema 错误不会被旧数据遮蔽。较大响应存入 IndexedDB，最多保留 100 个查询；清单和偏好使用 localStorage。存储不可用时查询仍可工作，并显示清单持久化失败信息。

## GitHub Pages

`.github/workflows/pages.yml` 在 PR 上构建，在 main 推送或手动触发时构建并发布。锁文件通过 `npm ci` 安装；自定义域名由 `public/CNAME` 声明，Vite base 为 `/`。

仓库管理员需在 Settings → Pages 选择 GitHub Actions，并确认 `catalog.enthusjast.cc` 的 DNS 指向 `Enthusjast.github.io` 及 HTTPS 可用。API 子域名继续指向 API 服务。

上线前请完成 [部署验收清单](docs/deployment.md)，尤其是正式 Origin 的浏览器跨域读取与 POST 预检。当前代码提交不等于这些外部设置已完成。

## 数据与许可

公开资料来自 [官方教务目录](https://catalog.ustc.edu.cn/)，实际安排以 [综合教务系统](https://jw.ustc.edu.cn/) 为准。本站不提供账号、个人成绩、选课或教务写入功能，不发送 API Cookie，不引入统计追踪脚本。

MIT 许可证见 [LICENSE](LICENSE)，参考 CLI 的许可声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
