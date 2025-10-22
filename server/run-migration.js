import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = join(__dirname, 'migrations');

console.log('🚀 MySpaceER Database Migration Runner');
console.log('=====================================\n');

// Check if migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  console.error('❌ Migrations directory not found:', migrationsDir);
  process.exit(1);
}

// Get all migration files
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.js'))
  .sort();

if (migrationFiles.length === 0) {
  console.log('ℹ️  No migrations found');
  process.exit(0);
}

console.log(`Found ${migrationFiles.length} migration(s):\n`);
migrationFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});
console.log('');

// Run migrations sequentially
async function runMigrations() {
  for (const file of migrationFiles) {
    const migrationPath = join(migrationsDir, file);
    console.log(`\n▶️  Running: ${file}`);
    console.log('─'.repeat(50));
    
    await new Promise((resolve, reject) => {
      const process = spawn('node', [migrationPath], {
        stdio: 'inherit',
        shell: true
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('─'.repeat(50));
          console.log(`✅ Completed: ${file}\n`);
          resolve();
        } else {
          console.error(`\n❌ Migration failed: ${file} (exit code: ${code})`);
          reject(new Error(`Migration failed with code ${code}`));
        }
      });
      
      process.on('error', (err) => {
        console.error(`\n❌ Error running migration ${file}:`, err);
        reject(err);
      });
    });
  }
}

// Run all migrations
runMigrations()
  .then(() => {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Generate encryption key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.log('   2. Update .env file with ENCRYPTION_KEY');
    console.log('   3. Restart your server\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration process failed:', err.message);
    process.exit(1);
  });
