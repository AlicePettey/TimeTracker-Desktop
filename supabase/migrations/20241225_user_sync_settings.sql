-- User Sync Settings Table
-- Stores auto-sync configuration options for the desktop companion

CREATE TABLE IF NOT EXISTS user_sync_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sync interval in minutes (5, 15, 30)
  sync_interval INTEGER NOT NULL DEFAULT 15 CHECK (sync_interval IN (5, 15, 30)),
  
  -- Sync on app close
  sync_on_close BOOLEAN NOT NULL DEFAULT true,
  
  -- Sync when idle (after idle detection)
  sync_on_idle BOOLEAN NOT NULL DEFAULT true,
  
  -- Auto-sync enabled
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Sync on startup
  sync_on_startup BOOLEAN NOT NULL DEFAULT true,
  
  -- Batch size for syncing (number of activities per request)
  batch_size INTEGER NOT NULL DEFAULT 50 CHECK (batch_size >= 10 AND batch_size <= 200),
  
  -- Retry failed syncs
  retry_failed_syncs BOOLEAN NOT NULL DEFAULT true,
  
  -- Max retry attempts
  max_retry_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_retry_attempts >= 1 AND max_retry_attempts <= 10),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one settings record per user
  CONSTRAINT unique_user_sync_settings UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_sync_settings_user_id ON user_sync_settings(user_id);

-- Enable RLS
ALTER TABLE user_sync_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read their own settings
CREATE POLICY "Users can read own sync settings"
  ON user_sync_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own sync settings"
  ON user_sync_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own sync settings"
  ON user_sync_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own sync settings"
  ON user_sync_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS trigger_update_user_sync_settings_updated_at ON user_sync_settings;
CREATE TRIGGER trigger_update_user_sync_settings_updated_at
  BEFORE UPDATE ON user_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_sync_settings_updated_at();

-- Function to create default settings for new users
CREATE OR REPLACE FUNCTION create_default_sync_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_sync_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You may want to add a trigger on auth.users to auto-create settings
-- This would require superuser access and is typically done in a separate migration
