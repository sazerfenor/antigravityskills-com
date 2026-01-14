import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

async function verifyContentQuality() {
  console.log('🔍 Verifying contentSections data quality...\n');

  // Get 5 random published posts
  const posts = await db()
    .select({
      id: communityPost.id,
      title: communityPost.title,
      contentSections: communityPost.contentSections,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'))
    .limit(5);

  console.log('Checking ' + posts.length + ' sample posts:\n');

  let allValid = true;

  posts.forEach((post, index) => {
    console.log('─────────────────────────────────────────────────────────');
    console.log('Post ' + (index + 1) + ': ' + post.id);
    console.log('Title: ' + (post.title || 'Untitled'));
    
    try {
      if (!post.contentSections) {
        console.log('❌ ERROR: contentSections is null');
        allValid = false;
        return;
      }

      const sections = typeof post.contentSections === 'string' 
        ? JSON.parse(post.contentSections) 
        : post.contentSections;

      if (!Array.isArray(sections)) {
        console.log('❌ ERROR: contentSections is not an array');
        allValid = false;
        return;
      }

      console.log('✅ Valid contentSections array with ' + sections.length + ' sections');
      
      // Show section types
      const sectionTypes = sections.map(s => s.type).join(', ');
      console.log('   Types: ' + sectionTypes);
      
    } catch (error: any) {
      console.log('❌ ERROR parsing contentSections: ' + error.message);
      allValid = false;
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════════');
  if (allValid) {
    console.log('✅ All sample posts have valid contentSections data');
    console.log('✅ Safe to proceed with legacy field removal');
  } else {
    console.log('⚠️  Some posts have invalid data - investigate before proceeding');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

verifyContentQuality()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
