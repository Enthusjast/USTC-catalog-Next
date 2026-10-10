# 真实接口与前端字段

生产基础地址为 `https://api.catalog.enthusjast.cc`，不附加原站的 `/api`。响应按原始 DTO 校验后转换为前端模型。示例字段来自 2026-10-09 的真实响应，后续变化由运行时 schema 检查识别。

| 路径 / 方法                                   | 已核对字段                                                                                                                                                     | 转换与边界                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/restricted` GET                             | `restricted: boolean`                                                                                                                                          | 受限时停止公开查询，提供官方系统入口                                           |
| `/teach/semester/list` GET                    | `id, code, nameZh, start, end, isLast`                                                                                                                         | ID 保存为字符串，按起始日期排序，默认选择 `isLast`                             |
| `/teach/department/college-tree` GET          | `id, code, nameZh, nameEn, children`                                                                                                                           | 保留层级；院系课程查询使用 ID，教学班筛选使用院系 code                         |
| `/teach/course/search` GET                    | `number, name, ename, valid, lastTerm, dept`                                                                                                                   | number 为课程编号；真实英文关键词查询已返回结果                                |
| `/teach/course/quality` GET                   | 院系名称到课程数组；课程含 `classify`                                                                                                                          | 从实际字段生成类别选项                                                         |
| `/teach/course/department/{id}` GET           | 类别到课程数组；`gradation, category, classify`                                                                                                                | 院系名来自已选院系；不自行生成课程类别                                         |
| `/teach/course/infos` POST                    | `code, name.cn/en, desc.cn/en, credit, hour, dept, valid, preq, examType, lang, ref, courseCategory, courseClassify`                                           | body `codes` 数组；HTML 说明转纯文本，未提供字段不推算；收藏可批量读取         |
| `/teach/program/tree` GET                     | 院系 → majors → programs；计划含 `id, nameZh, grade, trainType`                                                                                                | 年级和培养类型来自树；与历史静态集合分别展示                                   |
| `/teach/program/info/{id}` GET                | `grade, trainType, department, major, requiredCredits, beginSemester, moduleTree`                                                                              | 总要求不通过课程列表重复加总                                                   |
| `/teach/course-module/info/{id}` GET          | `self.id/type/public/courses/remark/requiredCredits/requiredCourseNum/requiredSubModuleNum/creditsUpperLimit/courseNumUpperLimit, isLeaf, children`            | 展开公共引用；`public === id` 为自身定义；本地条目保留，循环和读取失败标未知   |
| `/teach/lesson/list-for-teach/{semester}` GET | `id, code, course.code/cn/en, credits, period, dateTimePlacePersonText.cn, stdCount, limitCount, openDepartment.code/cn, teacherAssignmentList` 与实际筛选字段 | 周次/星期/课节从原始文本解析，保留无法识别状态；按学期缓存和分页               |
| `/teach/lesson/infos` POST                    | 与课程详情相同的说明结构，code 为教学班号                                                                                                                      | body 包含 `codes` 与数值 semester；与学期列表安排分别标注来源                  |
| `/teach/exam/list/{semester}` GET             | `id, examDate, startTime, endTime, examRooms[].room, lesson.course, lesson.code, lesson.openDepartment`                                                        | HHMM 转分钟；日期不从课程或学期推算                                            |
| `/teach/general-exam/list/{semester}` GET     | `id, courseCode, courseName, examDate, startTime, endTime, room, dept`                                                                                         | 含时区日期提取明确日期；单考场 room 与课程考试数组结构分别适配                 |
| `/teach/timetable-public-all/{date}` GET      | `timetable` 六组：`lessons, tmpLessons, roomOccupies, exams, makeupExams, tmpExams`；记录含 `classroomName, buildingCode, courseName, start, end`              | 未定位/无时间为未知；增加未知记录组会触发 schema 错误。容量/校区仅在提供时显示 |
| `/teach/course-substitute-pool/list` GET      | `id, substituteCourses[], originalCourses[]`，课程含 `code, cn, en, credits`                                                                                   | 保留组合；不推导传递资格                                                       |

`/teach/course/public/{id}` 是通修门类集合接口，不按课程编号读取详情。响应可以是课程数组或按课程层次分组的对象；数学类为 ID 43，原站页面路径为 `/catalog/ma`。本站保留对象的分组名称，组合门类分别读取实际 ID 并展示各来源缓存状态；门类映射见 `src/domain/courseCatalog.ts`。`/teach/course/quality` 对应综合素质类，不能当作数学、物理等基础门类。课程详情统一使用已经核对的 infos POST。

历史正文 `/data/program/cn/{code}.html` 是原站静态资料，不能映射到镜像 API 前缀。本站归档表格从同域 JSON 读取，正文阅读区使用官方 UTF-8 页面入口；所有 JSON、文本、表格单元格与官方链接分别处理，不将 API HTML 插入页面。

查询时间由浏览器成功读取时生成；归档采集时间独立保存。没有可信的源更新时间字段时不展示推算的“数据更新时间”。

## 教室目录与占用详情（2026-10-10）

单日占用继续沿用 `/teach/timetable-public-all/{date}` 和五分钟缓存，不增加接口。真实响应中，教学班还提供 `teachers: string[]` 和 `courseId`，临时安排提供 `applierName`、`sponsorName`；适配器只在字段实际存在且类型可识别时保留公开详情，文本转为纯文本。`courseId` 显示为“课程标识”，不推导详情链接。缺少这些字段的旧缓存仍可展示标题、地点与时刻。

房间库存与楼层来自原站当天可见目录，共 258 间、45 个楼栋与楼层组合，来源与核对日期保存在 `src/domain/roomDirectory.ts`。楼层只使用目录的明确字段，不从教室编号推测。占用先按楼栋与房间编号/名称精确匹配；缺少楼栋时只接受唯一匹配，未匹配地点保留在相应楼栋的“楼层未确认”组，缺少教室的记录保留全局计数。目录无记录教室始终为覆盖未知。

使用类型筛选只控制图中的记录，教室名单与综合状态不受它影响。查询失败、当天无记录和过期缓存分别显示；没有记录不代表空闲。教室分页已取消，旧 `page` 参数忽略。

单日视图固定展示原站早课至晚课的完整教学日，内部范围为 07:50–21:55，绘图区高 360px。时间输入、小时刻度和主视图时间范围摘要已移除；旧 `from`、`to` 参数忽略，日期和其他筛选继续生效。新增的楼栋分组仅组织前端目录，不改变 API 或缓存结构。未知时刻和完全位于显示范围外的记录由教室标题旁图标及无障碍名称提示，完整记录继续从教室编号打开。
