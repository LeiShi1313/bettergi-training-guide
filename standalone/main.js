import { readTrainingGuideSnapshot } from "./guide-reader/index.js";

try {
  const { collection, preview } = await readTrainingGuideSnapshot();
  log.Info(
    "提升指南读取完成：{0} 个角色；下游可用={1}；结果已保存到 collection.json 和 preview.json",
    collection.characters.length,
    preview.actionable === true
  );
} catch (error) {
  log.Error("提升指南只读脚本失败：{0}", String(error && error.message ? error.message : error));
  throw error;
}
