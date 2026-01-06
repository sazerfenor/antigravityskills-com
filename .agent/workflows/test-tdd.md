---
description: TDD 循环模式 - 严格 Red-Green-Refactor，适用于新功能开发
---

# TDD Test Command

严格 TDD 测试命令，执行 Red-Green-Refactor 循环。

**用法**: `/test-tdd {feature description}`

---

## 执行流程

1. Call /tdd-orchestrator 执行 6 阶段 TDD 流程
2. 强制 RED → GREEN → REFACTOR 顺序
3. 验证覆盖率阈值 (Line 80%, Branch 75%)

---

## 示例

```
/test-tdd 实现购物车总价计算函数
/test-tdd 创建用户注册表单验证
/test-tdd 添加 API 响应缓存功能
```
