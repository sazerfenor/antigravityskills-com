import fs from 'fs';
import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 基于关键词规则快速分配 subcategory
 */
async function fixSubcategories() {
  console.log('🔧 修复 subcategory（基于规则引擎）...\n');

  // 1. 加载数据
  const analyzed = JSON.parse(fs.readFileSync('logs/prompts-with-subcategory.json', 'utf-8'));
  const unknown = analyzed.filter((p: any) => !p.subcategory || p.subcategory === 'Unknown');
  console.log(`📂 需要修复的帖子: ${unknown.length} 条\n`);

  // 2. 关键词规则引擎
  const RULES: Record<string, { keywords: string[], subcategory: string }[]> = {
    photography: [
      { keywords: ['portrait', 'headshot', 'face', 'woman', 'man', 'person'], subcategory: 'Portrait' },
      { keywords: ['street', 'urban', 'city', 'candid'], subcategory: 'Street Photography' },
      { keywords: ['fashion', 'editorial', 'runway', 'model', 'vogue'], subcategory: 'Fashion Editorial' },
      { keywords: ['macro', 'close-up', 'detail', 'texture'], subcategory: 'Macro Photography' },
      { keywords: ['landscape', 'nature', 'mountain', 'ocean', 'scenery'], subcategory: 'Landscape' },
      { keywords: ['product', 'commercial', 'studio shot'], subcategory: 'Product Photography' },
      { keywords: ['architecture', 'building', 'interior'], subcategory: 'Architectural' },
      { keywords: ['sport', 'athlete', 'action'], subcategory: 'Sports' },
      { keywords: ['wildlife', 'animal', 'bird'], subcategory: 'Wildlife' },
    ],
    'art-illustration': [
      { keywords: ['painting', 'brushstroke', 'oil', 'watercolor'], subcategory: 'Digital Painting' },
      { keywords: ['concept art', 'game art', 'environment design'], subcategory: 'Concept Art' },
      { keywords: ['character', 'warrior', 'hero', 'protagonist'], subcategory: 'Character Illustration' },
      { keywords: ['fantasy', 'dragon', 'magic', 'medieval'], subcategory: 'Fantasy Art' },
      { keywords: ['surreal', 'dreamlike', 'abstract'], subcategory: 'Surrealism' },
      { keywords: ['comic', 'manga', 'anime', 'cartoon'], subcategory: 'Comic/Manga' },
    ],
    design: [
      { keywords: ['quote', 'typography', 'text', 'motivational'], subcategory: 'Quote Card' },
      { keywords: ['logo', 'branding', 'identity'], subcategory: 'Logo Design' },
      { keywords: ['poster', 'flyer'], subcategory: 'Poster Design' },
      { keywords: ['infographic', 'data visualization'], subcategory: 'Infographic' },
      { keywords: ['icon', 'symbol'], subcategory: 'Icon Design' },
    ],
    'commercial-product': [
      { keywords: ['product', 'packaging', 'bottle', 'box'], subcategory: 'Product Shot' },
      { keywords: ['food', 'dish', 'meal', 'cuisine'], subcategory: 'Food Photography' },
      { keywords: ['cosmetics', 'makeup', 'beauty'], subcategory: 'Cosmetics' },
    ],
    'character-design': [
      { keywords: ['3d character', 'cgi', 'render'], subcategory: '3D Character' },
      { keywords: ['2d', 'flat', 'vector'], subcategory: '2D Character' },
      { keywords: ['mascot', 'cute', 'kawaii'], subcategory: 'Mascot' },
    ],
  };

  // 3. 应用规则
  const fixed: any[] = [];
  for (const item of unknown) {
    const prompt = item.prompt.toLowerCase();
    const category = item.category;
    const rules = RULES[category] || [];

    let matched = false;
    for (const rule of rules) {
      if (rule.keywords.some(kw => prompt.includes(kw))) {
        item.subcategory = rule.subcategory;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // 默认分配（按 category 的第一个 subcategory）
      const defaults: Record<string, string> = {
        photography: 'Portrait',
        'art-illustration': 'Digital Painting',
        design: 'Quote Card',
        'commercial-product': 'Product Shot',
        'character-design': '3D Character',
      };
      item.subcategory = defaults[category] || 'Portrait';
    }

    fixed.push(item);
  }

  console.log(`✅ 规则引擎修复完成: ${fixed.length} 条\n`);

  // 4. 回填到数据库
  console.log('🔄 回填到数据库...\n');
  let successCount = 0;

  for (const item of fixed) {
    try {
      await db()
        .update(communityPost)
        .set({ subcategory: item.subcategory })
        .where(eq(communityPost.id, item.id));

      console.log(`✅ ${item.id}: ${item.subcategory}`);
      successCount++;
    } catch (error: any) {
      console.log(`❌ ${item.id}: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 回填统计:`);
  console.log(`   成功: ${successCount}`);
  console.log(`   失败: ${fixed.length - successCount}`);
  console.log(`   总计: ${fixed.length}`);
  console.log(`${'='.repeat(60)}\n`);

  // 5. 验证最终结果
  const allPosts = await db().select().from(communityPost);
  const filled = allPosts.filter(p => p.subcategory);

  console.log('📊 数据库最终状态:');
  console.log(`   总帖子数: ${allPosts.length}`);
  console.log(`   有 subcategory: ${filled.length}`);
  console.log(`   缺少 subcategory: ${allPosts.length - filled.length}`);

  // 6. 统计 subcategory 分布
  const stats: Record<string, number> = {};
  filled.forEach(p => {
    stats[p.subcategory!] = (stats[p.subcategory!] || 0) + 1;
  });

  console.log('\n📊 Subcategory 分布:');
  Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([sub, count]) => {
    console.log(`   ${sub}: ${count}`);
  });

  console.log('\n✅ 修复完成！');
  process.exit(0);
}

fixSubcategories().catch(error => {
  console.error('❌ 修复失败:', error);
  process.exit(1);
});
