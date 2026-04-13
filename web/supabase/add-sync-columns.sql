-- Add last_sync_month to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sync_month text;

-- Add new columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS chess_com_id text UNIQUE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS user_elo integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent_elo integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent_username text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS time_control text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opening_name text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opening_eco text;

-- Make accuracy_score nullable (it may already be, but ensure it)
ALTER TABLE games ALTER COLUMN accuracy_score DROP NOT NULL;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_games_user_played ON games (user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_chess_com_id ON games (chess_com_id);
