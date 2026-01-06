import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Schema Sync Script
 * 
 * Synchronizes database schema changes between PostgreSQL and D1
 * 
 * Usage:
 *   pnpm schema:sync           # Full sync (generate + apply)
 *   pnpm schema:generate       # Only generate migrations
 *   pnpm schema:apply          # Only apply migrations
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command: string, description: string) {
  log(`\n${description}`, colors.blue);
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} - Success`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${description} - Failed`, colors.red);
    return false;
  }
}

function getLatestMigrationFile(dir: string): string | null {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => ({
        name: f,
        path: join(dir, f),
        time: statSync(join(dir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    return files.length > 0 ? files[0].path : null;
  } catch {
    return null;
  }
}

async function generateMigrations() {
  log('\n🔧 Generating migrations...', colors.bright);

  // PostgreSQL migration
  const pgSuccess = execCommand(
    'pnpm drizzle-kit generate',
    '📝 Generating PostgreSQL migration'
  );

  // D1 migration
  const d1Success = execCommand(
    'pnpm drizzle-kit generate --config=drizzle.config.d1.ts',
    '📝 Generating D1 migration'
  );

  return pgSuccess && d1Success;
}

async function applyMigrations() {
  log('\n🚀 Applying migrations...', colors.bright);

  // Apply to local PostgreSQL (using drizzle-kit push for dev)
  const pgSuccess = execCommand(
    'pnpm drizzle-kit push',
    '✨ Applying to local PostgreSQL'
  );

  // Apply to local D1
  const d1MigrationFile = getLatestMigrationFile('migrations/d1');
  let d1Success = true;

  if (d1MigrationFile) {
    d1Success = execCommand(
      `pnpm wrangler d1 execute bananaprompts-db --file=${d1MigrationFile}`,
      '✨ Applying to local D1'
    );
  } else {
    log('⚠️  No D1 migration file found', colors.yellow);
  }

  return pgSuccess && d1Success;
}

async function fullSync() {
  log('\n🔄 Starting full schema sync...', colors.bright);
  log('════════════════════════════════════════', colors.bright);

  // Step 1: Generate migrations
  const generateSuccess = await generateMigrations();
  if (!generateSuccess) {
    log('\n❌ Migration generation failed', colors.red);
    process.exit(1);
  }

  // Step 2: Apply migrations
  const applySuccess = await applyMigrations();
  if (!applySuccess) {
    log('\n❌ Migration application failed', colors.red);
    process.exit(1);
  }

  // Success summary
  log('\n════════════════════════════════════════', colors.green);
  log('🎉 Schema sync complete!', colors.green);
  log('════════════════════════════════════════', colors.green);

  log('\n📌 Next steps:', colors.yellow);
  log('  1. Test your changes locally with: pnpm run dev');
  log('  2. Deploy to production D1:');
  
  const d1MigrationFile = getLatestMigrationFile('migrations/d1');
  if (d1MigrationFile) {
    log(`     pnpm wrangler d1 execute bananaprompts-db --file=${d1MigrationFile} --remote`);
  }
  log('  3. Deploy your application: pnpm run deploy\n');
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'generate':
    generateMigrations();
    break;
  case 'apply':
    applyMigrations();
    break;
  default:
    fullSync();
}
