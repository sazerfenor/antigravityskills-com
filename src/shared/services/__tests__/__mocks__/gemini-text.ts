// LLM Mock - 避免测试依赖真实 API
import { vi } from 'vitest'

export const generateText = vi.fn()
export const generateMultimodal = vi.fn()

// 预设响应 - Intent Analyzer Stage 1
export const MOCK_INTENT_RESPONSES = {
  cameraLightingTrigger: JSON.stringify({
    subject: "专业人像照片",
    action: "拍摄",
    style_hints: ["photorealistic", "portrait", "professional"],
    technical_constraints: [],
    explicit_details: ["专业人像"],
    image_analysis: [],
    input_complexity: "moderate",
    context: "用户想要生成一张专业的人像照片",
    detected_text: [],
    content_category: "photography"
  }),
  pptTemplate: JSON.stringify({
    subject: "PPT 模板",
    action: null,
    style_hints: ["business", "minimal", "corporate"],
    technical_constraints: [],
    explicit_details: ["商务风"],
    image_analysis: [],
    input_complexity: "minimal",
    context: "用户想要生成一个商务风格的PPT模板",
    detected_text: [],
    content_category: "graphic_design"
  }),
  textIntegrationTrigger: JSON.stringify({
    subject: "海报",
    action: null,
    style_hints: ["typography", "promotional"],
    technical_constraints: [],
    explicit_details: ["标题限时促销"],
    image_analysis: [],
    input_complexity: "moderate",
    context: "用户想要生成一张带有'限时促销'标题的海报",
    detected_text: ["限时促销"],
    content_category: "graphic_design"
  }),
  knowledgeEnhancementTrigger: JSON.stringify({
    subject: "科学信息图",
    action: null,
    style_hints: ["scientific", "educational", "infographic"],
    technical_constraints: [],
    explicit_details: ["展示细胞结构"],
    image_analysis: [],
    input_complexity: "rich",
    context: "用户想要生成一张展示细胞结构的科学信息图",
    detected_text: [],
    content_category: "infographic"
  }),
  characterRolesTrigger: JSON.stringify({
    subject: "两人合照",
    action: "合影",
    style_hints: ["portrait", "group"],
    technical_constraints: [],
    explicit_details: ["两人"],
    image_analysis: [
      { image_index: 0, image_type: "face_portrait", detected_features: {}, user_apparent_intent: "Use as character 1" },
      { image_index: 1, image_type: "face_portrait", detected_features: {}, user_apparent_intent: "Use as character 2" }
    ],
    input_complexity: "moderate",
    context: "用户想要生成两人的合照",
    detected_text: [],
    content_category: "photography"
  })
}

// 预设响应 - Field Generator Stage 2
export const MOCK_FIELD_RESPONSES = {
  withCameraLighting: JSON.stringify({
    context: "生成专业人像照片",
    fields: [
      { id: "subject_description", type: "text", label: "主题描述", defaultValue: "专业人像照片" },
      { id: "rendering_style", type: "select", label: "渲染风格", options: ["Photorealistic", "Cinematic", "Illustration"], defaultValue: "Photorealistic" },
      { id: "camera_angle", type: "select", label: "相机角度", options: ["Eye Level", "Low Angle", "High Angle", "Dutch Angle"], defaultValue: "Eye Level", isAdvanced: true, source: "expanded" },
      { id: "depth_of_field", type: "slider", label: "景深", min: 1, max: 10, step: 1, minLabel: "Shallow (Bokeh)", maxLabel: "Deep (Sharp)", defaultValue: 3, isAdvanced: true, source: "expanded" },
      { id: "lighting_style", type: "select", label: "光线风格", options: ["Natural Daylight", "Golden Hour", "Studio Softbox", "Dramatic Rim Light"], defaultValue: "Natural Daylight", isAdvanced: true, source: "expanded" }
    ],
    preservedDetails: ["专业人像照片"]
  }),
  withoutCameraLighting: JSON.stringify({
    context: "生成商务风PPT模板",
    fields: [
      { id: "subject_description", type: "text", label: "主题描述", defaultValue: "PPT 模板" },
      { id: "rendering_style", type: "select", label: "渲染风格", options: ["Flat Design", "Corporate", "Minimal"], defaultValue: "Corporate" }
    ],
    preservedDetails: ["商务风PPT模板"]
  }),
  withTextIntegration: JSON.stringify({
    context: "生成促销海报",
    fields: [
      { id: "subject_description", type: "text", label: "主题描述", defaultValue: "海报" },
      { id: "text_content", type: "text", label: "渲染文字内容", defaultValue: "限时促销", source: "user_constraint" },
      { id: "text_position", type: "select", label: "文字位置", options: ["Top Center", "Bottom Center", "Center Overlay"] },
      { id: "text_style", type: "select", label: "文字风格", options: ["Bold Sans-serif", "Elegant Serif", "Neon Glow"] }
    ],
    preservedDetails: ["海报", "标题: 限时促销"]
  }),
  withKnowledgeEnhancement: JSON.stringify({
    context: "生成科学信息图",
    fields: [
      { id: "subject_description", type: "text", label: "主题描述", defaultValue: "科学信息图" },
      { id: "factual_accuracy", type: "toggle", label: "确保事实准确性", defaultValue: true, isAdvanced: true },
      { id: "knowledge_enhancement", type: "toggle", label: "AI 自动补充专业知识", defaultValue: false, isAdvanced: true }
    ],
    preservedDetails: ["展示细胞结构的科学信息图"]
  }),
  withCharacterMapper: JSON.stringify({
    context: "生成两人合照",
    fields: [
      { id: "subject_description", type: "text", label: "主题描述", defaultValue: "两人合照" },
      { id: "character_mapper", type: "character_mapper", label: "角色分配", images: [{ index: 0, role: "Primary" }, { index: 1, role: "Secondary" }], source: "image_derived" },
      { id: "character_relationship", type: "select", label: "角色关系", options: ["Colleagues", "Friends", "Family", "Couple"] }
    ],
    preservedDetails: ["Primary character: use face from image 1", "Secondary character: use face from image 2"]
  })
}

// Mock 函数配置助手
export function setupMockForScenario(scenario: keyof typeof MOCK_INTENT_RESPONSES) {
  const intentResponse = MOCK_INTENT_RESPONSES[scenario]
  const fieldResponseKey = {
    cameraLightingTrigger: 'withCameraLighting',
    pptTemplate: 'withoutCameraLighting',
    textIntegrationTrigger: 'withTextIntegration',
    knowledgeEnhancementTrigger: 'withKnowledgeEnhancement',
    characterRolesTrigger: 'withCharacterMapper'
  }[scenario] as keyof typeof MOCK_FIELD_RESPONSES
  
  const fieldResponse = MOCK_FIELD_RESPONSES[fieldResponseKey]
  
  generateText
    .mockResolvedValueOnce({ text: intentResponse })
    .mockResolvedValueOnce({ text: fieldResponse })
  
  generateMultimodal
    .mockResolvedValueOnce({ text: intentResponse })
    .mockResolvedValueOnce({ text: fieldResponse })
}
