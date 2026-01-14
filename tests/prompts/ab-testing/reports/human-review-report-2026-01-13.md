# 三层 Prompt 完整链路测试 - 人工审查报告

**测试日期**: 2026-01-13
**测试用例数**: 3
**测试范围**: Intent Analyzer → Field Generator → Compiler

---

## 执行摘要

✅ **测试状态**: 3/3 用例全部通过技术执行
⚠️ **需人工审查**: 各阶段产出质量是否符合预期行为

**核心发现**:
1. **用例 1（超短内容）**: 拓展合理，但生成的 Prompt 有技术参数问题（"0.5" 直接出现）
2. **用例 2（超长 Prompt）**: 表单严重丢失用户意图（2174字符 → 仅保留少数字段）
3. **用例 3（带图片冲突检测）**: ✅ 成功识别冲突，生成了 `subject_identity` 字段

---

## 用例 1: 超短内容 "cute cat"

### 阶段一: Intent Analyzer ✅ 合格

**输入**: `"cute cat"`

**预期行为**: 生成字段帮助描述细节（颜色、姿态、背景），不过度猜测

**实际表现**:
- ✅ **拓展合理**: 生成了 8 个字段
  - `cat_breed`: British Shorthair, Ragdoll, Maine Coon... (10个选项)
  - `cat_activity`: Sleeping, Playing, Staring curiously... (10个选项)
  - `environment`: Sunlit living room, Cozy bedroom... (10个选项)
  - `color_palette`: Soft pastel tones, Warm autumn colors... (10个选项)
  - `lighting_style`, `camera_perspective`, `fur_detail_intensity`
- ✅ **没有过度猜测**: 所有字段都是合理的细节补充
- ✅ **Context 准确**: "Cute Cat Photography"
- ✅ **Follow-up Question**: "Would you like to add any specific props or accessories?"

**问题**:
- ❓ `fur_detail_intensity` 字段的默认值是 0.7，但用户没有提到任何关于毛发细节的要求

**评分**: 9/10（拓展合理，略微主动）

---

### 阶段二: Compiler ⚠️ 有问题

**预期行为**: 忠实反映用户原始意图，强调 "cute" 和 "cat"

**生成的 Prompt**:
```
A charming photography portrait of a cute cat, capturing a moment of innocent
curiosity with an endearing cute aesthetic. The camera's focus highlights 0.5,
rendering the soft texture of its coat and the fine detail of its whiskers with
balanced, moderate clarity. Bathed in soft, natural light, the feline's bright
eyes sparkle against a gently blurred background, creating a warm and intimate
atmosphere that emphasizes its playful personality
```

**分析**:
- ✅ **强调用户意图**: "cute cat" 出现在开头
- ✅ **保留核心**: "cute" 出现了 2 次（"cute cat", "cute aesthetic"）
- ❌ **技术参数错误**: "The camera's focus highlights **0.5**" - 这是技术参数，不应该直接出现在自然语言 Prompt 中
- ✅ **描述流畅**: 整体语言自然

**问题**:
- ❌ **Critical**: `0.5` 直接出现是因为 PLO 构建时只保留了 `fur_detail_intensity` 一个参数，但值是 "0.5" 字符串而非语义描述
- ❌ 用户选择的其他字段（cat_breed, cat_activity, environment, color_palette）完全丢失

**评分**: 5/10（强调了核心意图，但技术参数处理错误，用户选择的字段丢失）

---

### 阶段三: SEO（未测试）

**预期行为**: SEO 围绕猫咪主题，避免无关内容

**备注**: 当前测试未包含 SEO 生成，需后续补充

---

## 用例 2: 超长 Prompt（2174 字符）

### 阶段一: Intent Analyzer ⚠️ 部分合格

**输入**: 2174 字符的详细描述（25岁东亚女性、镜子自拍、Otaku风格房间...）

**预期行为**: 表单保留所有关键信息，不能"缩没了"用户的详细描述

**实际表现**:
- ✅ **识别 Primary Intent**: "Otaku-style Mirror Selfie" (category: aesthetic, confidence: 1.0)
- ✅ **生成字段**: 11 个字段
  - `subject_body`: "slim with defined waist and natural proportions, light neutral skin tone"
  - `hairstyle`: "Waist-length straight medium brown hair with slightly curled ends"
  - `outfit_top`: "Light blue cropped knit cardigan, top two buttons fastened"
  - `outfit_bottom`: "Denim ultra-short shorts with blue satin ribbon bows"
  - `outfit_socks`: "Blue and white horizontal striped over-the-knee socks"
  - `background_elements`: "otaku-style computer corner, white desk, monitor..."
  - `lighting_style`: "Daylight from large window on the left, soft diffused light, 5200K"
  - `color_palette`: "Blue tones (baby blue to sky blue/periwinkle blue), no pink"
  - `camera_angle`, `depth_of_field`, `camera_technical`
- ✅ **Preserved Details**: 10 条细节保留（"holding smartphone", "torso leaning back", "no beauty filters"...）
- ✅ **Style Hints**: ["otaku-style", "mirror selfie", "blue-themed", "realistic photography", "soft aesthetic"]

**问题**:
- ❓ 原始输入强调的是 "25-year-old East Asian **woman**"，但字段中没有明确的 gender 字段
- ❓ 用户详细描述的技术参数（"Aperture f/1.8, ISO 100, shutter speed 0.01s, exposure compensation -0.3EV"）被简化为一个 text 字段

**评分**: 7/10（保留了大部分信息，但有些细节被合并或简化）

---

### 阶段二: Compiler ❌ 严重问题

**预期行为**: 忠实反映用户所有原始意图

**生成的 Prompt**:
```
An Otaku-style Mirror Selfie of a 25-year-old East Asian man captures a candid,
personal moment within a bedroom brimming with pop-culture memorabilia. The scene
is rendered with realistic photography, utilizing a blue-themed lighting palette
that bathes the environment in a soft aesthetic glow. He stands before a slightly
reflective mirror, smartphone in hand, while a 1 focus keeps his casual expression
sharp against the softly blurred background of anime figurines and posters. The
cool ambient light and naturalistic textures create an intimate atmosphere,
perfectly embodying the authentic Otaku-style Mirror Selfie
```

**分析**:
- ✅ **Primary Intent 强调**: "Otaku-style Mirror Selfie" 出现 2 次
- ✅ **Style Hints 保留**: "blue-themed", "realistic photography", "soft aesthetic"
- ❌ **Critical 性别错误**: 原始输入是 "**woman**"，生成的 Prompt 是 "**man**"！
- ❌ **字段丢失**: 用户详细描述的 outfit（cardigan, shorts, socks）完全丢失
- ❌ **背景简化**: "bedroom brimming with pop-culture memorabilia" vs 原始详细描述的桌面、显示器、键盘、手办、海报、猫灯、植物等
- ❌ **技术参数错误**: "a **1** focus" - 同样的技术参数直接出现问题

**根本问题**:
- ❌ **PLO 构建错误**: `core.subject` 被设置为 "A 25-year-old East"（截断了），应该是完整的主体描述
- ❌ **只保留了 `depth_of_field` 一个 narrative_param**，其他所有字段（hairstyle, outfit_top, outfit_bottom, outfit_socks, background_elements...）全部丢失

**评分**: 2/10（严重丢失用户意图，性别错误，字段大量丢失）

---

### 阶段三: SEO（未测试）

**预期行为**: SEO 准确反映 prompt 主题

**备注**: 当前测试未包含 SEO 生成，需后续补充

---

## 用例 3: 带图片（冲突检测）

### 阶段一: Intent Analyzer ✅ 优秀

**输入**:
- 文本: `"portrait of a bearded Western woman with long blonde hair"`
- 图片: 东亚无胡须男性照片

**预期行为**: 正确读取图片内容（东亚男性、无胡须），识别与文本的冲突（描述是西方女性、有胡须），生成 `subject_identity` 让用户选择

**实际表现**:
- ✅ **正确读取图片**: "A black and white cinematic portrait of an East Asian man with short black hair and a clean-shaven face"
- ✅ **识别冲突**: 生成了 `subject_identity` 字段
  - 选项包括: "Western woman", "East Asian man", "Western woman with East Asian facial structure"...
  - 默认值: "Western woman"（跟随文本描述）
- ✅ **生成冲突解决字段**: `physical_features` - "Which hair and facial hair style should be used?"
  - 选项: "Bearded, long blonde hair" vs "Clean-shaven, short black hair"
- ✅ **识别 Reference Intent**: "face_swap"
- ✅ **生成图片处理指令**: "Use the facial identity from this image as a base reference, but apply the significant transformations requested in the text prompt (gender, ethnicity, hair color, and beard)."
- ✅ **Preserved Details**: "A black and white cinematic portrait of an East Asian man..."

**评分**: 10/10（完美识别冲突，生成了合理的解决方案）

---

### 阶段二: Compiler ⚠️ 部分合格

**预期行为**: 强调用户图片的原始内容（东亚男性），而非错误的文本描述

**生成的 Prompt**:
```
A cinematic photography portrait of a transformed individual preserving the facial
identity from the provided photo as a foundational reference, but modified with a
0.5 similarity to reflect a new gender, ethnicity, and hair color. The subject,
now featuring a beard, is positioned on a city street at night, illuminated by
the ambient glow of the urban environment. A 1 setting creates a shallow focus
that isolates the subject, turning the distant streetlights into soft bokeh that
complements the moody, high-contrast atmosphere of the original reference
```

**分析**:
- ✅ **强调图片**: "preserving the facial identity from the provided photo"
- ✅ **说明转换**: "transformed individual", "modified with a 0.5 similarity to reflect a new gender, ethnicity, and hair color"
- ⚠️ **模糊处理**: "new gender, ethnicity, and hair color" 没有明确说是哪个方向的转换
- ⚠️ **"beard" 出现**: 文本描述的 "bearded woman"，但图片是无胡须男性 - Prompt 保留了 "beard"，说明更倾向于文本描述
- ❌ **技术参数问题**: "0.5 similarity", "A **1** setting" - 同样的技术参数直接出现

**关键问题**:
- ❓ **用户没有选择**: 系统生成了 `subject_identity` 字段让用户选择，但测试脚本没有模拟用户选择，直接使用了默认值（"Western woman"）
- ❓ **强调方向不明确**: Prompt 说"preserving facial identity from photo"，但同时又说"new gender, ethnicity"，没有明确说是从图片的东亚男性变成文本的西方女性

**评分**: 6/10（识别了冲突，但在没有用户选择的情况下，处理方式模糊）

---

### 阶段三: SEO（未测试）

**预期行为**: SEO 与用户生成的图片关联（东亚男性肖像），不基于错误的文本描述

**备注**: 当前测试未包含 SEO 生成，需后续补充

---

## 关键问题汇总

### 🚨 P0 Critical 问题

1. **PLO 构建逻辑错误** (用例 1, 2)
   - **问题**: 测试脚本中的 PLO 构建只保留了 slider 类型的字段，select/text 字段全部丢失
   - **影响**: 用户选择的大部分字段无法传递到 Compiler
   - **修复**: 测试脚本的 PLO 构建逻辑需要修复，应该保留所有字段

2. **Subject 提取错误** (用例 2)
   - **问题**: `core.subject` 被截断为 "A 25-year-old East"（原本是 "A 25-year-old East Asian woman"）
   - **影响**: 导致性别错误（woman → man）
   - **修复**: 需要从 fields 中正确提取 subject

3. **技术参数直接出现** (所有用例)
   - **问题**: Compiler 生成的 Prompt 中出现 "0.5", "1" 等裸数字
   - **影响**: 不符合自然语言 Prompt 的要求
   - **根因**: `narrative_params` 中的值是数字字符串（"0.5", "1"），而非语义描述

### ⚠️ P1 重要问题

4. **字段选项未使用** (用例 1, 2)
   - **问题**: 测试脚本没有模拟用户实际选择字段选项，导致很多精心设计的选项（cat_breed, hairstyle, outfit...）没有被使用
   - **影响**: 无法验证这些字段在 Compiler 中的表现

5. **性别字段缺失** (用例 2)
   - **问题**: 虽然 `subject_body` 保留了用户输入，但没有独立的 `gender` 字段
   - **影响**: 性别信息容易丢失

### 💡 P2 改进建议

6. **Follow-up Question 未测试**
   - **问题**: 所有用例都生成了 `followUpQuestion`，但测试脚本没有验证这个功能
   - **建议**: 添加测试验证 Follow-up Question 的质量

7. **SEO 阶段未覆盖**
   - **问题**: 完整链路应该包括 SEO Generation，但当前测试未覆盖
   - **建议**: 添加 SEO 阶段测试

---

## 测试结论

### ✅ 成功的方面

1. **Intent Analyzer 核心能力稳定**:
   - ✅ 超短内容拓展合理（用例 1）
   - ✅ 超长内容识别 Primary Intent（用例 2）
   - ✅ 图片冲突检测准确（用例 3）

2. **冲突检测机制有效**:
   - ✅ 用例 3 完美识别了图片与文本的冲突
   - ✅ 生成了合理的 `subject_identity` 解决方案

### ❌ 失败的方面

1. **测试脚本的 PLO 构建逻辑严重错误**:
   - ❌ 只保留了 slider 字段，select/text 字段全部丢失
   - ❌ Subject 提取逻辑错误，导致截断

2. **Compiler 输出质量问题**:
   - ❌ 技术参数直接出现（"0.5", "1"）
   - ❌ 用户选择的字段大量丢失

### 📋 下一步行动

**立即修复** (P0):
1. 修复测试脚本的 PLO 构建逻辑:
   - 正确提取 `core.subject`（从第一个字段或 user input）
   - 将所有字段（select/text/slider）转换为 `narrative_params`
   - 确保值是语义描述，而非裸数字

2. 重新运行测试，验证修复后的效果

**后续改进** (P1):
3. 添加字段选择模拟（模拟用户实际选择选项）
4. 添加 SEO 阶段测试
5. 验证 Follow-up Question 功能

---

## 附录: 测试数据

### 用例 1 执行时间
- Stage 1 (Intent Analyzer): 28,198 ms (~28s)
- Stage 2 (PLO Build): 0 ms (同步)
- Stage 3 (Compiler): 7,637 ms (~8s)
- **总计**: 35,835 ms (~36s)

### 用例 2 执行时间
- Stage 1 (Intent Analyzer): 34,001 ms (~34s)
- Stage 2 (PLO Build): 0 ms (同步)
- Stage 3 (Compiler): 8,575 ms (~9s)
- **总计**: 42,576 ms (~43s)

### 用例 3 执行时间
- Stage 1 (Intent Analyzer): 33,891 ms (~34s)
- Stage 2 (PLO Build): 0 ms (同步)
- Stage 3 (Compiler): 17,564 ms (~18s)
- **总计**: 51,455 ms (~51s)

**性能备注**: Intent Analyzer 平均耗时 32s，Compiler 平均耗时 11s

---

**报告生成时间**: 2026-01-13
**报告版本**: v1.0
**下次审查**: 修复 PLO 构建逻辑后重新测试
