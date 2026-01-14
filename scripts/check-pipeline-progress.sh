#!/bin/bash
# Pipeline 进度检查脚本

echo "============================================================"
echo "📊 Pipeline 进度检查"
echo "============================================================"
echo ""

# 1. 检查进程状态
if ps aux | grep prompt-pipeline | grep -v grep > /dev/null; then
    echo "✅ Pipeline 运行中"
else
    echo "❌ Pipeline 未运行"
fi

echo ""

# 2. 显示进度统计
echo "📈 进度统计:"
cat logs/pipeline-progress-prompts-input.json | jq '{
  total: (.prompts | keys | length),
  completed: [.prompts | to_entries[] | select(.value.step5_seo == "done")] | length,
  pending: [.prompts | to_entries[] | select(.value.step1_intent == "pending")] | length,
  errors: [.prompts | to_entries[] | select(.value.step1_intent == "error" or .value.step2_compile == "error" or .value.step3_generate == "error" or .value.step4_post == "error" or .value.step5_seo == "error")] | length
}' | jq -r '
"   总数: \(.total)
   ✅ 完成: \(.completed) (\((.completed * 100 / .total) | floor)%)
   ⏳ 待处理: \(.pending) (\((.pending * 100 / .total) | floor)%)
   ❌ 错误: \(.errors) (\((.errors * 100 / .total) | floor)%)"
'

echo ""

# 3. 显示最新日志
echo "📝 最新日志 (最近 15 行):"
ls -t logs/pipeline-run-*.log 2>/dev/null | head -1 | xargs tail -30 | grep -E "^\[|✅|❌" | tail -15 || echo "   无日志文件"

echo ""
echo "============================================================"
