import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { sql } from 'drizzle-orm';

async function verifySchemaFields() {
  console.log('🔍 验证数据库字段完整性...\n');

  try {
    // 1. 查询表结构（SQLite PRAGMA）
    console.log('📊 community_post 表结构:');
    const tableInfo = await db().all(sql`PRAGMA table_info(community_post)`);

    console.log('\n字段列表:');
    tableInfo.forEach((field: any) => {
      console.log(`  ${field.name} (${field.type}) ${field.notnull ? 'NOT NULL' : ''} ${field.dflt_value ? `DEFAULT ${field.dflt_value}` : ''}`);
    });

    // 2. 检查关键字段是否存在
    const fieldNames = tableInfo.map((f: any) => f.name);
    const requiredFields = ['category', 'subcategory', 'visual_tags'];

    console.log('\n✅ 关键字段检查:');
    requiredFields.forEach(field => {
      const exists = fieldNames.includes(field);
      console.log(`  ${field}: ${exists ? '✅ 存在' : '❌ 缺失'}`);
    });

    // 3. 查询样本数据，检查字段是否有值
    console.log('\n📦 样本数据检查（最近 5 条记录）:');
    const samples = await db()
      .select({
        id: communityPost.id,
        category: communityPost.category,
        subcategory: communityPost.subcategory,
        visualTags: communityPost.visualTags,
      })
      .from(communityPost)
      .limit(5);

    if (samples.length === 0) {
      console.log('  ⚠️ 表中暂无数据');
    } else {
      samples.forEach(s => {
        console.log(`  ID: ${s.id}`);
        console.log(`    category: ${s.category || '(null)'}`);
        console.log(`    subcategory: ${s.subcategory || '(null)'}`);
        console.log(`    visualTags: ${s.visualTags || '(null)'}`);
        console.log('');
      });
    }

    // 4. 统计字段填充率
    const [total] = await db()
      .select({ count: sql<number>`count(*)` })
      .from(communityPost);

    const [categoryFilled] = await db()
      .select({ count: sql<number>`count(*)` })
      .from(communityPost)
      .where(sql`${communityPost.category} IS NOT NULL`);

    const [subcategoryFilled] = await db()
      .select({ count: sql<number>`count(*)` })
      .from(communityPost)
      .where(sql`${communityPost.subcategory} IS NOT NULL`);

    const [visualTagsFilled] = await db()
      .select({ count: sql<number>`count(*)` })
      .from(communityPost)
      .where(sql`${communityPost.visualTags} IS NOT NULL`);

    console.log('📈 字段填充率统计:');
    console.log(`  总记录数: ${total.count}`);
    console.log(`  category 填充: ${categoryFilled.count} / ${total.count} (${((categoryFilled.count / total.count) * 100).toFixed(1)}%)`);
    console.log(`  subcategory 填充: ${subcategoryFilled.count} / ${total.count} (${((subcategoryFilled.count / total.count) * 100).toFixed(1)}%)`);
    console.log(`  visualTags 填充: ${visualTagsFilled.count} / ${total.count} (${((visualTagsFilled.count / total.count) * 100).toFixed(1)}%)`);

    console.log('\n✅ 验证完成！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 验证失败:', error.message);
    process.exit(1);
  }
}

verifySchemaFields().catch(console.error);
