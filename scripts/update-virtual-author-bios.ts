/**
 * 更新所有虚拟作者 Bio 为英文
 * 运行方式: npx tsx scripts/update-virtual-author-bios.ts
 */

import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

// 根据每个虚拟作者的 displayName 配置英文 Bio
const bioMappings: Record<string, string> = {
  // Dr. Linus Graph - Infographic & Education
  'Dr. Linus Graph': 'Data visualization specialist. Turning complex information into clear, engaging infographics and educational content.',
  
  // Neko Mancer - Anime & Character Design
  'Neko Mancer': 'Anime and character design artist. Creating expressive characters with distinctive styles from cute chibi to epic fantasy.',
  
  // Sarah Vogue - Photorealistic Portrait & Fashion
  'Sarah Vogue': 'Virtual fashion blogger. Pursuing ultimate photorealism in portrait and fashion photography.',
  
  // Render Foundry - 3D Product & Commercial Assets
  'Render Foundry': '3D product visualization studio. Crafting photorealistic product renders and commercial assets.',
  
  // Arch Visionary - Architecture & Interior
  'Arch Visionary': 'Architecture and interior visualization artist. Bringing spaces to life with stunning 3D renders.',
  
  // void_walker - Surrealism & Fine Art
  'void_walker': 'Digital surrealist. Exploring the boundaries between reality and imagination through fine art.',
  
  // Pixel Junkie - UI/UX & Digital Assets
  'Pixel Junkie': 'UI/UX designer and digital asset creator. Clean, modern interfaces and app design systems.',
  
  // AdMaster Pro - Marketing & Advertising
  'AdMaster Pro': 'Focused on high-conversion commercial visuals: posters, flyers, food photography. Capture customer attention at first glance.',
  
  // Chrono Fix - Restoration & Enhancement
  'Chrono Fix': 'Photo restoration specialist. Breathing new life into old memories with AI-powered enhancement.',
};

async function updateVirtualAuthorBios() {
  console.log('🔄 Updating virtual author bios to English...\n');

  // 获取所有虚拟用户
  const virtualUsers = await db()
    .select({ id: user.id, name: user.name, email: user.email, bio: user.bio })
    .from(user)
    .where(eq(user.isVirtual, true));

  console.log(`Found ${virtualUsers.length} virtual users\n`);

  let updated = 0;
  for (const vu of virtualUsers) {
    const displayName = vu.name;

    if (displayName && bioMappings[displayName]) {
      await db()
        .update(user)
        .set({ bio: bioMappings[displayName] })
        .where(eq(user.id, vu.id));

      console.log(`✅ ${displayName}: "${bioMappings[displayName].slice(0, 50)}..."`);
      updated++;
    } else {
      console.log(`⚠️  ${displayName}: No bio mapping found`);
    }
  }

  console.log(`\n✅ Updated ${updated}/${virtualUsers.length} virtual user bios`);
}

updateVirtualAuthorBios().catch(console.error);
