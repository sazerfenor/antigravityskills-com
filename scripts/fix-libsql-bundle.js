#!/usr/bin/env node
/**
 * Fix @libsql/client bundling issue in OpenNext Cloudflare
 *
 * Problem: OpenNext's file tracing doesn't copy web.js file
 * Solution: Manually copy missing files after build
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../node_modules/@libsql/client/lib-esm');
const TARGET_DIR = path.join(__dirname, '../.open-next/server-functions/default/node_modules/@libsql/client/lib-esm');

console.log('🔧 Fixing @libsql/client bundle...');

// Check if target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  console.log('❌ Target directory does not exist:', TARGET_DIR);
  console.log('   OpenNext build may have failed earlier.');
  process.exit(1);
}

// List of missing files that need to be copied
const missingFiles = ['web.js', 'web.d.ts'];

let copiedCount = 0;
let errorCount = 0;

for (const file of missingFiles) {
  const sourcePath = path.join(SOURCE_DIR, file);
  const targetPath = path.join(TARGET_DIR, file);

  try {
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.log(`⚠️  Source file not found: ${file}`);
      errorCount++;
      continue;
    }

    // Check if already exists
    if (fs.existsSync(targetPath)) {
      console.log(`✓ Already exists: ${file}`);
      continue;
    }

    // Copy file
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied: ${file}`);
    copiedCount++;
  } catch (err) {
    console.error(`❌ Failed to copy ${file}:`, err.message);
    errorCount++;
  }
}

console.log(`\n✅ Fix completed: ${copiedCount} files copied, ${errorCount} errors`);

if (errorCount > 0) {
  process.exit(1);
}
