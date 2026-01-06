---
description: 法务与人力资源文档工作流 - 隐私政策、合同模板、GDPR 合规
---

# HR & Legal Compliance Workflow

生成法务文档、隐私政策、雇佣合同及 GDPR 合规材料。

> **来源**: `hr-legal-compliance` 插件
> **推荐模型**: Sonnet (法务语言精确性)
> **⚠️ 免责声明**: 本工作流生成的内容仅供参考，不构成法律建议。请咨询专业法律顾问。

---

## 📚 Agent 与技能引用

### Agents (3 个)

| Agent | 完整知识文件 | 用途 |
|-------|-------------|------|
| **hr-pro** | [hr-pro.md](hr-legal/hr-pro.md) | 招聘、入职/离职、PTO、绩效管理 |
| **legal-advisor** | [legal-advisor.md](hr-legal/legal-advisor.md) | 隐私政策、ToS、Cookie 政策、DPA |
| **gdpr-data-handling** | [gdpr-data-handling.md](hr-legal/gdpr-data-handling.md) | GDPR 合规、Consent 管理、DSAR 处理 |

> 💡 **使用提示**：在开始相关阶段前，先阅读对应 Agent 文件以获取完整专家知识。

---

---

## 执行步骤

// turbo-all

### Phase 1: 确定文档类型与管辖区

1. 根据文档类型调用对应 Agent:
   - **人力资源文档** → Call /hr-pro
   - **法务合规文档** → Call /legal-advisor
   - **GDPR/数据隐私** → Call /gdpr-data-handling
2. 确认：
   - 文档类型 (隐私政策 / 雇佣合同 / ToS / Cookie 政策)
   - 管辖区 (EU/US/CN 等)
   - 公司规模与行业

### Phase 2: 生成文档

3. 根据文档类型调用对应 Agent：
   - **隐私/GDPR** → Call /gdpr-data-handling
   - **法务文档** → Call /legal-advisor
   - **人力资源** → Call /hr-pro
4. 生成初稿，包含 `{{Placeholder}}` 变量
5. 检查合规性清单

### Phase 3: 审查与交付

6. 输出格式化文档 (Markdown)
7. 附加实施清单
8. **提醒用户咨询专业法律顾问**

---

## 支持的文档类型

| 类别 | 文档 | 对应 Agent |
|-----|------|-----------|
| **人力资源** | Offer Letter | `hr-pro` |
| | 雇佣协议 | `hr-pro` |
| | 员工手册 | `hr-pro` |
| | PTO 政策 | `hr-pro` |
| | 绩效改进计划 (PIP) | `hr-pro` |
| **法务合规** | 隐私政策 | `legal-advisor` |
| | 使用条款 (ToS) | `legal-advisor` |
| | Cookie 政策 | `gdpr-data-handling` |
| | 数据处理协议 (DPA) | `gdpr-data-handling` |
| | GDPR Consent 表单 | `gdpr-data-handling` |

---

## 关键法规参考

| 法规 | 适用范围 | 关键要求 |
|-----|---------|---------|
| **GDPR** | 欧盟 | 72 小时泄露通知、30 天 DSAR 响应 |
| **CCPA/CPRA** | 加州 | 数据销售 Opt-out、隐私政策披露 |
| **LGPD** | 巴西 | 类似 GDPR 的本地化要求 |
| **COPPA** | 美国 | 13 岁以下儿童数据保护 |

---

## 相关文件

- Agents: `.agent/workflows/hr-legal/`

---

**Version**: 1.0 | **Created**: 2025-12-21 | **Source**: `hr-legal-compliance` plugin
