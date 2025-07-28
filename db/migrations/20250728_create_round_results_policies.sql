-- RLS Policies for round_results table
-- Enable RLS
ALTER TABLE round_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own round results
CREATE POLICY "Users can view own round results" ON round_results
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Policy: Users can only insert their own round results
CREATE POLICY "Users can insert own round results" ON round_results
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Policy: Users can only update their own round results
CREATE POLICY "Users can update own round results" ON round_results
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Policy: Users can only delete their own round results
CREATE POLICY "Users can delete own round results" ON round_results
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Create indexes for performance
CREATE INDEX idx_round_results_user_id ON round_results(user_id);
CREATE INDEX idx_round_results_game_id ON round_results(game_id);
CREATE INDEX idx_round_results_user_game ON round_results(user_id, game_id);
