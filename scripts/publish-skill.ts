#!/usr/bin/env tsx
/**
 * Skill Publish Script
 *
 * Usage:
 *   pnpm skill:publish ./path/to/seo-fields.json
 *   pnpm skill:publish --dry-run ./seo-fields.json
 *
 * 功能:
 *   1. 读取 seo-fields.json
 *   2. 如果 Skill 未注册到数据库，自动从文件系统读取并注册
 *   3. 发布到 communityPost 表
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  collectSkillFiles,
  hasAttachedResources,
  uploadSkillZip,
} from '../src/shared/lib/skill-zip-uploader';

// ============================================
// SKILL.md 解析器
// ============================================

interface ParsedSkill {
  name: string;
  description: string;
  content: string;
  category?: string;
  subcategory?: string;
}

/**
 * 解析 SKILL.md 文件，提取 frontmatter 和内容
 */
function parseSkillMd(filePath: string): ParsedSkill | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 解析 frontmatter (---...---)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    // 无 frontmatter，使用文件名作为 name
    const fileName = path.basename(path.dirname(filePath));
    return {
      name: fileName,
      description: '',
      content,
    };
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length).trim();

  // 解析 YAML-like frontmatter
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch ? nameMatch[1].trim() : path.basename(path.dirname(filePath)),
    description: descMatch ? descMatch[1].trim() : '',
    content,
  };
}

// ============================================
// 主函数
// ============================================

async function main() {
  const args = process.argv.slice(2);

  // 解析参数
  const dryRun = args.includes('--dry-run');
  const files = args.filter(arg => !arg.startsWith('--'));

  if (files.length === 0) {
    console.error('❌ 用法: pnpm skill:publish [--dry-run] <seo-fields.json> [...]');
    console.error('');
    console.error('示例:');
    console.error('  pnpm skill:publish ./scratch/theme-factory/seo-fields.json');
    console.error('  pnpm skill:publish --dry-run ./seo-fields.json');
    console.error('  pnpm skill:publish ./.agent/skills/*/seo-fields.json');
    process.exit(1);
  }

  console.log('🚀 Skill 发布脚本');
  console.log(`   模式: ${dryRun ? '预览 (dry-run)' : '正式发布'}`);
  console.log(`   文件数: ${files.length}`);
  console.log('');

  // 导入服务（延迟加载以确保环境变量已加载）
  const { publishSkillToPost, validateSeoFields } = await import('../src/shared/services/skill-publisher');
  const { getAntigravitySkillById, getAntigravitySkillBySlug, createAntigravitySkill } = await import('../src/shared/models/antigravity_skill');

  let successCount = 0;
  let failCount = 0;

  for (const filePath of files) {
    const absolutePath = path.resolve(process.cwd(), filePath);

    console.log(`📄 处理: ${filePath}`);

    // 检查文件是否存在
    if (!fs.existsSync(absolutePath)) {
      console.error(`   ❌ 文件不存在: ${absolutePath}`);
      failCount++;
      continue;
    }

    // 读取并解析 JSON
    let data: any;
    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      data = JSON.parse(content);
    } catch (e: any) {
      console.error(`   ❌ JSON 解析失败: ${e.message}`);
      failCount++;
      continue;
    }

    // 验证必填字段
    if (!data.skillId) {
      console.error('   ❌ 缺少 skillId 字段');
      failCount++;
      continue;
    }

    // ============================================
    // 检查 Skill 是否已注册到数据库
    // 支持按 ID (UUID) 或 slug (name) 查找
    // ============================================
    let skill = await getAntigravitySkillById(data.skillId)
             || await getAntigravitySkillBySlug(data.skillId);

    if (!skill) {
      console.log(`   ⚠️  Skill "${data.skillId}" 未在数据库中找到，尝试从文件系统注册...`);

      // 查找 SKILL.md 文件
      const possiblePaths = [
        path.join(path.dirname(absolutePath), 'SKILL.md'),
        path.join(process.cwd(), '.agent', 'skills', data.skillId, 'SKILL.md'),
        path.join(process.cwd(), 'scratch', data.skillId, 'SKILL.md'),
      ];

      let skillMdPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          skillMdPath = p;
          break;
        }
      }

      if (!skillMdPath) {
        console.error(`   ❌ 找不到 SKILL.md 文件，已尝试路径:`);
        possiblePaths.forEach(p => console.error(`      - ${p}`));
        failCount++;
        continue;
      }

      // 解析 SKILL.md
      const parsed = parseSkillMd(skillMdPath);
      if (!parsed) {
        console.error(`   ❌ 无法解析 SKILL.md: ${skillMdPath}`);
        failCount++;
        continue;
      }

      console.log(`   📝 从 ${path.relative(process.cwd(), skillMdPath)} 读取 Skill 信息`);

      // 检查是否有附属资源
      const skillDir = path.dirname(skillMdPath);
      const hasResources = hasAttachedResources(skillDir);

      if (hasResources) {
        console.log(`   📦 检测到附属资源，将打包上传到 R2`);
      }

      if (dryRun) {
        console.log(`   ⏸️  预览模式，跳过数据库注册`);
        console.log(`      - name: ${parsed.name}`);
        console.log(`      - description: ${parsed.description.slice(0, 50)}...`);
        if (hasResources) {
          const files = collectSkillFiles(skillDir);
          console.log(`      - 文件数: ${files.length}`);
          files.forEach(f => console.log(`        - ${f.path}`));
        }
      } else {
        // 如果有附属资源，先上传到 R2
        let zipUrl: string | undefined;
        let zipSize: number | undefined;
        let fileCount: number | undefined;

        if (hasResources) {
          const files = collectSkillFiles(skillDir);
          console.log(`   📦 收集到 ${files.length} 个文件，准备打包上传...`);

          const uploadResult = await uploadSkillZip(data.skillId, files);
          if (uploadResult.success) {
            zipUrl = uploadResult.zipUrl;
            zipSize = uploadResult.zipSize;
            fileCount = uploadResult.fileCount;
            console.log(`   ✅ ZIP 已上传到 R2 (${(zipSize! / 1024).toFixed(1)}KB)`);
          } else {
            console.error(`   ⚠️  R2 上传失败: ${uploadResult.error}，继续注册但无 ZIP`);
          }
        }

        // 注册到数据库
        try {
          skill = await createAntigravitySkill({
            id: data.skillId,
            name: parsed.name,
            slug: data.skillId,
            description: parsed.description,
            content: parsed.content,
            sourceType: 'other',
            sourceContent: '',
            category: data.category || 'tools',
            subcategory: data.subcategory || null,
            tags: data.visualTags ? JSON.stringify(data.visualTags) : null,
            status: 'published',
            // R2 存储信息（可选）
            zipUrl,
            zipSize,
            fileCount,
          });
          console.log(`   ✅ Skill 已注册到数据库 (id: ${skill.id})`);
        } catch (e: any) {
          console.error(`   ❌ 注册 Skill 失败: ${e.message}`);
          failCount++;
          continue;
        }
      }
    } else {
      console.log(`   ✓ Skill "${data.skillId}" 已存在于数据库`);
    }

    // 验证 SEO 字段
    const validation = validateSeoFields(data);
    if (!validation.valid) {
      console.error(`   ❌ SEO 字段验证失败:`);
      validation.errors.forEach(err => console.error(`      - ${err}`));
      failCount++;
      continue;
    }

    // 显示警告（不阻止发布）
    if ((validation as any).warnings?.length > 0) {
      console.log(`   ⚠️  SEO 字段警告:`);
      (validation as any).warnings.forEach((warn: string) => console.log(`      - ${warn}`));
    }

    console.log(`   ✓ SEO 字段验证通过`);
    console.log(`   - seoTitle: ${data.seoTitle?.slice(0, 40)}...`);

    if (dryRun) {
      console.log(`   ⏸️  预览模式，跳过发布`);
      successCount++;
      continue;
    }

    // 执行发布
    try {
      const result = await publishSkillToPost(data);

      if (result.success) {
        console.log(`   ✅ 发布成功!`);
        console.log(`      - postId: ${result.postId}`);
        console.log(`      - seoSlug: ${result.seoSlug}`);
        console.log(`      - url: ${result.url}`);
        successCount++;
      } else {
        console.error(`   ❌ 发布失败: ${result.error}`);
        failCount++;
      }
    } catch (e: any) {
      console.error(`   ❌ 发布异常: ${e.message}`);
      failCount++;
    }

    console.log('');
  }

  // 汇总
  console.log('━'.repeat(50));
  console.log(`📊 完成: ${successCount} 成功, ${failCount} 失败`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('💥 脚本执行失败:', e);
  process.exit(1);
});
