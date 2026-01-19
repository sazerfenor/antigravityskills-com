/**
 * 虚拟人格批量生成脚本
 *
 * @description 批量生成 50+ 虚拟人格，包括：
 * - AI 生成人格特质、专长、沟通风格
 * - 创建对应的 User 记录（isVirtual = true）
 * - 创建 VirtualPersona 记录
 * - 生成 AI 头像并上传到 R2
 *
 * @usage pnpm tsx scripts/generate-virtual-personas.ts [--count=50] [--dry-run] [--skip-avatar]
 */

import { db } from '@/core/db';
import { user, virtualPersona } from '@/config/db/schema.sqlite';
import { getUuid } from '@/shared/lib/hash';
import { generateText } from '@/shared/services/gemini-text';
import { getAIService } from '@/shared/services/ai';
import { getStorageService } from '@/shared/services/storage';
import { AIMediaType } from '@/extensions/ai/types';
import sharp from 'sharp';
import type {
  ActivityLevel,
  CommunicationStyle,
  NewVirtualPersona,
  PersonaCategory,
  PersonalityTraits,
  ResponsePatterns,
  PersonaGenerationOutput,
} from '@/shared/types/virtual-persona';
import {
  ACTIVITY_DISTRIBUTION,
  PERSONA_DISTRIBUTION,
} from '@/shared/types/virtual-persona';

// ============================================
// 配置
// ============================================

const CONFIG = {
  // 生成延迟（避免 API 限流）
  delayBetweenGenerations: 2000, // 2 秒
  // AI 模型配置
  textModel: 'gemini-3-flash-preview',
  imageModel: 'gemini-3-pro-image-preview', // Gemini 3 Pro 用于头像生成
  // 头像压缩配置（与用户上传头像一致）
  avatarCompression: {
    maxSize: 800, // 800x800
    quality: 80,  // WebP 质量 80%
    format: 'webp' as const,
  },
  // 输出控制
  verbose: true,
};

// 已使用的用户名集合（避免重复）
const usedUsernames = new Set<string>();

// ============================================
// 人格分类描述（用于 AI Prompt）
// ============================================

const CATEGORY_DESCRIPTIONS: Record<PersonaCategory, string> = {
  'photography': `
    Professional photographers or photography enthusiasts.
    Specialties include: portrait, landscape, street, wildlife, macro,
    architectural, fashion, documentary, event, fine art photography.
    Focus on technical aspects like lighting, composition, and post-processing.
  `,
  'art-illustration': `
    Digital artists, illustrators, or traditional artists.
    Styles include: anime, manga, concept art, character design,
    fantasy illustration, realistic digital painting, watercolor, oil painting.
    Focus on creative expression, artistic techniques, and visual storytelling.
  `,
  'design': `
    Graphic designers, UI/UX designers, or brand designers.
    Areas include: logo design, web design, packaging,
    poster design, typography, motion graphics.
    Focus on functionality, user experience, and visual communication.
  `,
  'commercial-product': `
    Product photographers or commercial visual creators.
    Focus on: e-commerce photography, product mockups,
    advertising visuals, lifestyle product shots, food photography.
    Emphasis on selling products and commercial appeal.
  `,
  'character-design': `
    Character designers for games, animation, or media.
    Styles include: anime characters, game avatars,
    mascots, fantasy creatures, sci-fi characters.
    Focus on personality, backstory, and visual identity.
  `,
};

// ============================================
// AI Prompt 模板
// ============================================

/**
 * 生成人格的 AI Prompt
 * 确保多样性的关键策略：
 * 1. 明确要求避开已有人格
 * 2. 提供分类背景
 * 3. 要求具体、独特的人设
 */
function buildPersonaGenerationPrompt(
  category: PersonaCategory,
  activityLevel: ActivityLevel,
  existingPersonas: Array<{ username: string; specialties: string[] }>,
  batchIndex: number
): string {
  const categoryDesc = CATEGORY_DESCRIPTIONS[category];

  // 构建已有人格列表（避免重复）
  const existingList = existingPersonas.length > 0
    ? existingPersonas.map(p => `- ${p.username}: ${p.specialties.join(', ')}`).join('\n')
    : 'None yet';

  return `
# Task: Generate a Unique Virtual User Persona for an AI Image Gallery

You are creating persona #${batchIndex + 1} for a social platform where users share AI-generated images.
This persona will interact naturally with posts and other users.

## Category: ${category}
${categoryDesc}

## Activity Level: ${activityLevel}
- low: Occasional posts, mostly observes and interacts
- moderate: Regular engagement, balanced posting and interaction
- high: Very active, frequent posts and comments
- very_high: Power user, constantly engaged

## CRITICAL: Avoid Duplicates
These personas already exist. YOU MUST CREATE SOMEONE DIFFERENT:
${existingList}

## Requirements
1. **Authentic Identity**: Create a believable persona with a realistic name, not generic
2. **Specific Expertise**: Pick 2-4 narrow specialties within the category
3. **Distinct Voice**: Unique communication style that feels natural
4. **Personality Depth**: Real personality quirks and preferences
5. **Platform Engagement**: Genuine enthusiasm for sharing AI art

## Username - CRITICAL

DO NOT use patterns like:
- name_profession (alex_photo, maya_design)
- name_specialty (john_macro, lisa_portrait)
- firstname_lastname (john_smith)
- any underscore between name and profession/specialty

Real usernames are often:
- Just a name: "michaelchen", "sarahj"
- Nickname: "nightowl", "coffeelover"
- Random: "xx_alex", "user2847"
- Abbreviated: "mjohnson", "klee99"

Pick ONE style randomly. Make it feel like a real person picked it casually.

## Output Format (JSON)
Return a valid JSON object with these exact fields:

{
  "username": "casual username (3-15 chars, like real people use: 'michaelchen', 'sarahj', 'mjohnson88')",
  "bio": "Personality signature (3-20 words). Real styles: 'NYC 📍', '35mm film forever', 'coffee > sleep', 'landscape | street | chaos', 'here for the good light', 'I shoot food and cats', 'probably overthinking this', '🎨✨'. Pick a vibe that fits this person.",
  "specialties": ["specialty1", "specialty2", "specialty3"],
  "styleKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
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
    "closings": ["Cheers", "Happy creating!"],
    "emojiUsage": "moderate",
    "typicalPhrases": ["Love the composition", "Nice work on the lighting"]
  },
  "promptStyleGuide": "When generating prompts, this persona prefers...",
  "siteReview": "A genuine review of the platform (50-100 words, positive with minor constructive notes)",
  "siteRating": 5,
  "avatarType": "portrait | artwork | object | landscape | pet | portfolio",
  "avatarPrompt": "Description for chosen avatar type"
}

## Avatar Type - CHOOSE BASED ON PERSONALITY

Pick the most authentic avatar type for THIS persona based on their traits:

1. **portrait** (warmth ≥ 7) - Candid selfie, outdoor shot, casual photo
2. **artwork** (creativity ≥ 8) - Stylized illustration, anime-style, digital art
3. **object** (professionalism ≥ 8, warmth ≤ 5) - Camera, lens, coffee cup, gear
4. **landscape** (reserved style) - Favorite location, scenic view, workspace
5. **pet** (warmth ≥ 8, humor ≥ 6) - Their cat, dog, or animal they photograph
6. **portfolio** (professionalism ≥ 9) - Their best work, signature style sample

DON'T default to portrait. Choose what feels AUTHENTIC for this specific persona.

## Personality Traits Scale (1-10)
- warmth: How friendly and approachable
- professionalism: How formal and expert-like
- humor: How often uses jokes or playful language
- creativity: How experimental and artistic
- helpfulness: How eager to give feedback and tips

## Communication Styles
Choose ONE: "formal", "casual", "enthusiastic", "reserved"

## Emoji Usage
Choose ONE: "none", "minimal", "moderate", "frequent"

Generate a unique, diverse persona now. Return ONLY the JSON object, no explanation.
`.trim();
}

/**
 * 头像生成 Prompt 模板
 */
function buildAvatarPrompt(persona: PersonaGenerationOutput, category: PersonaCategory): string {
  // 让 AI 生成的 avatarPrompt 决定风格，只加技术约束
  const basePrompt = persona.avatarPrompt || `Portrait of ${persona.username}, a ${category.replace('-', ' ')} creator`;

  return `
${basePrompt}

Technical requirements only:
- High quality image
- Square aspect ratio (1:1)
- Face clearly visible
`.trim();
}

// ============================================
// 核心逻辑
// ============================================

/**
 * 解析 AI 返回的 JSON
 */
function parsePersonaOutput(raw: string): PersonaGenerationOutput {
  // 清理可能的 markdown 包装
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

  // 验证必要字段
  if (!parsed.username || !parsed.bio) {
    throw new Error('Missing required fields in persona output');
  }

  // 标准化 username - 保留大小写和点号，更自然
  parsed.username = parsed.username.replace(/[^a-zA-Z0-9._]/g, '');
  if (parsed.username.length > 15) {
    parsed.username = parsed.username.slice(0, 15);
  }

  return parsed;
}

/**
 * 生成单个人格
 */
async function generateSinglePersona(
  category: PersonaCategory,
  activityLevel: ActivityLevel,
  existingPersonas: Array<{ username: string; specialties: string[] }>,
  batchIndex: number
): Promise<PersonaGenerationOutput> {
  const prompt = buildPersonaGenerationPrompt(category, activityLevel, existingPersonas, batchIndex);

  // 调用 AI 生成
  const result = await generateText(prompt, {
    model: CONFIG.textModel,
    temperature: 0.9, // 高温度增加多样性
    maxOutputTokens: 2048,
    jsonMode: true,
  });

  const persona = parsePersonaOutput(result);

  // 检查用户名是否重复，如果重复则添加随机后缀
  let finalUsername = persona.username;
  let attempts = 0;
  while (usedUsernames.has(finalUsername) && attempts < 10) {
    const suffix = Math.random().toString(36).substring(2, 5);
    finalUsername = `${persona.username.slice(0, 12)}_${suffix}`;
    attempts++;
  }
  persona.username = finalUsername;
  usedUsernames.add(finalUsername);

  return persona;
}

/**
 * 生成头像并上传（使用 Gemini 3 Pro + sharp 压缩）
 *
 * 流程：
 * 1. 调用 Gemini 3 Pro Image 生成头像
 * 2. 使用 sharp 压缩（800x800, WebP, 质量 80%）
 * 3. 上传到 R2 avatars/ 目录
 */
async function generateAndUploadAvatar(
  persona: PersonaGenerationOutput,
  category: PersonaCategory,
  userId: string
): Promise<string | null> {
  try {
    const prompt = buildAvatarPrompt(persona, category);

    // 使用 AI Service 生成图片
    const aiService = await getAIService();
    const provider = aiService.getProvider('gemini');

    if (!provider) {
      console.error('  ⚠️ Gemini provider not available');
      return null;
    }

    // 调用 Gemini 3 Pro Image 生成头像
    const result = await provider.generate({
      params: {
        mediaType: AIMediaType.IMAGE,
        model: CONFIG.imageModel, // gemini-3-pro-image-preview
        prompt,
        options: {
          aspectRatio: '1:1',
        },
        seoHints: `avatar ${persona.username}`,
      },
    });

    // Gemini provider 返回 AITaskResult，图片在 taskInfo.images 中
    const images = result.taskInfo?.images;
    if (result.taskStatus !== 'success' || !images || images.length === 0) {
      console.error('  ⚠️ Avatar generation failed:', result.taskInfo?.status);
      return null;
    }

    // 获取生成的图片 URL (AIImage 接口使用 imageUrl 字段)
    const generatedImageUrl = images[0].imageUrl;

    // 下载生成的图片
    const imageResponse = await fetch(generatedImageUrl);
    if (!imageResponse.ok) {
      console.error('  ⚠️ Failed to download generated avatar');
      return null;
    }

    const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // 使用 sharp 压缩头像
    const compressedBuffer = await sharp(originalBuffer)
      .resize(CONFIG.avatarCompression.maxSize, CONFIG.avatarCompression.maxSize, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: CONFIG.avatarCompression.quality })
      .toBuffer();

    console.log(`  📦 Compressed: ${originalBuffer.length} → ${compressedBuffer.length} bytes`);

    // 生成文件名并上传到 avatars/ 目录
    const hash = getUuid().slice(0, 12);
    const filename = `${persona.username}-${hash}.webp`;
    const key = `avatars/${filename}`;

    const storageService = await getStorageService();
    const uploadResult = await storageService.uploadFile({
      body: compressedBuffer,
      key,
      contentType: 'image/webp',
    });

    if (!uploadResult?.url) {
      console.error('  ⚠️ Failed to upload avatar');
      return null;
    }

    return uploadResult.url;
  } catch (error: any) {
    console.error('  ⚠️ Avatar generation error:', error.message);
    return null;
  }
}

/**
 * 创建 User 和 VirtualPersona 记录
 */
async function createPersonaRecords(
  persona: PersonaGenerationOutput,
  category: PersonaCategory,
  activityLevel: ActivityLevel,
  avatarUrl: string | null
): Promise<{ userId: string; personaId: string }> {
  const userId = getUuid();
  const personaId = getUuid();
  const now = new Date();

  // 1. 创建 User 记录
  await db().insert(user).values({
    id: userId,
    name: persona.username,  // 只用 username 作为名字
    email: `${persona.username}@virtual.antigravityskills.local`, // 内部虚拟邮箱
    emailVerified: true,
    image: avatarUrl,
    isVirtual: true,
    bio: persona.bio,
    createdAt: now,
    updatedAt: now,
  });

  // 2. 创建 VirtualPersona 记录
  const personaData: NewVirtualPersona = {
    id: personaId,
    userId,
    displayName: persona.username,  // 统一用 username
    username: persona.username,
    primaryCategory: category,
    secondaryCategories: null,
    specialties: JSON.stringify(persona.specialties),
    styleKeywords: JSON.stringify(persona.styleKeywords),
    personalityTraits: JSON.stringify(persona.personalityTraits),
    communicationStyle: persona.communicationStyle,
    responsePatterns: JSON.stringify(persona.responsePatterns),
    activityLevel,
    activeHoursStart: 8 + Math.floor(Math.random() * 4), // 8-11
    activeHoursEnd: 20 + Math.floor(Math.random() * 4),   // 20-23
    dailyTokenBalance: 0,
    lastInteractionMap: null,
    siteReview: persona.siteReview,
    siteRating: persona.siteRating || 5,
    promptStyleGuide: persona.promptStyleGuide,
    commentTemplates: null,
    isActive: true,
    lastActiveAt: null,
    totalPostsMade: 0,
    totalCommentsMade: 0,
    totalFollowsGiven: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db().insert(virtualPersona).values(personaData);

  return { userId, personaId };
}

/**
 * 按分布计算每个分类需要生成的数量
 */
function calculateDistribution(totalCount: number): Map<PersonaCategory, number> {
  const distribution = new Map<PersonaCategory, number>();
  const totalWeight = Object.values(PERSONA_DISTRIBUTION).reduce((a, b) => a + b, 0);

  for (const [category, weight] of Object.entries(PERSONA_DISTRIBUTION)) {
    const count = Math.round((weight / totalWeight) * totalCount);
    distribution.set(category as PersonaCategory, count);
  }

  // 调整确保总数正确
  const currentTotal = Array.from(distribution.values()).reduce((a, b) => a + b, 0);
  if (currentTotal !== totalCount) {
    // 调整 photography（最大的分类）
    const photographyCount = distribution.get('photography') || 0;
    distribution.set('photography', photographyCount + (totalCount - currentTotal));
  }

  return distribution;
}

/**
 * 随机选择活跃度级别
 */
function pickActivityLevel(): ActivityLevel {
  const totalWeight = Object.values(ACTIVITY_DISTRIBUTION).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [level, weight] of Object.entries(ACTIVITY_DISTRIBUTION)) {
    random -= weight;
    if (random <= 0) {
      return level as ActivityLevel;
    }
  }

  return 'moderate'; // 默认
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 主函数
// ============================================

async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const countArg = args.find(a => a.startsWith('--count='));
  const dryRun = args.includes('--dry-run');
  const skipAvatar = args.includes('--skip-avatar');
  const totalCount = countArg ? parseInt(countArg.split('=')[1], 10) : 50;

  console.log('🚀 虚拟人格批量生成脚本');
  console.log('='.repeat(60));
  console.log(`  目标数量: ${totalCount}`);
  console.log(`  模拟运行: ${dryRun}`);
  console.log(`  跳过头像: ${skipAvatar}`);
  console.log('='.repeat(60));
  console.log('');

  // 计算分布
  const categoryDistribution = calculateDistribution(totalCount);
  console.log('📊 分类分布:');
  for (const [category, count] of categoryDistribution) {
    console.log(`  ${category}: ${count} 个`);
  }
  console.log('');

  // 收集已生成的人格（用于避免重复）
  const existingPersonas: Array<{ username: string; specialties: string[] }> = [];

  let successCount = 0;
  let failCount = 0;
  let batchIndex = 0;

  // 按分类生成
  for (const [category, count] of categoryDistribution) {
    console.log(`\n📁 开始生成 ${category} 分类 (${count} 个)`);
    console.log('-'.repeat(40));

    for (let i = 0; i < count; i++) {
      batchIndex++;
      const activityLevel = pickActivityLevel();

      console.log(`\n[${batchIndex}/${totalCount}] 生成 ${category} 人格 (活跃度: ${activityLevel})`);

      try {
        // 1. AI 生成人格数据
        console.log('  📝 调用 AI 生成人格...');
        const persona = await generateSinglePersona(
          category as PersonaCategory,
          activityLevel,
          existingPersonas.slice(-10), // 只传最近 10 个避免 prompt 过长
          batchIndex
        );

        console.log(`  ✅ ${persona.username}`);
        console.log(`     专长: ${persona.specialties.join(', ')}`);

        if (dryRun) {
          console.log('  [DRY RUN] 跳过数据库写入');
          existingPersonas.push({
            username: persona.username,
            specialties: persona.specialties,
          });
          successCount++;
          continue;
        }

        // 2. 生成头像
        let avatarUrl: string | null = null;
        if (!skipAvatar) {
          console.log('  🎨 生成 AI 头像...');
          avatarUrl = await generateAndUploadAvatar(
            persona,
            category as PersonaCategory,
            '' // userId 还没有，这里传空
          );
          if (avatarUrl) {
            console.log(`  ✅ 头像已上传: ${avatarUrl.slice(0, 50)}...`);
          }
        }

        // 3. 写入数据库
        console.log('  💾 写入数据库...');
        const { userId, personaId } = await createPersonaRecords(
          persona,
          category as PersonaCategory,
          activityLevel,
          avatarUrl
        );

        console.log(`  ✅ 创建成功！`);
        console.log(`     User ID: ${userId}`);
        console.log(`     Persona ID: ${personaId}`);

        existingPersonas.push({
          username: persona.username,
          specialties: persona.specialties,
        });
        successCount++;

      } catch (error: any) {
        console.error(`  ❌ 生成失败: ${error.message}`);
        failCount++;
      }

      // 延迟避免 API 限流
      if (i < count - 1) {
        await sleep(CONFIG.delayBetweenGenerations);
      }
    }
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 生成完成！');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${failCount}`);
  console.log(`  总计: ${batchIndex}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n⚠️ 这是模拟运行，没有实际写入数据库');
    console.log('   移除 --dry-run 参数以执行实际生成');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
