# A/B 测试对比报告

**测试日期**: 2026-01-13
**测试用例数**: 3
**对比版本**: Baseline vs Optimized (V1.0)

---

## 执行摘要

⚠️ **结论**: Baseline 和 Optimized 产生的结果有差异，需要人工审查。

### 快速统计

| 指标 | Baseline | Optimized | 差异 |
|------|----------|-----------|------|
| 平均执行时间 | 43.86s | 46.90s | +6.94% |
| 平均 Prompt 长度 | 844 | 833 | -1.30% |

---

## 用例 1: 超短内容

**Test Case ID**: `test_case_1_short`

### 阶段一: Intent Analyzer

**字段对比**:

⚠️ 字段有变化：+2 -2 ~2

**新增字段** (2):
- `fur_color_pattern`
- `cat_activity`

**删除字段** (2):
- `fur_pattern`
- `cat_action`

**字段类型或默认值改变** (2):
- `cat_expression`
- `environment`

---

### 阶段三: Compiler

**Prompt 长度对比**:

| 版本 | 长度 |
|------|------|
| Baseline | 464 字符 |
| Optimized | 489 字符 |
| 差异 | +5.39% (+25) |

**关键词重复分析**:

✅ Optimized 重复更少（-4）

| 关键词 | Baseline 出现次数 | Optimized 出现次数 |
|--------|-------------------|-------------------|
| with | 2 | 2 |
| coat | 2 | 0 |
| soft | 2 | 0 |

**Baseline Prompt**:
```
A professional photography capture of a domestic shorthair with a solid coat, sitting quietly in the soft atmosphere of a cozy living room. The cat's cute expression is rendered with clarity, its eyes meeting the lens from an eye level perspective that creates an intimate, engaging connection. Natural daylight illuminates the scene, highlighting the fine texture of the coat, while the 3 ensures the surrounding home environment recedes into a soft, creamy bokeh
```

**Optimized Prompt**:
```
A photography of a Domestic Shorthair with a vibrant Orange Tabby coat, looking at camera with a cute and curious gaze. The cat is perched comfortably on a sunny windowsill as natural daylight pours in, highlighting the soft textures of its fur and creating a warm, inviting atmosphere. Captured at an eye level perspective, the composition utilizes a 3 setting to gently blur the background, ensuring the viewer's attention remains fixed on the cat's expressive face and delicate whiskers
```

---

### 性能对比

| 阶段 | Baseline | Optimized | 差异 |
|------|----------|-----------|------|
| Stage 1 (Intent) | 29.29s | 23.16s | -20.95% |
| Stage 2 (PLO Build) | 0.00s | 0.00s | - |
| Stage 3 (Compiler) | 11.95s | 9.06s | -24.14% |
| **总计** | **41.24s** | **32.22s** | **-21.88%** |

---

## 用例 2: 超长 Prompt

**Test Case ID**: `test_case_2_long`

### 阶段一: Intent Analyzer

**字段对比**:

⚠️ 字段有变化：+2 -1 ~7

**新增字段** (2):
- `background_details`
- `photography_framing`

**删除字段** (1):
- `background_theme`

**字段类型或默认值改变** (7):
- `exposure_compensation`
- `outfit_top`
- `outfit_bottom`
- `hairstyle`
- `color_palette`
- `depth_of_field`
- `lighting_style`

---

### 阶段三: Compiler

**Prompt 长度对比**:

| 版本 | 长度 |
|------|------|
| Baseline | 1431 字符 |
| Optimized | 1278 字符 |
| 差异 | -10.69% (-153) |

**关键词重复分析**:

✅ Optimized 重复更少（-10）

| 关键词 | Baseline 出现次数 | Optimized 出现次数 |
|--------|-------------------|-------------------|
| blue | 8 | 9 |
| with | 7 | 6 |
| otaku | 3 | 3 |
| style | 3 | 4 |
| while | 3 | 0 |
| desk | 3 | 3 |
| mirror | 2 | 2 |
| selfie | 2 | 2 |
| from | 2 | 0 |
| high | 2 | 0 |
| knit | 2 | 0 |
| this | 2 | 0 |
| featuring | 2 | 0 |
| provides | 2 | 0 |
| composition | 0 | 2 |
| waist | 0 | 2 |

**Baseline Prompt**:
```
An Otaku-style Mirror Selfie captures a 25-year-old East Asian woman from a high angle, her reflection framed within the curated sanctuary of her bedroom. She is styled in a light blue cropped knit cardigan with only the top two buttons fastened, allowing a blue French-style bra to be faintly visible beneath the knit. This is paired with denim ultra-short shorts featuring blue satin ribbon bows on the hips, while her waist-length straight medium brown hair falls in elegant lines with slightly curled ends. 

The otaku computer corner behind her provides a rich narrative of her interests, featuring a white desk topped with a monitor with blue wallpaper, a mechanical keyboard, and a blue desk mat. A PC tower with blue lighting glows softly near a collection of anime figures, a pagoda poster, and a whimsical cat-shaped desk lamp. The entire scene adheres to a strict shades of blue aesthetic, incorporating baby blue and periwinkle while ensuring no pink or magenta disrupts the theme. 

The image is captured with the naturalism of a smartphone, utilizing a 26mm perspective and an f/1.8 that provides a 10 to keep the subject and her environment in meaningful focus. Soft diffused daylight at 5200K filters through sheer curtains from a window to the left, while a slight -0.3 adds a touch of moody realism to this Y2K-adjacent composition. The final shot stands as an authentic, high-confidence Otaku-style Mirror Selfie
```

**Optimized Prompt**:
```
A Blue Otaku-Style Mirror Selfie captures a 25-year-old East Asian woman with natural proportions, framing her from a high angle in a mid-thigh to head composition. She is styled in a light blue cropped knit cardigan with only the top two buttons fastened, allowing a blue French-style bra to be faintly visible, paired with denim ultra-short shorts accented by blue satin ribbon bows at the hips. Her waist-length straight medium brown hair falls smoothly, ending in slightly curled ends that rest against her waist. 

The reflection reveals a meticulously detailed otaku-style computer corner drenched in a cohesive blue tones aesthetic. A white desk serves as the foundation for a monitor with blue wallpaper, a mechanical keyboard, and a blue desk mat. To the side, a PC tower with blue lighting illuminates a curated collection of anime figures, while a pagoda poster and a cat-shaped desk lamp decorate the walls and surface. A glass of water and a green leafy plant provide a touch of lived-in realism to the space. 

The photograph is captured with a 26mm lens at f/1.8 under soft diffused daylight, utilizing an -0.3EV and a 8 to maintain clarity across the subject and her environment. This atmospheric composition stands as an authentic Blue Otaku-Style Mirror Selfie
```

---

### 性能对比

| 阶段 | Baseline | Optimized | 差异 |
|------|----------|-----------|------|
| Stage 1 (Intent) | 36.99s | 32.11s | -13.19% |
| Stage 2 (PLO Build) | 0.00s | 0.00s | - |
| Stage 3 (Compiler) | 12.81s | 14.62s | 14.14% |
| **总计** | **49.80s** | **46.73s** | **-6.16%** |

---

## 用例 3: 带图片的测试用例（冲突检测）

**Test Case ID**: `test_case_3_image`

### 阶段一: Intent Analyzer

**字段对比**:

⚠️ 字段有变化：+5 -3 ~2

**新增字段** (5):
- `hair_and_beard`
- `color_palette`
- `background_env`
- `mood`
- `composition`

**删除字段** (3):
- `color_scheme`
- `outfit_style`
- `film_grain_intensity`

**字段类型或默认值改变** (2):
- `subject_identity`
- `lighting_style`

---

### 阶段三: Compiler

**Prompt 长度对比**:

| 版本 | 长度 |
|------|------|
| Baseline | 636 字符 |
| Optimized | 731 字符 |
| 差异 | +14.94% (+95) |

**关键词重复分析**:

✅ 重复关键词数量一致

| 关键词 | Baseline 出现次数 | Optimized 出现次数 |
|--------|-------------------|-------------------|
| with | 3 | 3 |
| cinematic | 2 | 2 |
| black | 2 | 0 |
| lighting | 2 | 0 |
| while | 2 | 0 |
| facial | 0 | 2 |
| subject | 0 | 2 |
| hair | 0 | 2 |

**Baseline Prompt**:
```
A cinematic black and white portrait of a bearded Western woman with blonde hair, adopting the composition, lighting, and urban night background from the provided image. Clad in a black trench coat, she stands amidst the city shadows as cinematic side-lighting carves her profile with high-contrast drama. The eye level perspective captures her expression with a 0.8 fidelity, while a 3 dissolves the distant street lamps into a soft, glowing bokeh. A subtle 0.4 permeates the frame, grounding the photography in a gritty, filmic aesthetic that preserves the mood of the original reference while transforming the identity of the subject
```

**Optimized Prompt**:
```
A close-up portrait captured at eye level preserving the facial structure and composition from the provided photo, reimagining the subject as a Western woman with long blonde hair and a beard. Her expression is deeply contemplative, maintaining a 0.8 structural likeness to the source while fully adopting her new identity. Set against the shimmering backdrop of an urban night street with bokeh, the scene is illuminated by cinematic side lighting that carves out the textures of her hair and facial features. The entire frame is rendered in a rich black and white monochrome, where a 3 creates a soft separation between the subject and the glowing city lights, evoking a timeless cinematic quality with a fine layer of film grain
```

---

### 性能对比

| 阶段 | Baseline | Optimized | 差异 |
|------|----------|-----------|------|
| Stage 1 (Intent) | 31.74s | 49.95s | 57.39% |
| Stage 2 (PLO Build) | 0.00s | 0.00s | - |
| Stage 3 (Compiler) | 8.79s | 11.80s | 34.28% |
| **总计** | **40.52s** | **61.75s** | **52.38%** |

---

## 附录: 完整数据

完整的测试结果 JSON 文件位于:
`tests/prompts/ab-testing/results/ab-test-2026-01-13.json`

---

**报告生成时间**: 2026-01-13T21:43:23.938Z
