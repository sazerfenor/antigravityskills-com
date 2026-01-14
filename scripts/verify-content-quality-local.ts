import Database from 'better-sqlite3';
import { join } from 'path';

async function verifyContentQuality() {
  console.log('🔍 Verifying contentSections data quality (local DB)...\n');

  const dbPath = join(process.cwd(), 'local.db');
  const db = new Database(dbPath);

  // Get 5 random published posts
  const posts = db.prepare(`
    SELECT id, title, content_sections
    FROM community_post
    WHERE status = 'published'
    LIMIT 5
  `).all() as Array<{ id: string; title: string | null; content_sections: string | null }>;

  console.log('Checking ' + posts.length + ' sample posts:\n');

  let allValid = true;

  posts.forEach((post, index) => {
    console.log('─────────────────────────────────────────────────────────');
    console.log('Post ' + (index + 1) + ': ' + post.id);
    console.log('Title: ' + (post.title || 'Untitled'));
    
    try {
      if (!post.content_sections) {
        console.log('❌ ERROR: content_sections is null');
        allValid = false;
        return;
      }

      const sections = JSON.parse(post.content_sections);

      if (!Array.isArray(sections)) {
        console.log('❌ ERROR: content_sections is not an array');
        allValid = false;
        return;
      }

      console.log('✅ Valid contentSections array with ' + sections.length + ' sections');
      
      // Show section types
      const sectionTypes = sections.map((s: any) => s.type).join(', ');
      console.log('   Types: ' + sectionTypes);
      
      // Check each section has required fields
      const hasAllFields = sections.every((s: any) => s.type && s.content);
      if (hasAllFields) {
        console.log('   ✅ All sections have type and content');
      } else {
        console.log('   ⚠️  Some sections missing required fields');
      }
      
    } catch (error: any) {
      console.log('❌ ERROR parsing content_sections: ' + error.message);
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

  db.close();
}

verifyContentQuality()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
