# USTC-catalog-Next

独立公共查询工具，非中国科学技术大学官方系统。基于公开只读接口检索课程、培养计划、教学班、考试、教室记录与直接课程替代关系。

## 本地运行

使用 Node.js 24 与 npm：

```sh
npm ci
npm run dev
```

开发地址为 `http://127.0.0.1:5173`。API 默认直连 `https://api.catalog.enthusjast.cc`，路径不包含原站的 `/api` 前缀。可复制 `.env.example` 到 `.env.local` 修改公开配置。

**本地 API 访问取决于 API 服务的 CORS 配置**。规格要求放行明确的开发 Origin：`http://127.0.0.1:5173` 或 `http://localhost:5173`，生产来源为 `https://catalog.enthusjast.cc`。2026-10-10 复查已通过正式来源及本地来源读取、精确 Origin、JSON POST 预检、未授权来源拒绝与未知路径 JSON 404；`npm run check:api` 已全部通过，见 [验证记录](docs/verification.md)。被拒绝时查询页展示请求错误与重试入口；教室页按界面约定隐藏查询提示。

```sh
npm test
npm run test:browser
npm run typecheck
npm run build
npm run check:pwa
npm run preview
npm run format
npm run check:api
```

构建产物为 `dist`，Vue Router 使用 hash history，支持直接打开和刷新 `/#/programs/3430` 等链接。TypeScript 固定为 5.9 系列，以兼容当前 `vue-tsc`。

没有可用接口时，可用 `npm run dev:fixtures` 启动开发演示模式。示例课程、计划与安排均为虚构，页面显示“演示数据”，其收藏、候选清单和筛选使用独立存储。历史归档仍读取已标明来源的静态资料。发布构建拒绝 fixtures 模式，并将开发样例模块替换为不含样例记录的占位模块。

## 当前功能

- 首页与全站分组搜索；搜索建议支持键盘操作。
- 课程名、编号、英文名称、院系与实际字段类别筛选；有效/历史课程、课程详情、本机收藏。
- 原站通修门类与综合素质分类分别浏览；组合门类显示各来源状态，课程和教学班可按编号、名称或院系排序。
- 执行计划按入学年级、培养类型、院系检索；递归模块、公共模块加载、课程详情、计划对比。
- 课程详情按编号核对近年教学班和选定范围的执行计划；公共模块在详情与对比中递归展开，失败引用保留未知提示。
- 筛选条件写入 URL 并保存在本机；直接打开页面恢复偏好，明确的分享条件优先，清除筛选后不会恢复旧条件。
- 学期教学班多条件筛选；按需读取学科与评分制、统一课程内容和教材链接、同课程最多四个教学班对比。
- 教学班列表与详情按课程及完整教师名单提供评课社区入口；未知或歧义对应使用课程搜索。
- 每学期最多 20 个候选方案，独立保存候选与日历设置；收藏和方案 JSON 备份可预览并合并导入。
- 候选/完整查询结果课表，支持完整周与单日、连续课节合并、密集安排完整清单，以及 PNG、打印/PDF 和 ICS。
- 课程/通识考试列表、周历、候选关联筛选、公开时间重叠与日历导出。
- 教室按真实楼栋、楼层独立横向浏览；日期导航、浏览位置恢复、三类占用配色、单日/本周完整记录和占用详情卡。
- 计划详情支持模块/原始建议学期与搜索、打印；课程、教学班、考试、计划及计划对比 CSV 导出全部筛选结果。
- 保留课程组合的直接替代关系；历史方案目录、官方正文阅读区、保留合并单元格的归档课程表与按版本分类的官方附件。
- 可安装离线应用，预缓存所有路由代码，断网读取已查询资料；新版本提供手动更新按钮。
- 查询缓存、方案与偏好分开管理，支持单独清除查询缓存或清除全部本机数据。
- 深浅主题、移动筛选面板、键盘焦点、本机数据清除。
- 已选筛选条件可单独移除，手机筛选提供结果数量与返回入口，分页支持页码跳转。

教学班 API 只有课节编号。ICS 默认导出带课节说明的全天提醒；也可选用 CLI 提供的两种课节表。使用者必须对照官方校历确认第 1 周的周一和适用课节表。无法识别完整安排的教学班不会导出。考试缺少准确日期/时间时同样跳过。课节表 2 没有第 5 节映射，包含该节的安排不能按该表导出。

## 代码结构

| 路径             | 职责                                            |
| ---------------- | ----------------------------------------------- |
| `src/app`        | 应用入口、hash 路由、导航与全局错误界面         |
| `src/api`        | 请求、限制状态、Zod DTO 校验、IndexedDB 缓存    |
| `src/adapters`   | 真实 API 字段到前端模型的转换、HTML 转纯文本    |
| `src/domain`     | 周次、冲突、方案、计划视图/比较、教室关联与导出 |
| `src/features`   | 查询状态、URL 筛选、学期、收藏、本机候选清单    |
| `src/components` | 搜索、筛选、分页、详情、模块与课表              |
| `src/pages`      | 页面，按路由动态加载                            |

缓存只在网络失败时回退到通过校验的旧结果，HTTP、Content-Type、JSON 和 schema 错误不会被旧数据遮蔽。较大响应存入 IndexedDB，最多保留 100 个查询；候选和收藏使用独立 IndexedDB 事务库，偏好使用 localStorage。存储不可用时查询仍可工作，并显示清单持久化失败信息。

## GitHub Pages

`.github/workflows/pages.yml` 在 PR 上测试和构建，在 main 推送或手动触发时运行相同检查，在 API 发布检查通过后发布。单元回归、离线产物检查和浏览器离线启动/更新回归均为发布门槛。检查包括精确 Origin、JSON/schema、POST/OPTIONS 和未知路径 JSON 404；失败时写入 Actions 摘要并阻止该次发布。锁文件通过 `npm ci` 安装；自定义域名由 `public/CNAME` 声明，Vite base 为 `/`。

仓库管理员需在 Settings → Pages 选择 GitHub Actions，并确认 `catalog.enthusjast.cc` 的 DNS 指向 `Enthusjast.github.io` 及 HTTPS 可用。API 子域名继续指向 API 服务。

上线前请完成 [部署验收清单](docs/deployment.md)，尤其是正式 Origin 的浏览器跨域读取与 POST 预检。Pages 已配置为 Actions 发布；每批仍需核对对应工作流成功及正式页面版本。

逐项实现和验收状态见 [规格状态表](docs/spec-status.md)，真实接口字段见 [API 字段清单](docs/api-contracts.md)。
原站参考与本轮界面调整见 [设计优化记录](docs/design-refresh.md)。

## 离线应用与本机数据

首次联网加载完成后，Service Worker 预缓存应用入口、样式、全部路由和安装图标。API 与归档 JSON 仍由已有的 IndexedDB 校验与缓存层管理，不增加第二套查询缓存。没有查询过或已被 100 条缓存上限淘汰的资料需要联网。更新只在点击“更新应用”后加载，不清除方案、收藏或已查询资料。

“站点说明”提供安装、JSON 备份以及两种清除操作。备份只包含本机方案、收藏和方案日历设置，格式标识为 `USTC-catalog-Next-backup`、`version: 2`（兼容导入版本 1）。完整规则见 [数据管理说明](docs/data-management.md)。

浏览器回归先执行生产构建，再由 Playwright 启动预览；首次运行执行 `npx playwright install chromium`。可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定已有 Chromium。测试使用隔离浏览器和开发样本拦截 API，不写入发布资料。

## 教室目录同步

```sh
npm run rooms:check
npm run rooms:sync
```

同步自动定位原站脚本、静态解析真实目录字段；无法识别或网络失败时保留原目录，不推测楼层。来源、差异检查和核实快照用法见 [目录同步说明](docs/room-directory-sync.md)。

## 历史归档更新

`public/data/archives` 保存版本明确的历史目录、课程表和官方附件链接。构建不依赖临时网络抓取；一次只加载当前目录或所选文档，完整正文直接在隔离的官方文档阅读区加载。网络不可用时仍可阅读已保存的表格。

```sh
npm run archives:sync
```

更新脚本沿用已核对的文档编号，最多同时读取 3 个官方文档。全部来源解析成功后才替换本机归档；记录的是采集时间，不能作为教务资料的更新时间。新增文档须先从官方目录核对编号与版本。

## 数据与许可

教学班评课社区索引的更新命令为 `npm run icourse:check` / `npm run icourse:sync`，默认读取本机参考项目快照；支持 `--source` 指定来源。详情与许可边界见 [评课链接维护](docs/icourse-links.md)。

公开资料来自 [官方教务目录](https://catalog.ustc.edu.cn/)，实际安排以 [综合教务系统](https://jw.ustc.edu.cn/) 为准。本站不提供账号、个人成绩、选课或教务写入功能，不发送 API Cookie，不引入统计追踪脚本。

MIT 许可证见 [LICENSE](LICENSE)，参考 CLI 的许可声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
