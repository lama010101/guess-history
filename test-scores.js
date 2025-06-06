// Test script to check global scores
const supabaseUrl = 'https://jghesmrwhegaotbztrhr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnaGVzbXJ3aGVnYW90Ynp0cmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MzAwMDEsImV4cCI6MjA2MDAwNjAwMX0.C-zSGAiZAIbvKh9vNb2_s3DHogSzSKImLkRbjr_h5xI';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Initialize a guest session if none exists
function ensureGuestSession() {
  if (!localStorage.getItem('guestSession') && !localStorage.getItem('supabase.auth.token')) {
    const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('guestSession', JSON.stringify({
      id: guestId,
      created_at: new Date().toISOString()
    }));
    console.log('Created new guest session:', guestId);
  }
}

// Get user ID from localStorage
function getUserId() {
  const guestSession = localStorage.getItem('guestSession');
  const authToken = localStorage.getItem('supabase.auth.token');
  
  if (authToken) {
    try {
      return JSON.parse(authToken).user.id;
    } catch (e) {
      console.error('Error parsing auth token:', e);
    }
  }
  
  if (guestSession) {
    try {
      return JSON.parse(guestSession).id;
    } catch (e) {
      console.error('Error parsing guest session:', e);
    }
  }
  
  return null;
}

// Get user type (guest or registered)
function isGuestUser() {
  return !localStorage.getItem('supabase.auth.token');
}

// Function to get current metrics
async function getCurrentMetrics() {
  const userId = getUserId();
  if (!userId) {
    console.error('No user ID found');
    return null;
  }

  if (isGuestUser()) {
    const storageKey = `user_metrics_${userId}`;
    const storedMetrics = JSON.parse(localStorage.getItem(storageKey) || '{}');
    console.log('Guest user metrics from localStorage:', storedMetrics);
    return storedMetrics;
  } else {
    try {
      const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching metrics:', error);
        return null;
      }
      
      console.log('Registered user metrics from database:', data);
      return data || {};
    } catch (error) {
      console.error('Exception when fetching metrics:', error);
      return null;
    }
  }
}

// Update metrics in the database or localStorage
async function updateMetrics(gameData) {
  const userId = getUserId();
  if (!userId) {
    console.error('No user ID found for updating metrics');
    return { success: false, error: 'No user ID' };
  }

  const {
    score = 0,
    correctAnswers = 0,
    totalQuestions = 0,
    timeSpent = 0
  } = gameData;

  if (isGuestUser()) {
    // For guest users, update localStorage
    const storageKey = `user_metrics_${userId}`;
    const currentMetrics = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    const xpEarned = parseInt(score) || 0;
    const newGlobalXp = (parseInt(currentMetrics.global_xp) || 0) + xpEarned;
    const newGamesPlayed = (parseInt(currentMetrics.games_played) || 0) + 1;
    const newTotalCorrect = (parseInt(currentMetrics.total_correct_answers) || 0) + (parseInt(correctAnswers) || 0);
    const newTotalQuestions = (parseInt(currentMetrics.total_questions_answered) || 0) + (parseInt(totalQuestions) || 0);
    const newTotalTimeSpent = (parseInt(currentMetrics.total_time_spent_seconds) || 0) + (parseInt(timeSpent) || 0);
    const newAverageAccuracy = newTotalQuestions > 0 ? Math.round((newTotalCorrect / newTotalQuestions) * 100) : 0;

    const updatedMetrics = {
      ...currentMetrics,
      user_id: userId,
      global_xp: newGlobalXp,
      games_played: newGamesPlayed,
      total_correct_answers: newTotalCorrect,
      total_questions_answered: newTotalQuestions,
      total_time_spent_seconds: newTotalTimeSpent,
      average_accuracy: newAverageAccuracy,
      updated_at: new Date().toISOString(),
      ...(currentMetrics.created_at ? {} : { created_at: new Date().toISOString() })
    };

    localStorage.setItem(storageKey, JSON.stringify(updatedMetrics));
    console.log('Updated guest metrics in localStorage:', updatedMetrics);
    
    return {
      success: true,
      isGuest: true,
      xpEarned,
      accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      updatedMetrics
    };
  } else {
    // For registered users, update the database
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing metrics:', fetchError);
        return { success: false, error: fetchError };
      }

      const xpEarned = parseInt(score) || 0;
      const newGamesPlayed = (parseInt(existing?.games_played) || 0) + 1;
      const newGlobalXp = (parseInt(existing?.global_xp) || 0) + xpEarned;
      const newTotalCorrect = (parseInt(existing?.total_correct_answers) || 0) + (parseInt(correctAnswers) || 0);
      const newTotalQuestions = (parseInt(existing?.total_questions_answered) || 0) + (parseInt(totalQuestions) || 0);
      const newTotalTimeSpent = (parseInt(existing?.total_time_spent_seconds) || 0) + (parseInt(timeSpent) || 0);
      const newAverageAccuracy = newTotalQuestions > 0 ? Math.round((newTotalCorrect / newTotalQuestions) * 100) : 0;

      const { data, error: upsertError } = await supabase
        .from('user_metrics')
        .upsert({
          user_id: userId,
          global_xp: newGlobalXp,
          games_played: newGamesPlayed,
          total_correct_answers: newTotalCorrect,
          total_questions_answered: newTotalQuestions,
          total_time_spent_seconds: newTotalTimeSpent,
          average_accuracy: newAverageAccuracy,
          updated_at: new Date().toISOString(),
          ...(existing ? {} : { created_at: new Date().toISOString() })
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error upserting metrics:', upsertError);
        return { success: false, error: upsertError };
      }

      console.log('Updated registered user metrics in database:', data);
      return {
        success: true,
        isGuest: false,
        xpEarned,
        accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        updatedMetrics: data
      };
    } catch (error) {
      console.error('Exception when updating metrics:', error);
      return { success: false, error: error.message };
    }
  }
}

// Run the test
async function testScores() {
  console.log('=== TESTING GLOBAL SCORES ===');
  
  // Ensure we have a guest session if not logged in
  ensureGuestSession();
  
  const userId = getUserId();
  const guestStatus = isGuestUser() ? 'Guest' : 'Registered';
  console.log(`Testing scores for ${guestStatus} user:`, userId);
  
  console.log('\n=== BEFORE GAME ===');
  const beforeMetrics = await getCurrentMetrics();
  console.log('Initial metrics:', beforeMetrics);
  
  // Simulate game completion with some test data
  const testGameData = {
    score: 250,
    correctAnswers: 8,
    totalQuestions: 10,
    timeSpent: 120 // seconds
  };
  
  console.log('\n=== SIMULATING GAME COMPLETION ===');
  console.log('Game results:', testGameData);
  
  try {
    // Update metrics with test data
    console.log('\nUpdating metrics...');
    const updateResult = await updateMetrics(testGameData);
    
    if (updateResult.success) {
      console.log('Metrics update successful:', updateResult);
      
      console.log('\n=== AFTER GAME ===');
      const afterMetrics = await getCurrentMetrics();
      
      // Compare before and after
      console.log('\n=== COMPARISON ===');
      console.log('Global XP before:', beforeMetrics?.global_xp || 0, 'after:', afterMetrics?.global_xp || 0);
      console.log('Games played before:', beforeMetrics?.games_played || 0, 'after:', afterMetrics?.games_played || 1);
      console.log('Total correct answers before:', beforeMetrics?.total_correct_answers || 0, 'after:', afterMetrics?.total_correct_answers || testGameData.correctAnswers);
      
      // Calculate expected values
      const expectedXp = (beforeMetrics?.global_xp || 0) + testGameData.score;
      const expectedGamesPlayed = (beforeMetrics?.games_played || 0) + 1;
      
      // Verify the results
      const xpMatches = afterMetrics?.global_xp === expectedXp;
      const gamesPlayedMatches = afterMetrics?.games_played === expectedGamesPlayed;
      
      console.log('\n=== VERIFICATION ===');
      console.log(`XP update ${xpMatches ? '✅' : '❌'}: Expected ${expectedXp}, got ${afterMetrics?.global_xp || 0}`);
      console.log(`Games played update ${gamesPlayedMatches ? '✅' : '❌'}: Expected ${expectedGamesPlayed}, got ${afterMetrics?.games_played || 1}`);
      
      if (xpMatches && gamesPlayedMatches) {
        console.log('\n🎉 Test passed! Global scores are updating correctly.');
      } else {
        console.log('\n❌ Test failed. Some metrics did not update as expected.');
      }
    } else {
      console.error('Failed to update metrics:', updateResult.error);
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Export the test function for the HTML page
window.testScores = testScores;
