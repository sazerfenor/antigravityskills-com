/**
 * 数据准备脚本 - 将原始 prompts 转换为 Pipeline 输入格式
 */

import fs from 'fs';
import path from 'path';

const VERTICAL_TO_CATEGORY: Record<string, string> = {
  'Design': 'design',
  'Photography': 'photography',
  'Art': 'art-illustration',
  'Product': 'commercial-product',
  'Commercial': 'commercial-product',
  'Character': 'character-design',
};

interface SourcePrompt {
  id: number;
  prompt: string;
  title?: string;
  vertical: string;
  subject_type: string;
  visual_style?: string;
  seo_intent?: string;
  keywords?: string[];
  [key: string]: any;
}

interface EnrichedPromptInput {
  id: string;
  prompt: string;
  title?: string;
  subject?: string;
  category: string;
  subcategory: string;
  visualTags: string[];
}

function enrichPrompt(source: SourcePrompt): EnrichedPromptInput {
  const category = VERTICAL_TO_CATEGORY[source.vertical] || 'photography';
  const visualTags = [
    source.visual_style,
    ...(source.keywords || [])
  ].filter(Boolean) as string[];

  return {
    id: String(source.id),
    prompt: source.prompt,
    title: source.title,
    subject: source.seo_intent,
    category,
    subcategory: source.subject_type,
    visualTags,
  };
}

async function main() {
  const inputPath = path.join(process.cwd(), 'docs/prompt-scoring/output/merged-prompts-full.json');
  const outputPath = path.join(process.cwd(), 'prompts-input-enriched.json');

  console.log('Reading source data...');
  const sourceData = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as SourcePrompt[];
  console.log('Loaded', sourceData.length, 'prompts');

  console.log('Enriching prompts...');
  const enrichedPrompts = sourceData.map(enrichPrompt);

  const categoryCounts = enrichedPrompts.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const subcategoryCounts = enrichedPrompts.reduce((acc, p) => {
    acc[p.subcategory] = (acc[p.subcategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Category Distribution:');
  Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log('  ', cat, ':', count);
  });

  console.log('Subcategory Count:', Object.keys(subcategoryCounts).length, 'unique values');
  console.log('Top 10 Subcategories:');
  Object.entries(subcategoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([subcat, count]) => {
      console.log('  ', subcat, ':', count);
    });

  const missingCategory = enrichedPrompts.filter(p => !p.category);
  const missingSubcategory = enrichedPrompts.filter(p => !p.subcategory);
  const missingVisualTags = enrichedPrompts.filter(p => !p.visualTags.length);

  console.log('Data Validation:');
  console.log('  Missing category:', missingCategory.length);
  console.log('  Missing subcategory:', missingSubcategory.length);
  console.log('  Missing visualTags:', missingVisualTags.length);

  const output = {
    meta: {
      total: enrichedPrompts.length,
      generatedAt: new Date().toISOString(),
      categories: categoryCounts,
      subcategoryCount: Object.keys(subcategoryCounts).length,
    },
    prompts: enrichedPrompts,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log('Enriched data saved to:', outputPath);
  console.log('Total prompts:', enrichedPrompts.length);
}

main().catch(console.error);
