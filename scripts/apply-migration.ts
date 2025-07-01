import { supabase } from '../src/integrations/supabase/client';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20240630_fix_image_feedback_table.sql'
    );
    
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 100) + '...');
      const { error } = await supabase.rpc('exec', { query: statement + ';' });
      
      if (error) {
        // Ignore "relation already exists" errors for idempotency
        if (!error.message.includes('already exists') && !error.message.includes('does not exist')) {
          console.error('Error executing statement:', error);
          return;
        }
        console.log('Statement skipped (already exists):', statement.substring(0, 100) + '...');
      }
    }
    
    console.log('Migration applied successfully!');
    
    // Verify the table was created
    const { data: tables, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'image_feedback' });
    
    if (tableError) {
      console.log('Could not verify table creation, but migration completed. Error:', tableError);
    } else {
      console.log('Table verification result:', tables);
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

// Run the migration
applyMigration();
