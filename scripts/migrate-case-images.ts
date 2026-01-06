/**
 * Case 缩略图迁移脚本 V2
 * 
 * 功能：
 * 1. 读取 public/generated-images/ 的图片
 * 2. 生成 SEO 友好的文件名
 * 3. 上传到 R2：ai/image/generated/gemini/
 * 4. 更新 KV 向量库中的 thumbnail 路径
 * 5. 生成映射表：src/data/cases-with-images.json
 * 
 * 用法：
 *   pnpm tsx scripts/migrate-case-images.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config({ path: '.env.local' });

// R2 配置 (从 config 表)
const R2_CONFIG = {
  accessKeyId: '05f2b938c0248916a54c67dcf75463e1',
  secretAccessKey: 'aaf359c4c29f50d0dd99389116515911b2bb127d69bf8397d1f1c779882f0ee3',
  bucket: 'bananaprompts',
  endpoint: 'https://a2f67e07db062f0a996f0a9c6a1f39e0.r2.cloudflarestorage.com',
  publicDomain: 'https://r2.bananaprompts.info',
};

// 路径配置
const LOCAL_IMAGES_DIR = 'public/generated-images';
const CASES_DATA_PATH = 'src/data/cases-optimized.json';
const VECTORS_PATH = 'src/data/cases-with-semantic-vectors.json';
const OUTPUT_MAPPING_PATH = 'src/data/cases-with-images.json';
const R2_UPLOAD_PREFIX = 'ai/image/generated/gemini'; // 标准路径

// Admin API 配置
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || '';

interface Case {
  id: string;
  title: string;
  structuredExtraction?: {
    subject?: string;
  };
}

interface ImageMapping {
  caseId: string;
  oldFilename: string;
  newFilename: string;
  r2Key: string;
  publicUrl: string;
}

// 初始化 S3 Client (R2 兼容)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

async function main() {
  console.log('🚀 Case Image Migration V2');
  console.log('=' .repeat(50));
  console.log(`📁 R2 Path: ${R2_UPLOAD_PREFIX}/`);
  console.log(`🌐 Public Domain: ${R2_CONFIG.publicDomain}\n`);

  // 1. 读取 Cases 数据
  console.log('📖 Loading cases data...');
  const casesData = JSON.parse(fs.readFileSync(CASES_DATA_PATH, 'utf-8'));
  const cases: Case[] = casesData.cases;
  console.log(`✅ Loaded ${cases.length} cases\n`);

  // 2. 读取已生成的文件名映射
  console.log('📖 Loading filename mappings...');
  const mappingData = JSON.parse(fs.readFileSync(OUTPUT_MAPPING_PATH, 'utf-8'));
  console.log(`✅ Loaded ${mappingData.images.length} mappings\n`);

  // 3. 上传到 R2
  console.log('☁️  Uploading to R2...\n');
  const uploadedMappings: ImageMapping[] = [];
  
  for (const mapping of mappingData.images) {
    const caseId = mapping.caseId;
    const oldFilename = `${caseId}.jpeg`;
    const localPath = path.join(LOCAL_IMAGES_DIR, oldFilename);
    const newFilename = mapping.filename;
    const r2Key = `${R2_UPLOAD_PREFIX}/${newFilename}`;
    const publicUrl = `${R2_CONFIG.publicDomain}/${r2Key}`;

    if (!fs.existsSync(localPath)) {
      console.warn(`⚠️  Skip ${caseId}: local file not found`);
      continue;
    }

    try {
      const fileBuffer = fs.readFileSync(localPath);
      
      await s3Client.send(new PutObjectCommand({
        Bucket: R2_CONFIG.bucket,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: 'image/jpeg',
      }));

      uploadedMappings.push({
        caseId,
        oldFilename,
        newFilename,
        r2Key,
        publicUrl,
      });

      console.log(`  ✅ ${caseId} -> ${r2Key}`);
    } catch (error: any) {
      console.error(`  ❌ ${caseId}: ${error.message}`);
    }
  }

  console.log(`\n✅ Uploaded ${uploadedMappings.length} images\n`);

  // 4. 更新映射表
  console.log('📝 Updating mapping file...');
  const updatedOutput = {
    version: '2.0.0',
    updatedAt: new Date().toISOString(),
    r2Prefix: R2_UPLOAD_PREFIX,
    baseUrl: `${R2_CONFIG.publicDomain}/${R2_UPLOAD_PREFIX}/`,
    totalImages: uploadedMappings.length,
    images: uploadedMappings.map(m => ({
      caseId: m.caseId,
      filename: m.newFilename,
      r2Key: m.r2Key,
      fullUrl: m.publicUrl,
    })),
  };
  fs.writeFileSync(OUTPUT_MAPPING_PATH, JSON.stringify(updatedOutput, null, 2), 'utf-8');
  console.log(`✅ Saved to: ${OUTPUT_MAPPING_PATH}\n`);

  // 5. 更新向量文件中的 thumbnail 路径
  console.log('📝 Updating vectors file thumbnails...');
  if (fs.existsSync(VECTORS_PATH)) {
    const vectorsData = JSON.parse(fs.readFileSync(VECTORS_PATH, 'utf-8'));
    
    // 创建 caseId -> publicUrl 映射
    const urlMap = new Map(uploadedMappings.map(m => [m.caseId, m.publicUrl]));
    
    let updatedCount = 0;
    for (const embedding of vectorsData.embeddings) {
      const newUrl = urlMap.get(embedding.id);
      if (newUrl) {
        // 更新 payload 中的 thumbnail
        if (embedding.payload) {
          embedding.payload.thumbnail = newUrl;
          updatedCount++;
        }
      }
    }
    
    fs.writeFileSync(VECTORS_PATH, JSON.stringify(vectorsData, null, 2), 'utf-8');
    console.log(`✅ Updated ${updatedCount} thumbnails in vectors file\n`);
  }

  // 6. 重新同步到 KV
  if (ADMIN_COOKIE) {
    console.log('☁️  Syncing updated vectors to KV...');
    try {
      const vectorsData = JSON.parse(fs.readFileSync(VECTORS_PATH, 'utf-8'));
      
      const response = await fetch(`${API_BASE_URL}/api/admin/cases/sync-to-kv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `better-auth.session_token=${ADMIN_COOKIE}`,
        },
        body: JSON.stringify({
          action: 'sync',
          data: vectorsData,
        }),
      });

      const result = await response.json() as any;
      if (result.code === 0) {
        console.log(`✅ KV sync: ${result.data.successCount} cases updated\n`);
      } else {
        console.error(`❌ KV sync failed: ${result.message}\n`);
      }
    } catch (error: any) {
      console.error(`❌ KV sync error: ${error.message}\n`);
    }
  } else {
    console.log('⚠️  ADMIN_COOKIE not set, skipping KV sync');
    console.log('   Run manually: pnpm tsx scripts/upload-to-kv.ts\n');
  }

  // 7. 完成总结
  console.log('🎉 Migration complete!\n');
  console.log('Summary:');
  console.log(`  - Images uploaded: ${uploadedMappings.length}`);
  console.log(`  - R2 path: ${R2_UPLOAD_PREFIX}/`);
  console.log(`  - Mapping file: ${OUTPUT_MAPPING_PATH}`);
  console.log(`  - Vectors file: ${VECTORS_PATH}`);
}

main().catch(console.error);
