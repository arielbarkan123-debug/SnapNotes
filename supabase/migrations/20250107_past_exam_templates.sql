-- Past Exam Templates table for storing user-uploaded past exams
-- These are used as style references for AI-generated exams

-- Create the past_exam_templates table
CREATE TABLE IF NOT EXISTS public.past_exam_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'pptx', 'docx')),
    original_filename TEXT NOT NULL,
    file_size_bytes INTEGER,
    analysis_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
    analysis_error TEXT,
    analyzed_at TIMESTAMPTZ,
    extracted_analysis JSONB,
    extracted_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_user_id
    ON public.past_exam_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_analysis_status
    ON public.past_exam_templates(analysis_status);
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_created_at
    ON public.past_exam_templates(created_at DESC);

-- Enable RLS
ALTER TABLE public.past_exam_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own templates
CREATE POLICY "Users can view their own past exam templates"
    ON public.past_exam_templates
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own past exam templates"
    ON public.past_exam_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own past exam templates"
    ON public.past_exam_templates
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own past exam templates"
    ON public.past_exam_templates
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_past_exam_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_past_exam_templates_updated_at
    BEFORE UPDATE ON public.past_exam_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_past_exam_templates_updated_at();

-- Storage bucket for past exam files
-- Note: This needs to be created via Supabase dashboard or SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('past-exams', 'past-exams', false);

-- Storage policies for the past-exams bucket
-- Users can upload to their own folder (user_id/filename)
CREATE POLICY "Users can upload their own past exam files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'past-exams'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can view their own files
CREATE POLICY "Users can view their own past exam files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'past-exams'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own files
CREATE POLICY "Users can delete their own past exam files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'past-exams'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Grant necessary permissions
GRANT ALL ON public.past_exam_templates TO authenticated;
GRANT ALL ON public.past_exam_templates TO service_role;
