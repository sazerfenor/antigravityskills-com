// 标准化测试数据
export const TEST_INPUTS = {
  cameraLightingTrigger: "一张专业人像照片",
  cameraLightingSkip: "PPT 模板，商务风",
  textIntegrationTrigger: "海报，标题'限时促销'",
  knowledgeEnhancementTrigger: "科学信息图，展示细胞结构",
  characterRolesTrigger: "两人合照",
};

export const MOCK_FACE_IMAGES = [
  { mimeType: 'image/png' as const, data: 'base64_face_1_placeholder' },
  { mimeType: 'image/png' as const, data: 'base64_face_2_placeholder' },
];

// 比例提取测试数据
export const RATIO_TEST_CASES = {
  standard: [
    { input: "16:9 的海报", expected: { extractedRatio: "16:9", mappedRatio: "16:9", wasRemapped: false } },
    { input: "生成一张 4:3 的图片", expected: { extractedRatio: "4:3", mappedRatio: "4:3", wasRemapped: false } },
    { input: "1:1 正方形", expected: { extractedRatio: "1:1", mappedRatio: "1:1", wasRemapped: false } },
  ],
  chinese: [
    { input: "横版壁纸", expected: { extractedRatio: "16:9", mappedRatio: "16:9", wasRemapped: false } },
    { input: "竖版海报", expected: { extractedRatio: "9:16", mappedRatio: "9:16", wasRemapped: false } },
    { input: "方形头像", expected: { extractedRatio: "1:1", mappedRatio: "1:1", wasRemapped: false } },
  ],
  noRatio: [
    { input: "一只可爱的猫", expected: { extractedRatio: null, mappedRatio: null, wasRemapped: false } },
    { input: "专业人像照片", expected: { extractedRatio: null, mappedRatio: null, wasRemapped: false } },
  ],
  remapping: [
    { input: "17:9 的图片", expected: { extractedRatio: "17:9", mappedRatio: "16:9", wasRemapped: true } },
    { input: "15:10 的海报", expected: { extractedRatio: "15:10", mappedRatio: "3:2", wasRemapped: true } },
  ]
};

// 语言检测测试数据
export const LANGUAGE_TEST_CASES = [
  { input: "一只猫", expected: { language: "Chinese", method: "chinese-chars" } },
  { input: "生成图片", expected: { language: "Chinese", method: "chinese-chars" } },
  { input: "a cute cat", expected: { language: "English", method: "ascii-english" } },
  { input: "generate image", expected: { language: "English", method: "ascii-english" } },
  { input: "これは猫です", expected: { language: "Japanese", method: "nlp-detected(ja)" } },
];

// 条件触发测试场景
export const CONDITIONAL_TRIGGER_SCENARIOS = {
  cameraLighting: {
    shouldTrigger: [
      { style_hints: ["photorealistic", "portrait"], subject: "人像照片" },
      { style_hints: ["cinematic", "film"], subject: "电影场景" },
      { style_hints: ["realistic"], subject: "风景照" },
    ],
    shouldNotTrigger: [
      { style_hints: ["flat_design"], subject: "PPT" },
      { style_hints: ["minimal"], subject: "Logo" },
      { style_hints: ["corporate"], subject: "UI 设计" },
    ]
  },
  textIntegration: {
    shouldTrigger: [
      { detected_text: ["限时促销"], content_category: "graphic_design" },
      { detected_text: [], content_category: "graphic_design", subject: "海报" },
      { detected_text: ["圣诞快乐"], content_category: "other" },
    ],
    shouldNotTrigger: [
      { detected_text: [], content_category: "photography", subject: "人像" },
      { detected_text: [], content_category: "other", subject: "猫咪" },
    ]
  },
  knowledgeEnhancement: {
    shouldTrigger: [
      { content_category: "infographic", style_hints: ["educational"] },
      { content_category: "other", subject: "diagram", style_hints: ["scientific"] },
    ],
    shouldNotTrigger: [
      { content_category: "photography", style_hints: ["portrait"] },
      { content_category: "graphic_design", style_hints: ["minimal"] },
    ]
  },
  characterRoles: {
    shouldTrigger: [
      { image_analysis: [{ image_type: "face_portrait" }, { image_type: "face_portrait" }] },
      { image_analysis: [{ image_type: "face_portrait" }, { image_type: "face_portrait" }, { image_type: "scene" }] },
    ],
    shouldNotTrigger: [
      { image_analysis: [{ image_type: "face_portrait" }] },
      { image_analysis: [{ image_type: "scene" }, { image_type: "product" }] },
      { image_analysis: [] },
    ]
  }
};
