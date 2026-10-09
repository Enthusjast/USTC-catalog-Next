# 部署与真实接口验收

## 仓库部署设置

- Pages 发布源：GitHub Actions；允许 `github-pages` environment 从 main 部署。
- 自定义域名：`catalog.enthusjast.cc`；DNS 指向 `Enthusjast.github.io`。
- 等待证书签发并开启 Enforce HTTPS；不得覆盖 `api.catalog.enthusjast.cc` 的现有 API 记录。
- 确认主页实际 Origin 为 `https://catalog.enthusjast.cc`。
- 直接打开或刷新 `/#/courses?q=数学`、`/#/programs/3430`、`/#/lessons?semester=461`。

## 生产 API gate（部署后执行）

1. 在正式站点页面查询课程、计划、教学班、考试和教室。浏览器 Network 应显示直连 API，URL 不带 `/api` 前缀。
2. 确认 GET 的 CORS 响应允许精确生产 Origin；未授权 Origin 的拒绝符合预期。
3. 打开课程详情，确认 `/teach/course/infos` 的 OPTIONS 与 JSON POST 成功；允许 `POST`、`Content-Type`，响应为 JSON。请求体为 `{"codes":["MATH1006"]}`。
4. 核对 `/teach/lesson/infos` 的 OPTIONS/POST，body 为 `{"codes":["022063.01"],"semester":461}`。首版界面从学期集合获取教学班详情，因此该接口暂不用于页面。
5. 未知 API 路径应为 JSON 404。确认 HTML/空响应不会渲染为空列表。
6. 如需本地开发访问，由 API 服务加入 localhost 与 127.0.0.1 的明确来源；修改来源后重查 POST 预检。

## 数据语义验收

- 同一课程有效/历史状态可区分；课程目录不被视为学期必开课承诺。
- API 树与 2013 静态归档分别展示。对比仅按课程编号匹配，组合与重复模块成员保留。
- 同日同节且周次相交的候选教学班显示重叠；未知周次或课节显示无法判断。
- ICS 首周日期须手动确认；默认全天提醒明确说明课节，钟点模式显式选择课节表，非连续课节分别生成事件。
- 通识考试可使用单独 `room` 字段与含时区日期。缺少日期或时间不导出 ICS。
- 教室不存在记录时不得标为空闲；未定位记录造成覆盖不足。时段分析综合全部使用类型。
- 多门替代课程组合保持分组；不生成传递链资格。
- 查询时间与更新时间区分。网络失败的旧结果带过期标记；HTTP、JSON、schema 错误直接显示错误。
- 清除本机数据移除查询缓存、收藏、清单和主题偏好。

## 界面验收

- 375px、768px、1024px、1440px 下页面无整体横向溢出，密集课表使用自身滚动容器。
- 键盘可操作搜索建议、筛选、课程详情和模块，Escape 可关闭弹层，焦点返回入口。
- 加载、错误、无结果、受限和缓存状态可辨认，状态不只靠颜色。
- 深浅主题与 reduced-motion 可用。

## 开发时的接口观察

2026-10-09 通过 API 域名页面读取了学期、院系、课程搜索、通识/院系课程集合、培养计划树、计划详情、教学班、考试、教室、替代关系和课程/教学班 JSON POST 响应。**同源读取不能替代生产页面的跨域验收**；DNS、GitHub Pages、证书和浏览器 CORS gate 必须在部署后完成。
