import { supabase } from '../src/integrations/supabase/client';

async function createImageFeedbackTable() {
  try {
    console.log('Creating image_feedback table...');
    
    // Create the image_feedback table
    const { error: createTableError } = await supabase.rpc('exec', {
      query: `
        CREATE TABLE IF NOT EXISTS public.image_feedback (
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

    if (createTableError) {
      console.error('Error creating table:', createTableError);
      return;
    }
    
    console.log('Enabling RLS on image_feedback table...');
    
    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec', {
      query: 'ALTER TABLE public.image_feedback ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
      return;
    }
    
    // Create policies
    const policies = [
      {
        name: 'Users can view their own feedback',
        command: 'SELECT',
        using: 'auth.uid() = user_id'
      },
      {
        name: 'Users can insert their own feedback',
        command: 'INSERT',
        withCheck: 'auth.uid() = user_id'
      },
      {
        name: 'Users can update their own feedback',
        command: 'UPDATE',
        using: 'auth.uid() = user_id',
        withCheck: 'auth.uid() = user_id'
      }
    ];
    
    for (const policy of policies) {
      console.log(`Creating policy: ${policy.name}...`);
      
      let query = `
        CREATE POLICY "${policy.name}" 
        ON public.image_feedback 
        FOR ${policy.command} 
      `;
      
      if (policy.using) {
        query += `USING (${policy.using}) `;
      }
      
      if (policy.withCheck) {
        query += `WITH CHECK (${policy.withCheck})`;
      }
      
      query += ';';
      
      const { error: policyError } = await supabase.rpc('exec', { query });
      
      if (policyError) {
        console.error(`Error creating policy ${policy.name}:`, policyError);
      }
    }
    
    // Create the update trigger function
    console.log('Creating update_modified_column function...');
    const { error: functionError } = await supabase.rpc('exec', {
      query: `
        CREATE OR REPLACE FUNCTION public.update_modified_column() 
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (functionError) {
      console.error('Error creating update_modified_column function:', functionError);
      return;
    }
    
    // Create the trigger
    console.log('Creating update trigger...');
    const { error: triggerError } = await supabase.rpc('exec', {
      query: `
        DROP TRIGGER IF EXISTS update_image_feedback_updated_at ON public.image_feedback;
        CREATE TRIGGER update_image_feedback_updated_at
        BEFORE UPDATE ON public.image_feedback
        FOR EACH ROW
        EXECUTE FUNCTION public.update_modified_column();
      `
    });
    
    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
      return;
    }
    
    console.log('Image feedback table and policies created successfully!');
    
  } catch (error) {
    console.error('Error in createImageFeedbackTable:', error);
  }
}

// Run the function
createImageFeedbackTable();
