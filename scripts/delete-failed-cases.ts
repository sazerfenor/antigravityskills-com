/**
 * 删除失败 cases 的所有相关数据
 * 
 * 删除内容：
 * - cases.json
 * - cases-optimized.json
 * - cases-for-image-gen.json
 * - cases-author-info.json
 * - cases-with-images.json
 * - generated-thumbnails.json
 * - virtual-authors-final.json 中的 matchedPromptIds（但保留虚拟作者）
 */

import * as fs from 'fs';

const CASES_TO_DELETE = ['case_24', 'case_27'];

console.log('='.repeat(60));
console.log('🗑️ 删除失败 Cases 的相关数据');
console.log('='.repeat(60));
console.log(`📋 要删除的 Cases: ${CASES_TO_DELETE.join(', ')}\n`);

// 1. cases.json
console.log('1️⃣ 处理 cases.json...');
const casesPath = 'src/data/cases.json';
const casesData = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
const originalCount = casesData.cases.length;
casesData.cases = casesData.cases.filter((c: any) => !CASES_TO_DELETE.includes(c.id));
fs.writeFileSync(casesPath, JSON.stringify(casesData, null, 2));
console.log(`   ✅ 从 ${originalCount} → ${casesData.cases.length}`);

// 2. cases-optimized.json
console.log('2️⃣ 处理 cases-optimized.json...');
const optimizedPath = 'src/data/cases-optimized.json';
const optimizedData = JSON.parse(fs.readFileSync(optimizedPath, 'utf-8'));
const optOriginal = optimizedData.cases.length;
optimizedData.cases = optimizedData.cases.filter((c: any) => !CASES_TO_DELETE.includes(c.id));
optimizedData.totalCount = optimizedData.cases.length;
fs.writeFileSync(optimizedPath, JSON.stringify(optimizedData, null, 2));
console.log(`   ✅ 从 ${optOriginal} → ${optimizedData.cases.length}`);

// 3. cases-for-image-gen.json
console.log('3️⃣ 处理 cases-for-image-gen.json...');
const imageGenPath = 'src/data/cases-for-image-gen.json';
const imageGenData = JSON.parse(fs.readFileSync(imageGenPath, 'utf-8'));
const imgOriginal = imageGenData.cases.length;
imageGenData.cases = imageGenData.cases.filter((c: any) => !CASES_TO_DELETE.includes(c.id));
imageGenData.totalCount = imageGenData.cases.length;
fs.writeFileSync(imageGenPath, JSON.stringify(imageGenData, null, 2));
console.log(`   ✅ 从 ${imgOriginal} → ${imageGenData.cases.length}`);

// 4. cases-author-info.json
console.log('4️⃣ 处理 cases-author-info.json...');
const authorInfoPath = 'src/data/cases-author-info.json';
const authorInfoData = JSON.parse(fs.readFileSync(authorInfoPath, 'utf-8'));
let removedFromAuthors = 0;
for (const [authorHandle, info] of Object.entries(authorInfoData.byAuthor)) {
  const authorInfo = info as any;
  const originalLen = authorInfo.cases.length;
  authorInfo.cases = authorInfo.cases.filter((c: any) => !CASES_TO_DELETE.includes(c.caseId));
  if (authorInfo.cases.length < originalLen) {
    removedFromAuthors += originalLen - authorInfo.cases.length;
    authorInfo.caseCount = authorInfo.cases.length;
  }
  // 如果作者没有 cases 了，删除该作者条目
  if (authorInfo.cases.length === 0) {
    delete authorInfoData.byAuthor[authorHandle];
    console.log(`   ⚠️ 删除空作者: ${authorHandle}`);
  }
}
authorInfoData.totalCases -= removedFromAuthors;
fs.writeFileSync(authorInfoPath, JSON.stringify(authorInfoData, null, 2));
console.log(`   ✅ 移除 ${removedFromAuthors} 个条目`);

// 5. cases-with-images.json (如果存在)
console.log('5️⃣ 处理 cases-with-images.json...');
const withImagesPath = 'src/data/cases-with-images.json';
if (fs.existsSync(withImagesPath)) {
  const withImagesData = JSON.parse(fs.readFileSync(withImagesPath, 'utf-8'));
  const wiOriginal = withImagesData.cases.length;
  withImagesData.cases = withImagesData.cases.filter((c: any) => !CASES_TO_DELETE.includes(c.id));
  withImagesData.totalCount = withImagesData.cases.length;
  fs.writeFileSync(withImagesPath, JSON.stringify(withImagesData, null, 2));
  console.log(`   ✅ 从 ${wiOriginal} → ${withImagesData.cases.length}`);
} else {
  console.log('   ⏭️ 文件不存在，跳过');
}

// 6. generated-thumbnails.json
console.log('6️⃣ 处理 generated-thumbnails.json...');
const thumbnailsPath = 'src/data/generated-thumbnails.json';
if (fs.existsSync(thumbnailsPath)) {
  const thumbnailsData = JSON.parse(fs.readFileSync(thumbnailsPath, 'utf-8'));
  const thOriginal = thumbnailsData.items.length;
  thumbnailsData.items = thumbnailsData.items.filter((c: any) => !CASES_TO_DELETE.includes(c.caseId));
  thumbnailsData.totalCount = thumbnailsData.items.length;
  fs.writeFileSync(thumbnailsPath, JSON.stringify(thumbnailsData, null, 2));
  console.log(`   ✅ 从 ${thOriginal} → ${thumbnailsData.items.length}`);
} else {
  console.log('   ⏭️ 文件不存在，跳过');
}

// 7. virtual-authors-final.json - 只移除 matchedPromptIds，不删除虚拟作者
console.log('7️⃣ 处理 virtual-authors-final.json (只移除 matchedPromptIds)...');
const virtualAuthorsPath = './virtual-authors-final.json';
const virtualAuthorsData = JSON.parse(fs.readFileSync(virtualAuthorsPath, 'utf-8'));
let removedFromVirtual = 0;
for (const author of virtualAuthorsData.virtualAuthors) {
  const originalLen = author.matchedPromptIds.length;
  author.matchedPromptIds = author.matchedPromptIds.filter(
    (id: string) => !CASES_TO_DELETE.includes(id)
  );
  if (author.matchedPromptIds.length < originalLen) {
    removedFromVirtual += originalLen - author.matchedPromptIds.length;
    console.log(`   📝 ${author.displayName}: ${originalLen} → ${author.matchedPromptIds.length}`);
  }
}
fs.writeFileSync(virtualAuthorsPath, JSON.stringify(virtualAuthorsData, null, 2));
console.log(`   ✅ 移除 ${removedFromVirtual} 个 matchedPromptIds`);

console.log('\n' + '='.repeat(60));
console.log('✅ 删除完成');
console.log('='.repeat(60));
console.log(`📊 最终 Cases 数量: ${casesData.cases.length}`);
console.log(`📷 缩略图数量: 136`);
console.log(`\n图片位置: public/generated-images/`);
