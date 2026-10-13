# 教学班评课社区入口

列表和公开教学班详情共用一个外链入口。唯一匹配显示“评课社区”，其他情况显示“评课搜索”。详情也可从候选清单、周课表和对比打开。链接在新窗口访问社区，本站不请求社区接口。

## 匹配与来源

索引来源为 [RaymondzyLei/class-arrange](https://github.com/RaymondzyLei/class-arrange) 的 `icourse_spider/course_rating.json`，仅保留课程名称、教师和页面 ID。初次导入快照的对应提交为 `4de5d04`（2026-07-04），导入日期为 2026-10-11；导入日期不代表社区资料更新时间。源文件 SHA-256 和记录数量写在生成文件的 `icourseSource` 中。

名称及教师去除首尾空白；完整教师名单去重并排序，其余文字和标点保持原义。重复的同一页面 ID 合并，不同页面 ID 对应同一组合时整组使用搜索。未知教师、名单不完整、改名、不同教师或索引加载失败均回退搜索，不通过教学班号推测跨学期关系。

初次快照有 18,635 条记录：16,238 组唯一对应、12 组歧义、2,373 条缺少教师。无评分记录仍能对应已有页面。索引使用课程名、教师及教师组合字典和数字引用压缩，按需加载后只解码一次。16,238 组事实在压缩前后逐项一致；生产 JS 从 918.73 KB 降为 558.06 KB（缩小约 39%），紧凑 JSON 从 1,007,342 字节降为 574,891 字节（约 43%）。索引独立动态加载并纳入应用预缓存，链接生成支持离线；访问外部社区本身仍需要网络。

## 更新

使用 Node.js 24，默认读取 `~/reference/class-arrange/icourse_spider/course_rating.json`：

```sh
pnpm run icourse:check
pnpm run icourse:sync
```

也可指定同格式快照：

```sh
pnpm run icourse:check --source /absolute/path/course_rating.json
pnpm run icourse:sync --source /absolute/path/course_rating.json
```

检查比较源文件哈希、字典结构与完整解码的匹配结果；同步验证完整快照后原子替换生成文件。重复同步保留原导入日期。读取、解析或字段验证失败时原索引保持不变。同步不联网抓取评分，构建与 CI 使用已经提交的索引，不依赖本机参考仓库。

独立编写的匹配逻辑及脚本遵循本项目许可；快照事实的来源与参考项目许可条款见 [第三方说明](../THIRD_PARTY_NOTICES.md)。
