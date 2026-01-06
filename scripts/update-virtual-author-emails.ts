/**
 * 更新虚拟作者邮箱为更真实的格式
 * 运行: pnpm tsx scripts/update-virtual-author-emails.ts
 */

import { db } from '../src/core/db';
import { user } from '../src/config/db/schema';
import { eq } from 'drizzle-orm';

// 根据每个虚拟作者的人设，设计真实邮箱
// ⚠️ 只使用常见邮箱服务商，不使用自定义域名
const realisticEmails: Record<string, string> = {
  // Dr. Linus Graph - 数据可视化专家，学术风格
  // Bio: "数据可视化专家，致力于将复杂逻辑转化为直观图表"
  'data_whisperer': 'dr.linus.graph@gmail.com',
  
  // Neko Mancer - 二次元画师，日系风格
  // Bio: "资深二次元画师，Niji Journey 重度用户"
  'neko_mancer': 'neko.mancer.art@yahoo.com',
  
  // Sarah Vogue - 时尚博主，高端感
  // Bio: "虚拟时尚博主，追求极致的写实感"
  'sarah_vogue_ai': 'sarah.vogue.design@outlook.com',
  
  // Render Foundry - 3D工作室，商业专业
  // Bio: "商业3D设计工作室"
  'render_foundry': 'render.foundry.studio@gmail.com',
  
  // Arch Visionary - 建筑设计师
  // Bio: "空间设计师，探索AI在建筑与室内设计中的可能性"
  'arch_daily_gen': 'arch.visionary.ai@outlook.com',
  
  // void_walker - 超现实艺术家，神秘感
  // Bio: "探索潜意识的数字艺术家"
  'void_walker': 'voidwalker1999@hotmail.com',
  
  // Pixel Junkie - 复古UI设计师，玩家风
  // Bio: "复古科技爱好者，UI/UX 设计师"
  'pixel_junkie': 'pixeljunkie88@yahoo.com',
  
  // AdMaster Pro - 营销专家
  // Bio: "专注高转化率的商业视觉"
  'ad_master_pro': 'admaster.creative@gmail.com',
  
  // Chrono Fix - 图像修复专家
  // Bio: "时间旅行者。专注于图像修复、老照片上色"
  'chrono_fix': 'chrono.fix.studio@outlook.com',
};

async function updateVirtualAuthorEmails() {
  console.log('='.repeat(60));
  console.log('📧 更新虚拟作者邮箱为真实格式');
  console.log('='.repeat(60));

  // 获取所有虚拟用户
  const virtualUsers = await db()
    .select()
    .from(user)
    .where(eq(user.isVirtual, true));

  console.log(`\n找到 ${virtualUsers.length} 个虚拟用户\n`);

  let updated = 0;

  for (const vUser of virtualUsers) {
    // 从旧邮箱提取 username: virtual+{username}@... -> username
    const oldEmail = vUser.email;
    const username = oldEmail.replace('virtual+', '').split('@')[0];

    const newEmail = realisticEmails[username];

    if (newEmail) {
      console.log(`[${vUser.name}]`);
      console.log(`   旧: ${oldEmail}`);
      console.log(`   新: ${newEmail}`);

      await db()
        .update(user)
        .set({ email: newEmail })
        .where(eq(user.id, vUser.id));

      console.log(`   ✅ 已更新\n`);
      updated++;
    } else {
      console.log(`[${vUser.name}] ⚠️  未找到映射: ${username}\n`);
    }
  }

  console.log('='.repeat(60));
  console.log(`✅ 成功更新 ${updated}/${virtualUsers.length} 个邮箱`);
  console.log('='.repeat(60));

  // 显示最终结果
  console.log('\n📋 更新后的虚拟作者邮箱:');
  console.log('-'.repeat(60));

  const updatedUsers = await db()
    .select()
    .from(user)
    .where(eq(user.isVirtual, true));

  for (const u of updatedUsers) {
    console.log(`${u.name.padEnd(20)} | ${u.email}`);
  }

  process.exit(0);
}

updateVirtualAuthorEmails().catch(console.error);
