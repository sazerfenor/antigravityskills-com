import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

async function analyzeLegacyFields() {
  console.log('🔍 Analyzing legacy field usage in published posts...\n');

  // Fetch all published posts
  const posts = await db()
    .select({
      id: communityPost.id,
      title: communityPost.title,
      contentSections: communityPost.contentSections,
      promptBreakdown: communityPost.promptBreakdown,
      dynamicHeaders: communityPost.dynamicHeaders,
      faqItems: communityPost.faqItems,
      useCases: communityPost.useCases,
      expertCommentary: communityPost.expertCommentary,
      remixIdeas: communityPost.remixIdeas,
      relatedConcepts: communityPost.relatedConcepts,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'));

  console.log('📊 Total published posts: ' + posts.length + '\n');

  // Initialize counters
  let hasContentSectionsAndLegacy = 0;
  let hasContentSectionsOnly = 0;
  let hasLegacyOnly = 0;
  let hasNeither = 0;

  // Field-specific counters
  const legacyFieldUsage = {
    promptBreakdown: 0,
    dynamicHeaders: 0,
    faqItems: 0,
    useCases: 0,
    expertCommentary: 0,
    remixIdeas: 0,
    relatedConcepts: 0,
  };

  // Sample posts for each category
  const samples = {
    redundant: [] as Array<{ id: string; title: string }>,
    v14Only: [] as Array<{ id: string; title: string }>,
    legacyOnly: [] as Array<{ id: string; title: string }>,
    missing: [] as Array<{ id: string; title: string }>,
  };

  // Analyze each post
  posts.forEach((post) => {
    const hasContentSections = post.contentSections !== null && post.contentSections !== undefined;
    
    // Check if any legacy field has data
    const hasAnyLegacyField = 
      post.promptBreakdown !== null ||
      post.dynamicHeaders !== null ||
      post.faqItems !== null ||
      post.useCases !== null ||
      post.expertCommentary !== null ||
      post.remixIdeas !== null ||
      post.relatedConcepts !== null;

    // Count individual field usage
    if (post.promptBreakdown !== null) legacyFieldUsage.promptBreakdown++;
    if (post.dynamicHeaders !== null) legacyFieldUsage.dynamicHeaders++;
    if (post.faqItems !== null) legacyFieldUsage.faqItems++;
    if (post.useCases !== null) legacyFieldUsage.useCases++;
    if (post.expertCommentary !== null) legacyFieldUsage.expertCommentary++;
    if (post.remixIdeas !== null) legacyFieldUsage.remixIdeas++;
    if (post.relatedConcepts !== null) legacyFieldUsage.relatedConcepts++;

    // Categorize posts
    if (hasContentSections && hasAnyLegacyField) {
      hasContentSectionsAndLegacy++;
      if (samples.redundant.length < 3) {
        samples.redundant.push({ id: post.id, title: post.title || 'Untitled' });
      }
    } else if (hasContentSections && !hasAnyLegacyField) {
      hasContentSectionsOnly++;
      if (samples.v14Only.length < 3) {
        samples.v14Only.push({ id: post.id, title: post.title || 'Untitled' });
      }
    } else if (!hasContentSections && hasAnyLegacyField) {
      hasLegacyOnly++;
      if (samples.legacyOnly.length < 3) {
        samples.legacyOnly.push({ id: post.id, title: post.title || 'Untitled' });
      }
    } else {
      hasNeither++;
      if (samples.missing.length < 3) {
        samples.missing.push({ id: post.id, title: post.title || 'Untitled' });
      }
    }
  });

  // Print results
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 LEGACY FIELD USAGE STATISTICS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Individual Field Usage:');
  console.log('─────────────────────────────────────────────────────────');
  Object.entries(legacyFieldUsage).forEach(([field, count]) => {
    const percentage = ((count / posts.length) * 100).toFixed(1);
    const fieldPad = field + ' '.repeat(Math.max(0, 20 - field.length));
    const countPad = ' '.repeat(Math.max(0, 4 - String(count).length)) + count;
    console.log('  ' + fieldPad + ' ' + countPad + ' (' + percentage + '%)');
  });
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 POST CATEGORIZATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const printCategory = (
    emoji: string,
    label: string,
    count: number,
    description: string,
    sampleList: Array<{ id: string; title: string }>
  ) => {
    const percentage = ((count / posts.length) * 100).toFixed(1);
    console.log(emoji + ' ' + label);
    console.log('   Count: ' + count + ' (' + percentage + '%)');
    console.log('   ' + description);
    if (sampleList.length > 0) {
      console.log('   Samples:');
      sampleList.forEach((s) => console.log('     - ' + s.id + ': ' + s.title.substring(0, 50)));
    }
    console.log('');
  };

  printCategory(
    '🔴',
    'Redundant Data (contentSections + legacy)',
    hasContentSectionsAndLegacy,
    'Posts with both new and old format (冗余数据)',
    samples.redundant
  );

  printCategory(
    '🟢',
    'Pure V14.0 (contentSections only)',
    hasContentSectionsOnly,
    'Posts with only new format (纯V14.0帖子)',
    samples.v14Only
  );

  printCategory(
    '🟡',
    'Legacy Only (no contentSections)',
    hasLegacyOnly,
    'Posts with only old format (纯旧格式帖子)',
    samples.legacyOnly
  );

  printCategory(
    '⚫',
    'Missing Data (neither)',
    hasNeither,
    'Posts missing both formats (数据缺失)',
    samples.missing
  );

  console.log('═══════════════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Generate recommendations
  if (hasLegacyOnly === 0 && hasNeither === 0) {
    console.log('✅ Safe to delete legacy fields:');
    console.log('   - All posts have contentSections');
    console.log('   - No data migration needed');
    if (hasContentSectionsAndLegacy > 0) {
      console.log('   - ' + hasContentSectionsAndLegacy + ' posts have redundant legacy data (can be dropped)\n');
    }
  } else {
    console.log('⚠️  NOT safe to delete legacy fields yet:\n');
    
    if (hasLegacyOnly > 0) {
      console.log('   ❌ ' + hasLegacyOnly + ' posts still rely on legacy fields');
      console.log('      Action needed: Migrate these to contentSections format\n');
    }
    
    if (hasNeither > 0) {
      console.log('   ❌ ' + hasNeither + ' posts have NO content data at all');
      console.log('      Action needed: Investigate why these posts lack content\n');
    }
    
    if (hasContentSectionsAndLegacy > 0) {
      console.log('   ⚠️  ' + hasContentSectionsAndLegacy + ' posts have redundant data');
      console.log('      Action: Clean up after migration completes\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 NEXT STEPS');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (hasLegacyOnly > 0) {
    console.log('1. Run migration script to convert legacy posts to V14.0 format');
    console.log('   - Target: ' + hasLegacyOnly + ' posts\n');
  }

  if (hasNeither > 0) {
    console.log('2. Investigate posts with missing content data');
    console.log('   - Target: ' + hasNeither + ' posts');
    console.log('   - Check if these are drafts or have data issues\n');
  }

  if (hasContentSectionsAndLegacy > 0) {
    console.log('3. Clean up redundant legacy fields');
    console.log('   - Target: ' + hasContentSectionsAndLegacy + ' posts');
    console.log('   - Set legacy fields to NULL after verification\n');
  }

  if (hasLegacyOnly === 0 && hasNeither === 0) {
    console.log('1. Verify contentSections data quality on sample posts');
    console.log('2. Run cleanup script to NULL out redundant legacy fields');
    console.log('3. Create schema migration to drop legacy columns');
    console.log('4. Update TypeScript types to remove legacy fields\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

analyzeLegacyFields()
  .then(() => {
    console.log('✅ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
