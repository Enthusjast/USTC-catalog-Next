# 教室目录维护

目录保留公开房间编号、名称、楼栋及明确楼层。实际使用可见规则为 `enabled && (canBorrow || arrangeSchedule)`；楼层不由编号推断。

- `npm run rooms:check`：从原站页面定位应用脚本，以 TypeScript AST 读取字面量目录并输出新增、移除和字段变化；无差异退出 0，有差异退出 1，读取或校验失败退出 2。
- `npm run rooms:sync`：在完整读取和校验后原子更新目录与来源信息；核对 diff 后再提交。
- 不支持的表达式不会执行。多份不一致目录、重复标识、无效字段或自动抽取数量明显减少均拒绝更新。
- 原站不可访问时保留已有目录。可用 `--capture /absolute/path/snapshot.json` 检查经人工核实的快照；快照包含 `rooms`（与 `RoomDirectoryEntry` 相同）及 `source.url`、`source.bundle`、`source.verifiedAt`。`url` 必须为原站教室页；日期使用真实核对日期。

核实日期和脚本地址保存在 `roomDirectorySource`；第三教学楼的展示分组与 API 原始楼栋编号继续分别处理。目录更新不意味着公共使用记录覆盖完整，也不表示预约或进入资格。
