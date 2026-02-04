-- Prepare guides (study guide generator)
CREATE TABLE IF NOT EXISTS prepare_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  subject TEXT,
  image_urls TEXT[],
  document_url TEXT,
  extracted_content TEXT,
  source_type TEXT CHECK (source_type IN ('image', 'pdf', 'pptx', 'docx', 'text')),
  generated_guide JSONB NOT NULL DEFAULT '{}',
  generation_status TEXT DEFAULT 'processing' CHECK (generation_status IN ('processing', 'generating', 'complete', 'failed')),
  youtube_videos JSONB,
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages for prepare guides
CREATE TABLE IF NOT EXISTS prepare_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES prepare_guides ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  section_ref TEXT,
  diagram JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prepare_guides_user ON prepare_guides(user_id);
CREATE INDEX idx_prepare_guides_share ON prepare_guides(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_prepare_guides_created ON prepare_guides(created_at DESC);
CREATE INDEX idx_prepare_chat_guide ON prepare_chat_messages(guide_id);
CREATE INDEX idx_prepare_chat_created ON prepare_chat_messages(created_at);

-- RLS
ALTER TABLE prepare_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepare_chat_messages ENABLE ROW LEVEL SECURITY;

-- Guide policies: owner can do everything, public guides viewable via share_token
CREATE POLICY "Users can manage their own guides" ON prepare_guides FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public guides viewable by anyone" ON prepare_guides FOR SELECT USING (is_public = true AND share_token IS NOT NULL);

-- Chat policies: owner can manage their chat messages
CREATE POLICY "Users can manage their own chat messages" ON prepare_chat_messages FOR ALL USING (
  user_id = auth.uid()
);
