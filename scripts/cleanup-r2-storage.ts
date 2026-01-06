/**
 * R2 存储清理脚本
 *
 * 清理范围:
 * - AI 生成的图片 (generated/images/, ai/image/generated/)
 * - 用户上传的参考图片 (ai/image/reference/)
 * - 缩略图 (ai/image/thumbs/)
 * - 临时文件 (temp/)
 *
 * 保留范围:
 * - 用户头像 (avatars/)
 * - 最近 N 小时内创建的文件（默认 24 小时）
 *
 * 使用方法:
 * pnpm tsx scripts/cleanup-r2-storage.ts --dry-run              # 预览模式
 * pnpm tsx scripts/cleanup-r2-storage.ts                        # 执行清理（保护24小时内的文件）
 * pnpm tsx scripts/cleanup-r2-storage.ts --protect-hours 48     # 保护48小时内的文件
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { config } from '@/config/db/schema';

// 需要清理的目录前缀
const CLEANUP_PREFIXES = [
  'generated/images/',        // Gemini Provider 直接上传的 AI 生成图
  'ai/image/generated/',      // 通过 API 上传的 AI 生成图
  'ai/image/reference/',      // 用户上传的参考图片
  'ai/image/thumbs/',         // 画廊缩略图
  'ai/gemini/',               // 历史 Case 图片
  'temp/',                    // 临时文件
];

// 保留的目录前缀
const PRESERVE_PREFIXES = [
  'avatars/',                 // 用户头像
];

const DRY_RUN = process.argv.includes('--dry-run');

// 新增：保护最近N小时内创建的文件
const PROTECT_HOURS = (() => {
  const idx = process.argv.indexOf('--protect-hours');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 24; // 默认保护24小时内的文件
})();

async function getR2Config(): Promise<{
  accessKey: string;
  secretKey: string;
  bucketName: string;
  endpoint: string;
  domain: string;
}> {
  const database = db();

  // 获取所有 R2 配置
  const configNames = ['r2_access_key', 'r2_secret_key', 'r2_bucket_name', 'r2_endpoint', 'r2_domain'];
  const configResults = await Promise.all(
    configNames.map(name =>
      database.select().from(config).where(eq(config.name, name)).limit(1)
    )
  );

  const configMap: Record<string, string> = {};
  configResults.forEach((result, index) => {
    if (result[0]?.value) {
      configMap[configNames[index]] = result[0].value;
    }
  });

  return {
    accessKey: configMap['r2_access_key'] || '',
    secretKey: configMap['r2_secret_key'] || '',
    bucketName: configMap['r2_bucket_name'] || '',
    endpoint: configMap['r2_endpoint'] || '',
    domain: configMap['r2_domain'] || '',
  };
}

interface ObjectInfo {
  key: string;
  lastModified?: Date;
}

async function listObjects(client: S3Client, bucket: string, prefix: string): Promise<ObjectInfo[]> {
  const objects: ObjectInfo[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const response = await client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          objects.push({
            key: obj.Key,
            lastModified: obj.LastModified,
          });
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

async function deleteObjects(client: S3Client, bucket: string, keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  // 每次最多删除 1000 个对象
  const BATCH_SIZE = 1000;
  let deletedCount = 0;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);

    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: batch.map(Key => ({ Key })),
        Quiet: true,
      },
    });

    await client.send(command);
    deletedCount += batch.length;

    console.log(`  已删除 ${deletedCount}/${keys.length} 个对象...`);
  }

  return deletedCount;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🗑️ R2 存储清理脚本');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  预览模式 (--dry-run): 不会实际删除任何文件\n');
  } else {
    console.log('\n⚠️  执行模式: 将删除文件！\n');
  }

  // 获取 R2 配置
  console.log('📡 获取 R2 配置...');
  const r2Config = await getR2Config();

  if (!r2Config.accessKey || !r2Config.secretKey || !r2Config.bucketName) {
    console.error('❌ R2 配置不完整，请检查数据库 config 表');
    await closeDb();
    process.exit(1);
  }

  console.log(`  Bucket: ${r2Config.bucketName}`);
  console.log(`  Endpoint: ${r2Config.endpoint}`);

  // 创建 S3 客户端
  const client = new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKey,
      secretAccessKey: r2Config.secretKey,
    },
  });

  console.log('\n📋 清理范围:');
  CLEANUP_PREFIXES.forEach(prefix => console.log(`  ✗ ${prefix}`));
  console.log('\n📋 保留范围:');
  PRESERVE_PREFIXES.forEach(prefix => console.log(`  ✓ ${prefix}`));
  console.log(`\n⏱️ 保护最近 ${PROTECT_HOURS} 小时内的文件`);

  // 计算保护时间阈值
  const protectThreshold = new Date(Date.now() - PROTECT_HOURS * 60 * 60 * 1000);
  console.log(`   (早于 ${protectThreshold.toISOString()} 的文件将被清理)`);

  // 收集所有需要删除的对象
  console.log('\n🔍 扫描需要删除的对象...\n');

  const allKeysToDelete: string[] = [];
  const summary: { prefix: string; total: number; toDelete: number; protected: number }[] = [];

  for (const prefix of CLEANUP_PREFIXES) {
    process.stdout.write(`  扫描 ${prefix} ... `);

    try {
      const objects = await listObjects(client, r2Config.bucketName, prefix);

      // 过滤出需要删除的对象（排除最近创建的）
      const toDelete = objects.filter(obj => {
        if (!obj.lastModified) return true; // 没有时间信息的默认删除
        return obj.lastModified < protectThreshold;
      });

      const protectedCount = objects.length - toDelete.length;

      console.log(`${objects.length} 个对象 (删除 ${toDelete.length}, 保护 ${protectedCount})`);

      summary.push({
        prefix,
        total: objects.length,
        toDelete: toDelete.length,
        protected: protectedCount,
      });
      allKeysToDelete.push(...toDelete.map(o => o.key));
    } catch (error: any) {
      console.log(`❌ 错误: ${error.message}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('📊 扫描结果:\n');

  let totalCount = 0;
  let totalProtected = 0;
  summary.forEach(item => {
    console.log(`  ${item.prefix.padEnd(25)} 总数: ${String(item.total).padStart(4)}, 删除: ${String(item.toDelete).padStart(4)}, 保护: ${String(item.protected).padStart(4)}`);
    totalCount += item.toDelete;
    totalProtected += item.protected;
  });

  console.log('  ' + '─'.repeat(55));
  console.log(`  ${'总计'.padEnd(23)} 删除: ${String(totalCount).padStart(4)}, 保护: ${String(totalProtected).padStart(4)}`);

  if (totalCount === 0) {
    console.log('\n🎉 没有需要清理的对象！');
    await closeDb();
    return;
  }

  console.log('\n' + '─'.repeat(60));

  if (DRY_RUN) {
    console.log('\n📝 预览模式 - 以下对象将被删除:\n');

    // 只显示前 20 个
    const previewKeys = allKeysToDelete.slice(0, 20);
    previewKeys.forEach(key => console.log(`  - ${key}`));

    if (allKeysToDelete.length > 20) {
      console.log(`  ... 还有 ${allKeysToDelete.length - 20} 个对象`);
    }

    console.log('\n💡 要执行删除，请移除 --dry-run 参数');
  } else {
    // 确认删除
    console.log('\n⚠️  即将删除以上对象，此操作不可恢复！');
    console.log('   按 Ctrl+C 取消，等待 5 秒后开始删除...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️ 开始删除...\n');

    const deletedCount = await deleteObjects(client, r2Config.bucketName, allKeysToDelete);

    console.log('\n✅ 删除完成！');
    console.log(`   共删除 ${deletedCount} 个对象`);
    console.log(`   保护了 ${totalProtected} 个最近创建的对象`);
  }

  console.log('\n' + '='.repeat(60));
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
