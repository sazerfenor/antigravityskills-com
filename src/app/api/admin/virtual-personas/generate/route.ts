/**
 * 虚拟人格批量生成 API
 *
 * @description 调用 AI 生成人格数据 + 头像 Prompt
 * 注意：此 API 只返回生成的数据，实际头像生成和上传在前端完成
 */

import { z } from 'zod';

import { respData, respErr } from '@/shared/lib/resp';
import { validateRequest } from '@/shared/lib/zod';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { generateText } from '@/shared/services/gemini-text';
import type {
  ActivityLevel,
  PersonaCategory,
  PersonaGenerationOutput,
} from '@/shared/types/virtual-persona';
import {
  ALL_PERSONA_CATEGORIES,
  CATEGORY_VARIANTS,
  ACTIVITY_DISTRIBUTION,
} from '@/shared/types/virtual-persona';

// ============================================
// Schema 定义
// ============================================

const generateSchema = z.object({
  count: z.number().min(1).max(10).default(1),
  category: z.enum([
    'photography', 'art-illustration', 'design', 'commercial-product', 'character-design',
    'experimental', 'infographic', 'indie-illustration', '3d-visualization'
  ]).optional(),
  activityLevel: z.enum(['low', 'moderate', 'high', 'very_high']).optional(),
  workflowType: z.enum(['pure_ai', 'ai_enhanced', 'hybrid']).optional(),
  existingPersonas: z.array(z.object({
    displayName: z.string(),
    username: z.string(),
    specialties: z.array(z.string()),
  })).optional(),
});

// ============================================
// 平台背景说明 V2（职业驱动 + 工作导向）
// ============================================

const PLATFORM_CONTEXT = `
## CRITICAL: Platform Context (READ THIS FIRST)

You are creating personas for **Antigravity Skills**, an AI image generation community.

### Core Philosophy: "Declassifying Creativity"
- Users input **vague intent** ("make it sad") → Engine extracts logic → AI generates **professional results**
- Every image in the gallery shows **exactly how it was made** - the complete generation parameters

### WHO USES THIS PLATFORM (Real Paying Users):
1. **E-commerce Sellers**: "I need 50 product shots with consistent lighting - no studio rental"
2. **Corporate Professionals**: "Make my PPT look like I paid a designer - needs to be copyright-safe"
3. **Game/Illustration Studios**: "Turn rough sketches into concept art in minutes"
4. **Commercial Photographers**: "AI-enhance this failed shot to save the project"

### CRITICAL INSIGHT: Users are HERE TO WORK, NOT TO PLAY
- They have **deadlines** and **budget pressure**
- They care about **consistency**, **efficiency**, and **reusability**
- They discuss **specific parameters** (lighting settings, edge sharpness), **workflows**, **batch processing**
- They also have **water cooler moments**: joke about clients, self-deprecate about deadlines, share industry banter

### Platform Parameter Vocabulary (use these specific terms):
- Lighting Settings
- Style Intensity
- Edge Sharpness
- Color Tone
- Consistency Control
- Batch Template

### The persona you create MUST be a PROFESSIONAL who depends on this platform for WORK.
`.trim();

// ============================================
// 分类描述 V2（职业驱动的行为逻辑）
// ============================================

// CRITICAL: Category Key mapping declaration
// The category keys are historical artifacts. Use this mapping:
// - 'photography' → E-commerce visuals/commercial retouching (NOT landscape photographer)
// - 'art-illustration' → Game/book illustration (NOT fine artist)
// - 'design' → Commercial design/PPT (NOT independent artist)
// - 'commercial-product' → E-commerce seller/supplier
// - 'character-design' → IP design/virtual avatars
// NEVER create personas that match the literal key name.

const CATEGORY_DESCRIPTIONS: Record<PersonaCategory, string> = {
  'photography': `
    **CRITICAL: This is NOT "photography" in the literal sense.**
    This category is for: E-commerce visual specialists, real estate photo retouchers, wedding post-processing

    **Professional Context**: Commercial image professionals who use AI for product/commercial imagery
    **Core Needs**: Batch processing, consistency, efficiency
    **Behavioral Motivation**: Large volume of images to process, tight deadlines, need reusable solutions
    **Natural Focus**: Parameter reuse, batch processing, style consistency, edge quality, lighting settings

    **They will NEVER ask**: "What lens did you use?" (This is AI generation, not physical photography)
  `,
  'art-illustration': `
    **Professional Context**: Game concept artists, book illustrators, indie game developers
    **Core Needs**: Style consistency, character stability, fast iteration
    **Behavioral Motivation**: Need unified style assets, characters must stay consistent when changing poses
    **Natural Focus**: Style reuse, character consistency, workflow sharing, LoRA feasibility

    **They will NEVER ask**: "What brush did you use?" (AI is the primary tool)
  `,
  'design': `
    **Professional Context**: Brand designers, UI designers, PPT consultants
    **Core Needs**: Copyright safety, style consistency, commercial usability
    **Behavioral Motivation**: Need copyright-safe commercial assets, entire design set must stay consistent
    **Natural Focus**: Copyright issues, color scheme reuse, batch generation consistency
  `,
  'commercial-product': `
    **Professional Context**: E-commerce sellers, suppliers, operations agencies
    **Core Needs**: Large volume, high efficiency, consistent lighting
    **Behavioral Motivation**: Seasonal launches with large SKU counts, need unified style product images
    **Natural Focus**: Batch processing methods, white background quality, scene lighting matching
  `,
  'character-design': `
    **Professional Context**: VTuber designers, blind box prototypes, sticker packs
    **Core Needs**: Character consistency, multi-angle/multi-expression variants
    **Behavioral Motivation**: IP characters must be stable, can't deform when changing poses/expressions
    **Natural Focus**: Character feature locking, three-view proportions, consistency control methods
  `,
  'experimental': `
    **CRITICAL: This is the "creative chaos" category.**
    These creators are NOT driven by client work. They create for FUN, curiosity, and virality.

    **Professional Context**: Hobbyists, trend explorers, creative experimenters, side-project creators
    **Core Needs**: Novel effects, unexpected combinations, "wow" factor, shareability
    **Behavioral Motivation**: "What if I try this?", sharing discoveries, chasing viral moments
    **Natural Focus**: Unusual prompts, weird combinations, happy accidents, pushing boundaries

    **Key Difference**: They DON'T have deadlines or clients. They create because it's FUN.
    **Typical creations**: Trading card mockups, impossible architecture, glitch art, AI fever dreams
    **Typical phrases**: "Look what I accidentally made!", "Has anyone tried combining X with Y?"
  `,
  'infographic': `
    **Professional Context**: PPT consultants, data visualization specialists, report designers
    **Core Needs**: Clean layouts, consistent styles, text-image integration, professional polish
    **Behavioral Motivation**: Making data beautiful, impressing stakeholders, efficient template reuse
    **Natural Focus**: Color schemes, typography, layout composition, visual hierarchy

    **Typical creations**: Business presentations, data dashboards, process flows
    **Typical phrases**: "How do you keep text readable?", "Need a clean chart style"
  `,
  'indie-illustration': `
    **Professional Context**: Independent artists, social media illustrators, personal brand builders
    **Core Needs**: Unique style development, audience engagement, portfolio building
    **Behavioral Motivation**: Growing following, developing signature style, creative expression
    **Natural Focus**: Style consistency, aesthetic exploration, trend adaptation

    **Key Difference from art-illustration**: NOT working for studios. Building their OWN brand.
    **Typical phrases**: "Trying to develop my own style", "Commission queue is open!"
  `,
  '3d-visualization': `
    **Professional Context**: Architects, product designers, interior decorators
    **Core Needs**: Realistic renders, material accuracy, lighting simulation
    **Behavioral Motivation**: Client presentations, concept validation, quick iterations
    **Natural Focus**: Materials, lighting, camera angles, photorealism

    **Typical phrases**: "How do you get realistic glass?", "Need better lighting for this angle"
  `,
};

// ============================================
// 反面约束 V2（更全面的禁止模式）
// ============================================

const FORBIDDEN_PATTERNS = `
## CRITICAL: What This Persona Should NEVER Sound Like

### ❌ Hobby-Speak (Too Casual, No Stakes)
These phrases are FORBIDDEN because they sound like hobbyists, not professionals:
- "I love exploring AI art!" → NO. They're not exploring, they're WORKING.
- "This is so cool!" → NO. They need to know if it SOLVES THEIR PROBLEM.
- "Great vibes!" → NO. They need PARAMETERS and REUSABILITY.
- "Love your style!" → NO. Too generic, no actionable feedback.

### ❌ Pain Points Exposed in Bio (Exposes AI Generation)
These phrases in Bio are FORBIDDEN because no real person writes this:
- "200 SKUs per week grind" → NO. No real person writes their deadlines in bio.
- "This platform saved my life" → NO. No real person admits desperation in their profile.
- Pain points should drive BEHAVIOR (typicalPhrases, industryBanter), NOT appear in Bio.

### ❌ Traditional Art/Photo Speak (Makes No Sense Here)
These phrases are FORBIDDEN because this is an AI generation platform:
- "What camera/lens did you use?" → ABSOLUTELY NOT.
- "Nice shot! Where was this taken?" → NO. Nothing is "taken" here.
- "I love your brushwork" → NO. AI is the primary tool.
- "The film grain is beautiful" / "Your darkroom skills are impressive" → NO.

### ❌ Resume-Style Bio (Mechanical, Unnatural)
These Bio styles are FORBIDDEN because they don't sound like real people:
- "E-commerce Visual Specialist | Minimalist Product Aesthetics" → NO. Too LinkedIn.
- "Game Concept Artist | Character Design Expert" → NO. Too formal.

### ✅ CORRECT Bio Examples (Like Real People Write):
- "Making renders while pretending to work"
- "Saving my boss studio rental fees"
- "I draw stuff, sometimes I sleep"
- "AI generates, I polish"
- "Keeping clients fed, one render at a time"
- "White backgrounds, 50 minimum"

### ✅ CORRECT Persona Speak (Pain Points in Behavior):
- "How did you get those lighting settings? The edges are so clean"
- "Can you share your batch processing workflow?"
- "Is this copyright-safe? We need it for commercial use"
- "How do you control character consistency? Mine deforms when I change poses"
- "Client's 10th revision, thank god for batch processing" (industry banter)
- "Another day being chased by deadlines" (self-deprecating humor)

If you generate a persona with forbidden patterns, you have FAILED the task.
`.trim();

// ============================================
// 工作流类型定义
// ============================================

type WorkflowType = 'pure_ai' | 'ai_enhanced' | 'hybrid';

const WORKFLOW_DESCRIPTIONS: Record<WorkflowType, string> = {
  'pure_ai': 'Generates images entirely from text prompts, no reference images',
  'ai_enhanced': 'Uses AI to enhance, upscale, or modify existing images',
  'hybrid': 'Combines reference images with AI generation (ControlNet, img2img)',
};

// ============================================
// AI Prompt 模板
// ============================================

function buildPersonaGenerationPrompt(
  category: PersonaCategory,
  activityLevel: ActivityLevel,
  existingPersonas: Array<{ displayName: string; username: string; specialties: string[] }>,
  batchIndex: number,
  workflowType?: WorkflowType
): string {
  const categoryDesc = CATEGORY_DESCRIPTIONS[category];

  // 随机选择一个 Variant 引导差异化
  const variants = CATEGORY_VARIANTS[category];
  const suggestedVariant = variants[Math.floor(Math.random() * variants.length)];

  const existingList = existingPersonas.length > 0
    ? existingPersonas.map(p => `- ${p.displayName} (@${p.username}): ${p.specialties.join(', ')}`).join('\n')
    : 'None yet';

  const workflowInstruction = workflowType
    ? `\n## Specified Workflow Type: ${workflowType}\n${WORKFLOW_DESCRIPTIONS[workflowType]}\nThe persona MUST use this workflow type.`
    : '\n## Workflow Type: Auto-assign\nChoose the most appropriate workflow type for this persona based on their category and personality.';

  return `
${PLATFORM_CONTEXT}

# Task: Generate a Virtual AI Creator Persona

You are creating persona #${batchIndex + 1} for Antigravity Skills, an AI image generation community.
This persona will share AI-generated artworks and interact with other AI creators.

## Category: ${category}
${categoryDesc}

## Suggested Variant (Creative Direction)
**${suggestedVariant}**

Create a persona that fits this variant. Interpret creatively but stay within the category.

## Activity Level: ${activityLevel}
- low: Occasional posts, mostly observes and interacts with others
- moderate: Regular engagement, balanced posting and interaction
- high: Very active, frequent posts and comments
- very_high: Power user, constantly engaged
${workflowInstruction}

## CRITICAL: Avoid Duplicates
These personas already exist. YOU MUST CREATE SOMEONE DIFFERENT:
${existingList}

${FORBIDDEN_PATTERNS}

## CRITICAL: Skeleton vs Flesh Separation

### Skeleton Layer (Internal Definition) - Drive behavior generation:
- Profession, pain points, behavioral motivations
- Detailed and honest, no hiding
- Used to drive typicalPhrases, sampleInteraction, industryBanter

### Flesh Layer (External Presentation) - Bio and public image:
- What this person WANTS others to see
- Can be personality, attitude, humor, self-deprecation, playing cool
- NOT a resume-style professional introduction
- Think: "How would this person introduce themselves on social media?"

## Requirements
1. **Professional Identity**: This persona depends on AI tools for WORK, not hobby
2. **Skeleton Layer**: Clear profession, pain points, work pressure (drives behavior)
3. **Flesh Layer**: Bio sounds like a real person's social media profile (personality, not resume)
4. **Specific Parameters**: Uses platform vocabulary (Lighting Settings, Edge Sharpness, Consistency Control)
5. **Industry Banter**: Can joke about clients, self-deprecate about deadlines, share industry humor
6. **Platform Knowledge**: Familiar with AI tools, but discusses them in context of WORK efficiency

## Output Format (JSON)
Return a valid JSON object with these exact fields:

{
  "displayName": "Full Name (realistic, diverse ethnicity)",
  "username": "unique_username_lowercase (3-15 chars, no spaces)",
  "bio": "Personal tagline like a real person would write (NOT resume-style, see examples below)",
  "profession": "Actual profession in skeleton layer (e.g., 电商视觉师, 游戏概念画师)",
  "specialties": ["ai_specialty1", "ai_specialty2", "ai_specialty3"],
  "styleKeywords": ["style1", "style2", "style3", "style4"],
  "workflowType": "pure_ai | ai_enhanced | hybrid",
  "workflowDescription": "Brief description of how this creator uses AI for WORK (20-30 words)",
  "preferredTools": ["Stable Diffusion", "Midjourney", "ControlNet"],
  "dislikes": ["style_they_dislike1", "style_they_dislike2"],
  "personalityTraits": {
    "warmth": 7,
    "professionalism": 8,
    "humor": 5,
    "creativity": 9,
    "helpfulness": 7
  },
  "communicationStyle": "casual",
  "responsePatterns": {
    "greetings": ["Hey!", "Hi there"],
    "closings": ["Happy prompting!", "Keep creating!"],
    "emojiUsage": "moderate",
    "typicalPhrases": [
      "How did you get those lighting settings? The edges are so clean",
      "Can you share your batch processing workflow?",
      "What method do you use for consistency control?"
    ],
    "industryBanter": [
      "Client's 10th revision, thank god for batch processing",
      "Another day being chased by deadlines",
      "Client wanted 'colorful black', nailed it with this setting"
    ]
  },
  "sampleInteraction": {
    "scenario": "Someone posts a product shot with clean edges and consistent lighting",
    "response": "Those edges are so clean! Can you share your lighting settings? I always get white halos"
  },
  "promptStyleGuide": "When generating prompts, this persona prefers...",
  "siteReview": "A genuine review of the platform from a PROFESSIONAL user perspective (50-100 words, mentioning work efficiency)",
  "siteRating": 5,
  "avatarPrompt": "Portrait prompt for generating this person's avatar (photorealistic or stylized based on their preference)"
}

## Field Guidelines

### bio - FLESH LAYER (Personal Tagline):
Write like a real person's social media profile. NOT resume-style.

GOOD examples (like real people write):
- "Making renders while pretending to work"
- "Saving my boss studio rental fees"
- "I draw stuff, sometimes I sleep"
- "AI generates, I polish"
- "Keeping clients fed, one render at a time"
- "White backgrounds, 50 minimum"

BAD examples (too LinkedIn, too mechanical):
- "E-commerce Visual Specialist | Minimalist Product Aesthetics"
- "Game Concept Artist | Character Design Expert"

### typicalPhrases - Use SPECIFIC parameters:
Reference specific platform vocabulary, not generic "parameters".

GOOD examples (specific parameters):
- "How did you get those lighting settings? The edges are so clean"
- "Can you share your batch processing workflow? I have a batch to process"
- "What method do you use for consistency control? Mine deforms when I change angles"
- "What style intensity did you use? This color tone is so nice"
- "Is this copyright-safe? We need it for commercial use"

BAD examples (too generic or hobby-speak):
- "Can you share the parameters?" (too vague)
- "Love your style!" (hobby-speak)
- "This is so cool!" (no actionable content)

### industryBanter - Professional humor/complaints:
Jokes about work, self-deprecation about deadlines, client humor.

GOOD examples:
- "Client's 10th revision, thank god for batch processing"
- "Another day being chased by deadlines"
- "Client wanted 'colorful black', nailed it with this setting"
- "Rendering faster than clients can change their minds"
- "Deadlines are my primary motivation"

### preferredTools - Choose from:
Stable Diffusion, SDXL, Midjourney, DALL-E, Flux, ControlNet, LoRAs, ComfyUI, Automatic1111, InvokeAI

### dislikes - Style preferences they're critical of:
Examples: "oversaturated HDR", "generic anime style", "watermarks", "deep fried compression", "AI artifacts"

## Personality Traits Scale (1-10)
- warmth: How friendly and approachable
- professionalism: How formal and expert-like
- humor: How often uses jokes or playful language
- creativity: How experimental and artistic
- helpfulness: How eager to give feedback and prompt tips

## Communication Styles
Choose ONE: "formal", "casual", "enthusiastic", "reserved"

## Emoji Usage
Choose ONE: "none", "minimal", "moderate", "frequent"

Generate a unique, diverse AI creator persona now. Return ONLY the JSON object, no explanation.
`.trim();
}

// ============================================
// 辅助函数
// ============================================

/**
 * 完全平均随机选择分类
 */
function pickCategory(): PersonaCategory {
  return ALL_PERSONA_CATEGORIES[Math.floor(Math.random() * ALL_PERSONA_CATEGORIES.length)];
}

function pickActivityLevel(): ActivityLevel {
  const totalWeight = Object.values(ACTIVITY_DISTRIBUTION).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [level, weight] of Object.entries(ACTIVITY_DISTRIBUTION)) {
    random -= weight;
    if (random <= 0) {
      return level as ActivityLevel;
    }
  }

  return 'moderate';
}

function parsePersonaOutput(raw: string): PersonaGenerationOutput {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned) as PersonaGenerationOutput;

  if (!parsed.displayName || !parsed.username || !parsed.bio) {
    throw new Error('Missing required fields in persona output');
  }

  // 标准化 username
  parsed.username = parsed.username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (parsed.username.length > 15) {
    parsed.username = parsed.username.slice(0, 15);
  }

  return parsed;
}

// ============================================
// POST - 生成人格数据
// ============================================

export async function POST(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.write'))) {
      return respErr('Permission denied', 403);
    }

    const validation = await validateRequest(request, generateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { count, category, activityLevel, workflowType, existingPersonas = [] } = validation.data;

    const results: Array<{
      persona: PersonaGenerationOutput;
      category: PersonaCategory;
      activityLevel: ActivityLevel;
      workflowType?: WorkflowType;
      debug: {
        prompt: string;
        rawOutput: string;
        model: string;
        temperature: number;
      };
    }> = [];

    const usedUsernames = new Set(existingPersonas.map(p => p.username));

    for (let i = 0; i < count; i++) {
      const selectedCategory = category || pickCategory();
      const selectedActivityLevel = activityLevel || pickActivityLevel();

      const prompt = buildPersonaGenerationPrompt(
        selectedCategory,
        selectedActivityLevel,
        [...existingPersonas, ...results.map(r => ({
          displayName: r.persona.displayName,
          username: r.persona.username,
          specialties: r.persona.specialties,
        }))].slice(-10),
        i,
        workflowType
      );

      const model = 'gemini-3-flash-preview';
      const temperature = 0.9;

      const rawResult = await generateText(prompt, {
        model,
        temperature,
        maxOutputTokens: 2048,
        jsonMode: true,
      });

      const persona = parsePersonaOutput(rawResult);

      // 确保 username 唯一
      let finalUsername = persona.username;
      let attempts = 0;
      while (usedUsernames.has(finalUsername) && attempts < 10) {
        const suffix = Math.random().toString(36).substring(2, 5);
        finalUsername = `${persona.username.slice(0, 12)}_${suffix}`;
        attempts++;
      }
      persona.username = finalUsername;
      usedUsernames.add(finalUsername);

      results.push({
        persona,
        category: selectedCategory,
        activityLevel: selectedActivityLevel,
        workflowType: persona.workflowType as WorkflowType || workflowType,
        debug: {
          prompt,
          rawOutput: rawResult,
          model,
          temperature,
        },
      });
    }

    return respData({ results });
  } catch (e: any) {
    console.error('[API] Generate virtual personas failed:', e);
    return respErr(e.message);
  }
}
