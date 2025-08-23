import postgres from 'postgres';
import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURATION ---
// IMPORTANT: Set your database connection string in a .env file in the project root
// SUPABASE_DB_URL="postgres://postgres:[YOUR-PASSWORD]@[YOUR-HOST]/postgres"

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Migrations to explicitly skip (e.g., duplicates)
const SKIP_FILES = new Set([
  '20250820_create_session_players.sql',
  '20250810144129_add_room_rounds_and_current_round.sql',
]);

async function applyMigrations() {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error('🔴 ERROR: SUPABASE_DB_URL environment variable is not set.');
    console.error('Please create a .env file in the root of the project with your database connection string.');
    process.exit(1);
  }

  console.log('Connecting to the database...');
  const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

  try {
    // 1. Get and sort migration files
    console.log(`🔍 Reading migrations from: ${MIGRATIONS_DIR}`);
    const allFiles = await fs.readdir(MIGRATIONS_DIR);
    const migrationFiles = allFiles
      .filter(file => file.endsWith('.sql') && !SKIP_FILES.has(file))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('✅ No new migrations to apply.');
      return;
    }

    console.log(`Found ${migrationFiles.length} migrations to apply.`);

    // 2. Execute each migration
    for (const file of migrationFiles) {
      console.log(`
▶️ Applying migration: ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const script = await fs.readFile(filePath, 'utf-8');
      
      try {
        await sql.unsafe(script);
        console.log(`✅ SUCCESS: Applied ${file}`);
      } catch (error) {
        console.error(`❌ FAILED to apply ${file}:`, error);
        // Stop on first error
        throw new Error(`Migration ${file} failed.`);
      }
    }

    console.log('\n🎉 All migrations applied successfully!');

  } catch (error) {
    console.error('\n🔴 An error occurred during the migration process. Halting.', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('\n🔌 Database connection closed.');
  }
}

applyMigrations();
