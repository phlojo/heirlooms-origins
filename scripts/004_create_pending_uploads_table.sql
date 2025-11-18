-- Track temporary uploads that haven't been saved yet
CREATE TABLE IF NOT EXISTS pending_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'image', 'video', or 'raw'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours')
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_pending_uploads_expires_at ON pending_uploads(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_uploads_user_id ON pending_uploads(user_id);

-- RLS policies
ALTER TABLE pending_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own pending uploads"
  ON pending_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pending uploads"
  ON pending_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending uploads"
  ON pending_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE pending_uploads IS 'Tracks temporary Cloudinary uploads that haven''t been saved to artifacts yet. Used for cleanup of abandoned uploads.';
