import { supabase } from '../src/integrations/supabase/client';

async function verifyImageFeedbackTable() {
  try {
    console.log('Checking if image_feedback table exists...');
    
    // Check if the table exists
    const { data: tableExists, error: tableCheckError } = await supabase.rpc('exec', {
      query: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE  table_schema = 'public' 
          AND    table_name   = 'image_feedback'
        );
      `
    });

    if (tableCheckError) {
      console.error('Error checking if table exists:', tableCheckError);
      return;
    }

    console.log('Table exists:', tableExists);

    // Get table structure
    const { data: tableStructure, error: structureError } = await supabase.rpc('exec', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'image_feedback';
      `
    });

    if (structureError) {
      console.error('Error getting table structure:', structureError);
      return;
    }

    console.log('Table structure:');
    console.table(tableStructure);

    // Check RLS status
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec', {
      query: `
        SELECT relname, relrowsecurity, relforcerowsecurity
        FROM pg_class
        WHERE oid = 'public.image_feedback'::regclass;
      `
    });

    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
      return;
    }

    console.log('RLS status:');
    console.table(rlsStatus);

    // Check policies
    const { data: policies, error: policiesError } = await supabase.rpc('exec', {
      query: `
        SELECT * FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'image_feedback';
      `
    });

    if (policiesError) {
      console.error('Error checking policies:', policiesError);
      return;
    }

    console.log('Policies:');
    console.table(policies);

  } catch (error) {
    console.error('Error in verifyImageFeedbackTable:', error);
  }
}

// Run the verification
verifyImageFeedbackTable();
