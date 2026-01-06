/**
 * 分析脚本：按用途聚类 Prompts 和作者
 * 
 * 目标：将 138 prompts 和 74 作者聚类成 10-20 个虚拟作者
 */

import casesData from '../src/data/cases.json';
import authorInfo from '../src/data/cases-author-info.json';
import fs from 'fs';

interface CategoryStats {
  category: string;
  count: number;
  caseIds: string[];
  authors: Set<string>;
  sampleTitles: string[];
}

async function analyzeCategories() {
  console.log('='.repeat(80));
  console.log('📊 Prompts 用途分析与作者聚类');
  console.log('='.repeat(80));

  // 1. 统计所有 inferred_intent
  const intentMap = new Map<string, CategoryStats>();

  for (const caseItem of casesData.cases) {
    const intents = caseItem.structured?.inferred_intent || [];
    
    for (const intent of intents) {
      if (!intentMap.has(intent)) {
        intentMap.set(intent, {
          category: intent,
          count: 0,
          caseIds: [],
          authors: new Set(),
          sampleTitles: [],
        });
      }

      const stats = intentMap.get(intent)!;
      stats.count++;
      stats.caseIds.push(caseItem.id);
      stats.authors.add(caseItem.author);
      
      if (stats.sampleTitles.length < 3) {
        stats.sampleTitles.push(caseItem.title);
      }
    }
  }

  // 2. 按数量排序
  const sortedCategories = Array.from(intentMap.values())
    .sort((a, b) => b.count - a.count);

  console.log('\n📋 用途分类统计（按数量排序）:\n');
  console.log('分类名称                  | Prompts | 作者数 | 示例');
  console.log('-'.repeat(80));

  for (const cat of sortedCategories) {
    const categoryName = cat.category.padEnd(25);
    const promptCount = cat.count.toString().padEnd(7);
    const authorCount = cat.authors.size.toString().padEnd(6);
    const samples = cat.sampleTitles.slice(0, 2).join(', ');
    
    console.log(`${categoryName} | ${promptCount} | ${authorCount} | ${samples}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`总分类数: ${sortedCategories.length}`);
  console.log(`总 Prompts: ${casesData.cases.length}`);
  console.log(`总作者: ${Object.keys(authorInfo.byAuthor).length}`);
  console.log('='.repeat(80));

  // 3. 建议合并方案
  console.log('\n💡 建议合并为以下虚拟作者类别:\n');

  const mergedCategories = mergeSimilarCategories(sortedCategories);
  
  let totalAuthors = 0;
  for (const [i, category] of mergedCategories.entries()) {
    console.log(`${i + 1}. ${category.name}`);
    console.log(`   - Prompts: ${category.promptCount}`);
    console.log(`   - 原始作者: ${category.originalAuthors}`);
    console.log(`   - 建议虚拟作者数: ${category.suggestedVirtualAuthors}`);
    console.log(`   - 包含分类: ${category.subcategories.join(', ')}`);
    console.log('');
    
    totalAuthors += category.suggestedVirtualAuthors;
  }

  console.log('='.repeat(80));
  console.log(`合并后虚拟作者总数: ${totalAuthors} (从 74 减少到 ${totalAuthors})`);
  console.log('='.repeat(80));

  // 4. 生成详细映射
  const detailedMapping = generateDetailedMapping(mergedCategories, sortedCategories);
  
  fs.writeFileSync(
    'category-analysis.json',
    JSON.stringify({
      rawCategories: sortedCategories.map(c => ({
        ...c,
        authors: Array.from(c.authors),
      })),
      mergedCategories,
      detailedMapping,
      summary: {
        originalAuthors: 74,
        finalVirtualAuthors: totalAuthors,
        reduction: `${((1 - totalAuthors / 74) * 100).toFixed(1)}%`,
      }
    }, null, 2)
  );

  console.log('\n💾 详细分析已保存到: category-analysis.json');
}

/**
 * 合并相似分类
 */
function mergeSimilarCategories(categories: CategoryStats[]) {
  return [
    {
      name: 'Logo & Icon Design',
      subcategories: ['Logo Design', 'App Icon', 'Icon'],
      promptCount: sumPrompts(categories, ['Logo Design', 'App Icon', 'Icon']),
      originalAuthors: countAuthors(categories, ['Logo Design', 'App Icon', 'Icon']),
      suggestedVirtualAuthors: 2,
    },
    {
      name: 'Poster & Marketing',
      subcategories: ['Poster', 'Flyer', 'Marketing Poster', 'Advertisement'],
      promptCount: sumPrompts(categories, ['Poster', 'Flyer', 'Marketing Poster']),
      originalAuthors: countAuthors(categories, ['Poster', 'Flyer', 'Marketing Poster']),
      suggestedVirtualAuthors: 2,
    },
    {
      name: 'UI & App Design',
      subcategories: ['UI Design', 'App UI', 'Web Interface'],
      promptCount: sumPrompts(categories, ['UI Design', 'App UI']),
      originalAuthors: countAuthors(categories, ['UI Design', 'App UI']),
      suggestedVirtualAuthors: 2,
    },
    {
      name: 'Character & Avatar',
      subcategories: ['Character', 'Avatar', 'Profile', 'Portrait'],
      promptCount: sumPrompts(categories, ['Character', 'Avatar', 'Profile']),
      originalAuthors: countAuthors(categories, ['Character', 'Avatar', 'Profile']),
      suggestedVirtualAuthors: 2,
    },
    {
      name: '3D & Product Rendering',
      subcategories: ['3D Rendering', 'Product', 'E-commerce'],
      promptCount: sumPrompts(categories, ['3D Rendering', 'Product', 'E-commerce']),
      originalAuthors: countAuthors(categories, ['3D Rendering', 'Product', 'E-commerce']),
      suggestedVirtualAuthors: 2,
    },
    {
      name: 'Presentation & Infographic',
      subcategories: ['Presentation', 'Infographic', 'Diagram'],
      promptCount: sumPrompts(categories, ['Presentation', 'Infographic', 'Diagram']),
      originalAuthors: countAuthors(categories, ['Presentation', 'Infographic']),
      suggestedVirtualAuthors: 1,
    },
    {
      name: 'General Creative',
      subcategories: ['General', 'Other', 'Creative'],
      promptCount: sumPrompts(categories, ['General', 'Other']),
      originalAuthors: countAuthors(categories, ['General', 'Other']),
      suggestedVirtualAuthors: 2,
    },
  ];
}

function sumPrompts(categories: CategoryStats[], names: string[]): number {
  return categories
    .filter(c => names.includes(c.category))
    .reduce((sum, c) => sum + c.count, 0);
}

function countAuthors(categories: CategoryStats[], names: string[]): number {
  const allAuthors = new Set<string>();
  categories
    .filter(c => names.includes(c.category))
    .forEach(c => c.authors.forEach(a => allAuthors.add(a)));
  return allAuthors.size;
}

function generateDetailedMapping(mergedCategories: any[], rawCategories: CategoryStats[]) {
  const mapping: Record<string, string> = {};
  
  for (const merged of mergedCategories) {
    for (const subcategory of merged.subcategories) {
      const category = rawCategories.find(c => c.category === subcategory);
      if (category) {
        for (const caseId of category.caseIds) {
          mapping[caseId] = merged.name;
        }
      }
    }
  }
  
  return mapping;
}

// 运行分析
analyzeCategories().catch(console.error);
