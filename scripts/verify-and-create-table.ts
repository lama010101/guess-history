import { supabase } from '../src/integrations/supabase/client';

async function verifyAndCreateTable() {
  try {
    console.log('Checking if image_feedback table exists...');
    
    // Check if the table exists
    const { data: tableCheck, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'image_feedback')
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for table:', checkError);
      return;
    }
    
    if (tableCheck) {
      console.log('image_feedback table already exists.');
      return;
    }
    
    console.log('Table does not exist. Creating image_feedback table...');
    
    // Create the table using a raw SQL query
    const { error: createError } = await supabase.rpc('exec', {
      query: `
        CREATE TABLE public.image_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          image_id UUID NOT NULL,
          round_id UUID NOT NULL,
          image_accuracy INTEGER NOT NULL CHECK (image_accuracy >= 1 AND image_accuracy <= 10),
          description_accurate BOOLEAN,
          location_accurate BOOLEAN,
          date_accurate BOOLEAN,
          comment TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT unique_user_round_feedback UNIQUE (user_id, round_id)
        );
      `
    });
    
    if (createError) {
      console.error('Error creating table:', createError);
      return;
    }
    
    console.log('Table created successfully!');
    
  } catch (error) {
    console.error('Error in verifyAndCreateTable:', error);
  }
}

// Run the function
verifyAndCreateTable();
