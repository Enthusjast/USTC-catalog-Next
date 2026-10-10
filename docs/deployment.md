# 部署与真实接口验收

2026-10-10 本轮开发版本已发布到 https://catalog.enthusjast.cc。Pages 发布源为 GitHub Actions（`build_type=workflow`），自定义域和 HTTPS 已启用；[发布工作流](https://github.com/Enthusjast/USTC-catalog-Next/actions/runs/38031772381)的构建、API 检查与部署全部成功。正式 Origin 的 GET/JSON POST、精确 CORS、JSON 404 和未授权来源拒绝均通过；正式站 14 个页面在四种宽度下共 56 项检查通过，分享链接刷新通过，详见 [验证记录](verification.md)。

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
4. 核对 `/teach/lesson/infos` 的 OPTIONS/POST，body 为 `{"codes":["022063.01"],"semester":461}`。教学班详情已调用此接口；说明与学期列表中的安排分别标注来源。
5. 未知 API 路径应为 JSON 404。确认 HTML/空响应不会渲染为空列表。
6. 如需本地开发访问，由 API 服务加入 localhost 与 127.0.0.1 的明确来源；修改来源后重查 POST 预检。

工作流在发布前执行 `npm run check:api`；它检查 HTTP、schema、精确生产 Origin、两种 POST 预检、未知路径 JSON 404 与错误响应 CORS，并检查未授权 Origin 的 GET/OPTIONS 不获准跨域读取，将结果写入 Actions 摘要。HTTP 检查不会替代上述正式页面浏览器验收，运行环境的网络失败也会阻止发布，需要结合浏览器记录诊断。

## API 服务器配置与复查

服务代码在用户的服务器上，由用户修改。本次修改已通过原来的两项检查：

| 项目                                     | 修改前响应                       | 复查结果                                                                              |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| 允许的 Origin                            | `Access-Control-Allow-Origin: *` | 已返回 `Access-Control-Allow-Origin: https://catalog.enthusjast.cc` 与 `Vary: Origin` |
| 未知路径 `/__catalog_explorer_unknown__` | `200`、`text/html`、SPA 页面     | 已返回 JSON 404 与 `{"error":"not_found"}`；正式页面可跨域读取                        |

### CORS

- 生产白名单加入 `https://catalog.enthusjast.cc`，值不带路径或结尾斜杠。
- 如需直连本地开发，分别加入 `http://localhost:5173` 和 `http://127.0.0.1:5173`；其他端口也需明确加入。
- 匹配白名单后返回该请求的 Origin，并添加 `Vary: Origin`，避免缓存混用不同来源的响应。不要直接回显任意来源，不要返回用逗号分隔的多个 Origin。
- 对 `/teach/course/infos`、`/teach/lesson/infos` 的 OPTIONS 预检返回 `204`，允许方法包含 `GET, POST, OPTIONS`，允许请求头包含 `Content-Type`。
- 实际 GET/POST 和错误响应也需要相同的 CORS 策略；浏览器需能读取 JSON 错误。本站请求不携带 Cookie，无需开启 `Access-Control-Allow-Credentials`。
- 未授权来源不授予跨域读取权限，例如不返回 `Access-Control-Allow-Origin`；不能返回 `*` 或反射该来源。

### JSON 404

API 域名的未知路由不能进入前端的 `index.html` 回退。请检查应用兜底路由、反向代理或重写配置，把该域名的未匹配路径返回为 JSON 404。镜像接口路径不带 `/api` 前缀；例如学期列表是 `/teach/semester/list`。

### 修改后的快速检查

```sh
curl -i 'https://api.catalog.enthusjast.cc/teach/semester/list' \
  -H 'Origin: https://catalog.enthusjast.cc'

curl -i -X OPTIONS 'https://api.catalog.enthusjast.cc/teach/course/infos' \
  -H 'Origin: https://catalog.enthusjast.cc' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'

curl -i 'https://api.catalog.enthusjast.cc/teach/course/infos' \
  -H 'Origin: https://catalog.enthusjast.cc' \
  -H 'Content-Type: application/json' \
  --data '{"codes":["MATH1006"]}'

curl -i 'https://api.catalog.enthusjast.cc/__catalog_explorer_unknown__' \
  -H 'Origin: https://catalog.enthusjast.cc'

curl -i 'https://api.catalog.enthusjast.cc/restricted' \
  -H 'Origin: https://unapproved.example'
```

前四项分别应返回 JSON 200、正确预检、JSON 200、JSON 404，并允许精确生产 Origin；最后一项不得允许示例中的未授权来源。教学班 POST 还需使用上文的路径与请求体检查。以上命令核对 HTTP 响应，最终仍需从正式站点页面完成浏览器读取验收。

### 已修复的发布检查问题

此前合法请求在 `User-Agent: node` 下返回 JSON 404；最新复查已恢复 Node GET 与两种 JSON POST 的正常 200/schema 响应。此前未授权来源的 OPTIONS 超时，现已及时返回不带允许来源头的 403。以下命令可复查这两项，预期分别是 JSON 200 和 403：

```sh
curl -i 'https://api.catalog.enthusjast.cc/restricted' \
  -H 'Origin: https://catalog.enthusjast.cc' \
  -H 'User-Agent: node'

curl -i --max-time 10 -X OPTIONS \
  'https://api.catalog.enthusjast.cc/teach/course/infos' \
  -H 'Origin: https://unapproved.example' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

未授权来源的 GET 不返回允许来源头，浏览器无法读取；两种 JSON POST 在浏览器中均及时被拒绝。生产来源的 OPTIONS 返回正确的 204。发布脚本已覆盖并通过这些条件。

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
