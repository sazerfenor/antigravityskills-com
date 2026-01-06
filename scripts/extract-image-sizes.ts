/**
 * 提取所有生成图片的尺寸信息
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const IMAGE_DIR = 'public/generated-images';

interface ImageSize {
  filename: string;
  width: number;
  height: number;
  aspectRatio: string;
  fileSize: number;
  fileSizeKB: string;
}

async function main() {
  console.log('='.repeat(60));
  console.log('📐 提取图片尺寸信息');
  console.log('='.repeat(60));
  
  const files = fs.readdirSync(IMAGE_DIR).filter(f => 
    f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')
  );
  
  console.log(`📁 找到 ${files.length} 张图片\n`);
  
  const sizes: ImageSize[] = [];
  const sizeStats: Record<string, number> = {};
  
  for (const file of files) {
    const filepath = path.join(IMAGE_DIR, file);
    const stat = fs.statSync(filepath);
    
    try {
      const metadata = await sharp(filepath).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const aspectRatio = `${width}:${height}`;
      
      sizes.push({
        filename: file,
        width,
        height,
        aspectRatio,
        fileSize: stat.size,
        fileSizeKB: (stat.size / 1024).toFixed(1) + ' KB',
      });
      
      // 统计尺寸分布
      const sizeKey = `${width}x${height}`;
      sizeStats[sizeKey] = (sizeStats[sizeKey] || 0) + 1;
      
    } catch (e: any) {
      console.error(`❌ 读取失败: ${file} - ${e.message}`);
    }
  }
  
  // 按尺寸分组输出
  console.log('📊 尺寸分布统计:');
  console.log('-'.repeat(40));
  
  const sortedStats = Object.entries(sizeStats)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [size, count] of sortedStats) {
    const [w, h] = size.split('x').map(Number);
    const ratio = (w / h).toFixed(2);
    console.log(`  ${size.padEnd(12)} × ${count.toString().padStart(3)} 张  (比例: ${ratio})`);
  }
  
  // 保存详细信息
  fs.writeFileSync('logs/image-sizes.json', JSON.stringify({
    extractedAt: new Date().toISOString(),
    totalImages: sizes.length,
    sizeDistribution: sortedStats.map(([size, count]) => ({ size, count })),
    details: sizes,
  }, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ 完成: ${sizes.length} 张图片`);
  console.log('='.repeat(60));
  console.log(`📁 详细信息: logs/image-sizes.json`);
}

main().catch(console.error);
