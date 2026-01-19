/**
 * 数据迁移脚本：为现有 Skills 生成 displayName
 *
 * 执行方式：npx tsx scripts/migrate-display-names.ts
 *
 * 功能：
 * 1. 更新 antigravitySkills 表的 displayName 字段
 * 2. 更新 communityPost 表的 title 字段（Skill 类帖子）
 */

import { db } from '@/core/db';
import { antigravitySkills, communityPost } from '@/config/db/schema.sqlite';
import { eq, sql, isNull, like } from 'drizzle-orm';

// ============================================
// 硬编码的特殊名称覆盖
// 来自原 display-name.ts 的 DISPLAY_NAME_OVERRIDES
// ============================================

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  'ui-ux-designer': 'UI/UX Designer',
  'uiux-designer': 'UIUX Designer',
  'ai-assistant': 'AI Assistant',
  'ai-ml-developer': 'AI/ML Developer',
  'tdd-orchestrator': 'TDD Orchestrator',
  'api-builder': 'API Builder',
  'sql-expert': 'SQL Expert',
  'llm-application-dev': 'LLM Application Dev',
  'mcp-builder': 'MCP Builder',
  'seo-content-creation': 'SEO Content Creation',
  'ios-developer': 'iOS Developer',
  'ios-swift-developer': 'iOS Swift Developer',
  'macos-developer': 'macOS Developer',
};

// 需要保留大写的缩写词
const UPPERCASE_ACRONYMS = [
  'UI', 'UX', 'API', 'SEO', 'AI', 'ML', 'TDD', 'SQL', 'LLM', 'MCP',
  'HTML', 'CSS', 'JS', 'TS', 'PHP', 'AWS', 'GCP', 'CLI', 'SDK', 'REST',
  'HTTP', 'HTTPS', 'JSON', 'XML', 'YAML', 'CSV', 'PDF', 'SVG', 'PNG',
];

// ============================================
// 转换函数
// ============================================

/**
 * 将 kebab-case 转换为人类可读的 displayName
 */
function generateDisplayName(name: string): string {
  if (!name) return '';

  // 检查是否有硬编码覆盖
  const override = DISPLAY_NAME_OVERRIDES[name.toLowerCase()];
  if (override) return override;

  // 将 kebab-case 拆分为单词
  const words = name.split('-');

  // 转换每个单词
  const transformedWords = words.map((word) => {
    const upperWord = word.toUpperCase();

    // 检查是否是缩写词
    if (UPPERCASE_ACRONYMS.includes(upperWord)) {
      return upperWord;
    }

    // 普通单词：首字母大写
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return transformedWords.join(' ');
}

// ============================================
// 迁移逻辑
// ============================================

async function migrateAntigravitySkills(): Promise<number> {
  console.log('\n📦 迁移 antigravitySkills 表...');

  // 获取所有没有 displayName 的记录
  const skills = await db()
    .select({ id: antigravitySkills.id, name: antigravitySkills.name })
    .from(antigravitySkills)
    .where(isNull(antigravitySkills.displayName));

  console.log(`   找到 ${skills.length} 条需要迁移的记录`);

  let updated = 0;
  for (const skill of skills) {
    const displayName = generateDisplayName(skill.name);

    await db()
      .update(antigravitySkills)
      .set({ displayName })
      .where(eq(antigravitySkills.id, skill.id));

    console.log(`   ✓ ${skill.name} → ${displayName}`);
    updated++;
  }

  return updated;
}

async function migrateCommunityPosts(): Promise<number> {
  console.log('\n📝 迁移 communityPost 表 (Skill 类帖子)...');

  // 获取所有 seoSlug 以 "skill-" 开头且 title 包含连字符的帖子
  // 这些是 Skill 类帖子，title 可能还是 kebab-case
  const posts = await db()
    .select({
      id: communityPost.id,
      title: communityPost.title,
      seoSlug: communityPost.seoSlug,
    })
    .from(communityPost)
    .where(like(communityPost.seoSlug, 'skill-%'));

  console.log(`   找到 ${posts.length} 条 Skill 类帖子`);

  let updated = 0;
  for (const post of posts) {
    // 检查 title 是否是 kebab-case（包含连字符）
    if (post.title && post.title.includes('-')) {
      const displayName = generateDisplayName(post.title);

      await db()
        .update(communityPost)
        .set({ title: displayName })
        .where(eq(communityPost.id, post.id));

      console.log(`   ✓ ${post.title} → ${displayName}`);
      updated++;
    }
  }

  return updated;
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('🚀 开始 displayName 数据迁移...');
  console.log('=' .repeat(50));

  try {
    const skillsUpdated = await migrateAntigravitySkills();
    const postsUpdated = await migrateCommunityPosts();

    console.log('\n' + '=' .repeat(50));
    console.log('✅ 迁移完成！');
    console.log(`   - antigravitySkills 更新: ${skillsUpdated} 条`);
    console.log(`   - communityPost 更新: ${postsUpdated} 条`);
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  }
}

main();
