/**
 * 批量生成 138 张缩略图 - V2
 * 
 * 完整关系链：
 * VirtualUser (matchedPromptIds) → Case (author) → OriginalAuthor (authorUrl, postUrl)
 * 
 * 功能：
 * 1. 调用 API 生成图片
 * 2. 下载到本地 public/generated-images/ 目录
 * 3. 生成完整的对应关系 JSON
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000/api/ai/generate';
const DELAY_MS = 4000;
const TEST_MODE = process.argv.includes('--test');
const TEST_COUNT = 5;
const OUTPUT_DIR = 'public/generated-images';

const ADMIN_COOKIE = process.env.ADMIN_COOKIE || '';

if (!ADMIN_COOKIE) {
  console.error('❌ 未设置 ADMIN_COOKIE');
  process.exit(1);
}

// ========== 数据结构定义 ==========

interface VirtualAuthorFinal {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  category: string;
  tags: string[];
  matchedPromptIds: string[];
}

interface VirtualAuthorInserted {
  id: string; // 数据库中的实际 ID
  username: string;
  displayName: string;
  email: string;
  category: string;
  promptCount: number;
}

interface AuthorInfo {
  authorUrl: string;
  caseCount: number;
  cases: Array<{ caseId: string; titleEN: string; titleCN: string; postUrl: string }>;
}

interface GeneratedItem {
  caseId: string;
  title: string;
  localImagePath: string;
  r2ImageUrl: string;
  prompt: string;
  originalAuthor: {
    handle: string;
    profileUrl: string;
    postUrl: string;
  };
  virtualUser: {
    id: string;
    displayName: string;
    username: string;
    email: string;
    category: string;
  };
  generatedAt: string;
}

// ========== 加载数据 ==========

function loadVirtualAuthorMapping(): Map<string, VirtualAuthorInserted> {
  // 加载原始映射（包含 matchedPromptIds）
  const finalData = JSON.parse(fs.readFileSync('./virtual-authors-final.json', 'utf-8'));
  // 加载插入后的数据（包含数据库 ID）
  const insertedData = JSON.parse(fs.readFileSync('./virtual-authors-inserted.json', 'utf-8'));
  
  // 建立 promptId → VirtualUser 的映射
  const promptToVirtualUser = new Map<string, VirtualAuthorInserted>();
  
  for (const author of finalData.virtualAuthors as VirtualAuthorFinal[]) {
    // 通过 username 找到数据库中的记录
    const inserted = insertedData.authors.find(
      (a: VirtualAuthorInserted) => a.username === author.username
    );
    
    if (inserted) {
      for (const promptId of author.matchedPromptIds) {
        promptToVirtualUser.set(promptId, inserted);
      }
    }
  }
  
  console.log(`📋 已加载 ${promptToVirtualUser.size} 个 promptId → VirtualUser 映射`);
  return promptToVirtualUser;
}

function loadAuthorInfo(): Record<string, AuthorInfo> {
  const data = JSON.parse(fs.readFileSync('src/data/cases-author-info.json', 'utf-8'));
  return data.byAuthor || {};
}

function getOriginalAuthorInfo(caseId: string, authorHandle: string, authorInfoMap: Record<string, AuthorInfo>) {
  const authorInfo = authorInfoMap[authorHandle];
  const caseInfo = authorInfo?.cases?.find(c => c.caseId === caseId);
  
  return {
    handle: authorHandle || 'Unknown',
    profileUrl: authorInfo?.authorUrl || '',
    postUrl: caseInfo?.postUrl || '',
  };
}

function stripXmlTags(prompt: string): string {
  return prompt.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
}

async function generateAndDownload(
  caseData: any,
  authorInfoMap: Record<string, AuthorInfo>,
  promptToVirtualUser: Map<string, VirtualAuthorInserted>
): Promise<GeneratedItem | null> {
  try {
    const cleanPrompt = stripXmlTags(caseData.optimizedPrompt);
    
    if (cleanPrompt.length < 20) {
      throw new Error('Prompt too short');
    }

    const body = {
      provider: 'gemini',
      mediaType: 'image',
      model: 'gemini-3-pro-image-preview',
      prompt: cleanPrompt,
      scene: 'text-to-image',
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ADMIN_COOKIE,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    // 提取图片 URL
    const taskInfo = result.data?.taskInfo;
    let r2ImageUrl: string | null = null;
    
    if (typeof taskInfo === 'string') {
      const parsed = JSON.parse(taskInfo);
      r2ImageUrl = parsed?.images?.[0]?.imageUrl;
    } else if (typeof taskInfo === 'object') {
      r2ImageUrl = taskInfo?.images?.[0]?.imageUrl;
    }

    if (!r2ImageUrl) {
      throw new Error('No image URL in response');
    }

    // 下载到本地
    const ext = r2ImageUrl.split('.').pop()?.split('?')[0] || 'png';
    const filename = `${caseData.id}.${ext}`;
    const localPath = path.join(OUTPUT_DIR, filename);
    
    await downloadImage(r2ImageUrl, localPath);

    // 获取原始作者信息
    const originalAuthor = getOriginalAuthorInfo(caseData.id, caseData.author || '', authorInfoMap);
    
    // 获取虚拟用户（通过 matchedPromptIds 映射）
    const virtualUser = promptToVirtualUser.get(caseData.id);
    
    if (!virtualUser) {
      console.warn(`  ⚠️ 未找到 ${caseData.id} 对应的虚拟用户`);
    }

    return {
      caseId: caseData.id,
      title: caseData.title,
      localImagePath: `/generated-images/${filename}`,
      r2ImageUrl,
      prompt: cleanPrompt,
      originalAuthor,
      virtualUser: virtualUser ? {
        id: virtualUser.id,
        displayName: virtualUser.displayName,
        username: virtualUser.username,
        email: virtualUser.email,
        category: virtualUser.category,
      } : {
        id: '',
        displayName: 'Unknown',
        username: 'unknown',
        email: '',
        category: '',
      },
      generatedAt: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error(`  ❌ 错误: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🖼️ 批量生成 Cases 缩略图 V2');
  console.log('='.repeat(60));
  console.log(`📡 API: ${API_URL}`);
  console.log(`📂 输出目录: ${OUTPUT_DIR}`);
  console.log(`🧪 测试模式: ${TEST_MODE ? `是 (前${TEST_COUNT}张)` : '否'}`);

  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 加载映射数据
  const promptToVirtualUser = loadVirtualAuthorMapping();
  const authorInfoMap = loadAuthorInfo();

  // 加载 cases 数据
  const casesForImageGen = JSON.parse(fs.readFileSync('src/data/cases-for-image-gen.json', 'utf-8'));
  const originalCases = JSON.parse(fs.readFileSync('src/data/cases.json', 'utf-8'));
  
  // 合并 author 信息
  const cases = casesForImageGen.cases.map((c: any) => {
    const original = originalCases.cases.find((oc: any) => oc.id === c.id);
    return { ...c, author: original?.author };
  });

  console.log(`📊 总计 ${cases.length} 个 cases`);

  // 加载进度
  const progressFile = 'logs/batch-image-progress-v2.json';
  let progress: { completed: GeneratedItem[], failed: string[], lastIndex: number } = {
    completed: [],
    failed: [],
    lastIndex: -1,
  };
  
  if (fs.existsSync(progressFile)) {
    progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
  }

  console.log(`\n📋 已完成: ${progress.completed.length}, 已失败: ${progress.failed.length}`);

  const startIndex = progress.lastIndex + 1;
  const endIndex = TEST_MODE ? Math.min(startIndex + TEST_COUNT, cases.length) : cases.length;

  console.log(`📌 本次处理: ${startIndex} - ${endIndex - 1} (共 ${endIndex - startIndex} 张)\n`);

  const startTime = Date.now();

  for (let i = startIndex; i < endIndex; i++) {
    const caseData = cases[i];
    
    if (progress.completed.some(c => c.caseId === caseData.id)) {
      console.log(`[${i + 1}/${cases.length}] ${caseData.id} - ⏭️ 已完成，跳过`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${cases.length}] ${caseData.id} - ${caseData.title.substring(0, 25)}... `);

    const result = await generateAndDownload(caseData, authorInfoMap, promptToVirtualUser);

    if (result) {
      progress.completed.push(result);
      console.log(`✅ ${result.virtualUser.displayName}`);
    } else {
      progress.failed.push(caseData.id);
      console.log('❌');
    }

    progress.lastIndex = i;
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));

    if (i < endIndex - 1) {
      await sleep(DELAY_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('📊 生成完成');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${progress.completed.length}`);
  console.log(`❌ 失败: ${progress.failed.length}`);
  console.log(`⏱️ 耗时: ${elapsed} 分钟`);

  // 生成最终的对应关系 JSON
  const outputJson = {
    generatedAt: new Date().toISOString(),
    totalCount: progress.completed.length,
    items: progress.completed,
  };

  fs.writeFileSync('src/data/generated-thumbnails.json', JSON.stringify(outputJson, null, 2));
  
  console.log(`\n📁 图片目录: ${OUTPUT_DIR}`);
  console.log(`📁 进度文件: ${progressFile}`);
  console.log(`📁 对应关系: src/data/generated-thumbnails.json`);
}

main().catch(console.error);
