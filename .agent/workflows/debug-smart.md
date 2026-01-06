---
description: 完整 10 步调试流程 - AI 辅助根因分析、假设生成、Production-Safe 技术
---

# Smart Debug Command

智能调试命令，执行完整的 10 步调试方法论。

**用法**: `/debug-smart {error description}`

---

## 执行流程

1. Call /debugger 执行 10 步诊断
2. 如需日志分析 → Call /error-detective
3. 如需 Sentry 集成 → Call /error-tracking

---

## 示例

```
/debug-smart API 返回 500 错误，日志显示 "Connection refused"
/debug-smart 用户点击登录后页面卡住，控制台无报错
/debug-smart 测试间歇性失败，本地通过但 CI 失败
```
