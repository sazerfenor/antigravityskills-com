/**
 * 虚拟作者帖子批量插入脚本
 * 将虚拟作者与 Prompt 配对，创建 community_post 记录
 */

import { db } from '@/core/db';
import { communityPost, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 数据文件路径
const VIRTUAL_AUTHORS_FILE = './virtual-authors-final.json';
const CASES_WITH_IMAGES_FILE = './src/data/cases-with-images.json';
const CASES_OPTIMIZED_FILE = './src/data/cases-optimized.json';

interface VirtualAuthor {
  id: string; // author_01, author_02, ...
  displayName: string;
  username: string;
  bio: string;
  category: string;
  tags: string[];
  matchedPromptIds: string[];
}

interface ImageData {
  caseId: string;
  filename: string;
  r2Key: string;
  fullUrl: string;
}

interface CaseData {
  id: string;
  title: string;
  originalPrompt: string;
  optimizedPrompt: string;
}

/**
 * 清理 Prompt 中的 XML 标签
 * 导出供 prompt-pipeline.ts 复用
 */
export function cleanPromptXmlTags(prompt: string): string {
  return (prompt || '')
    .replace(/<[^>]+>/g, '') // 移除所有 XML 标签
    .replace(/\s+/g, ' ')    // 合并多余空格
    .trim();
}

/**
 * 创建单个 community_post 记录
 * 导出供 prompt-pipeline.ts 复用
 */
export async function createCommunityPostFromCase(params: {
  userId: string;
  imageUrl: string;
  prompt: string;
  title: string;
  model?: string;
}): Promise<string> {
  const postId = uuidv4();
  const now = new Date();
  const cleanPrompt = cleanPromptXmlTags(params.prompt);

  await db().insert(communityPost).values({
    id: postId,
    userId: params.userId,
    imageUrl: params.imageUrl,
    prompt: cleanPrompt,
    title: params.title,
    model: params.model || 'gemini-3-pro-image-preview',
    status: 'pending',
    viewCount: 0,
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  return postId;
}

async function main() {
  console.log('🚀 开始批量插入虚拟作者帖子...\n');

  // 1. 加载数据文件
  const fs = await import('fs/promises');
  const path = await import('path');

  const virtualAuthorsData = JSON.parse(
    await fs.readFile(path.join(process.cwd(), VIRTUAL_AUTHORS_FILE), 'utf-8')
  );
  const casesWithImagesData = JSON.parse(
    await fs.readFile(path.join(process.cwd(), CASES_WITH_IMAGES_FILE), 'utf-8')
  );
  const casesOptimizedData = JSON.parse(
    await fs.readFile(path.join(process.cwd(), CASES_OPTIMIZED_FILE), 'utf-8')
  );

  const virtualAuthors: VirtualAuthor[] = virtualAuthorsData.virtualAuthors;
  const images: ImageData[] = casesWithImagesData.images;
  const cases: CaseData[] = casesOptimizedData.cases;

  // 2. 从数据库获取虚拟作者的真实 UUID
  const dbVirtualUsers = await db()
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.isVirtual, true));

  console.log(`📦 数据库中找到 ${dbVirtualUsers.length} 个虚拟作者`);

  // 创建 displayName → userId 映射
  const authorNameToUserId = new Map<string, string>();
  for (const dbUser of dbVirtualUsers) {
    if (dbUser.name) {
      authorNameToUserId.set(dbUser.name, dbUser.id);
    }
  }

  // 3. 构建 caseId → 图片/案例 映射
  const caseIdToImage = new Map<string, ImageData>();
  for (const img of images) {
    caseIdToImage.set(img.caseId, img);
  }

  const caseIdToCase = new Map<string, CaseData>();
  for (const c of cases) {
    caseIdToCase.set(c.id, c);
  }

  // 4. 批量插入
  let insertedCount = 0;
  let skippedCount = 0;

  for (const author of virtualAuthors) {
    const userId = authorNameToUserId.get(author.displayName);
    if (!userId) {
      console.log(`⚠️ 未找到作者 "${author.displayName}" 的数据库记录，跳过`);
      continue;
    }

    console.log(`\n👤 处理作者: ${author.displayName} (${author.matchedPromptIds.length} 个帖子)`);

    for (const promptId of author.matchedPromptIds) {
      const image = caseIdToImage.get(promptId);
      const caseData = caseIdToCase.get(promptId);

      if (!image) {
        console.log(`  ⚠️ 未找到 ${promptId} 的图片，跳过`);
        skippedCount++;
        continue;
      }

      if (!caseData) {
        console.log(`  ⚠️ 未找到 ${promptId} 的案例数据，跳过`);
        skippedCount++;
        continue;
      }

      try {
        const postId = await createCommunityPostFromCase({
          userId: userId,
          imageUrl: image.fullUrl,
          prompt: caseData.optimizedPrompt,
          title: caseData.title,
          model: 'gemini-2.5-flash-image',
        });

        insertedCount++;
        console.log(`  ✅ 创建帖子: ${caseData.title} (${postId})`);
      } catch (error: any) {
        console.log(`  ❌ 插入失败: ${error.message}`);
        skippedCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 完成！`);
  console.log(`   ✅ 成功插入: ${insertedCount} 个帖子`);
  console.log(`   ⚠️ 跳过: ${skippedCount} 个`);
  console.log('='.repeat(50));

  process.exit(0);
}

main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
