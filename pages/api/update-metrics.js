import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, isGuest, score, correctAnswers, totalQuestions, timeSpent } = req.body;

  try {
    if (isGuest) {
      // For guest users, return the calculated values
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const xpEarned = score;
      
      return res.status(200).json({
        success: true,
        isGuest: true,
        xpEarned,
        accuracy,
        message: 'Guest metrics calculated (saved to localStorage on client)'
      });
    } else {
      // For registered users, update the database
      const { data: existing, error: fetchError } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError;
      }

      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const xpEarned = score;
      const newGamesPlayed = (existing?.games_played || 0) + 1;
      const newGlobalXp = (existing?.global_xp || 0) + xpEarned;
      const newTotalCorrect = (existing?.total_correct_answers || 0) + correctAnswers;
      const newTotalQuestions = (existing?.total_questions_answered || 0) + totalQuestions;
      const newTotalTimeSpent = (existing?.total_time_spent_seconds || 0) + timeSpent;
      const newAverageAccuracy = Math.round((newTotalCorrect / newTotalQuestions) * 100) || 0;

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

      if (upsertError) throw upsertError;

      return res.status(200).json({
        success: true,
        isGuest: false,
        xpEarned,
        accuracy,
        updatedMetrics: data
      });
    }
  } catch (error) {
    console.error('Error updating metrics:', error);
    return res.status(500).json({
      error: 'Failed to update metrics',
      details: error.message
    });
  }
}
