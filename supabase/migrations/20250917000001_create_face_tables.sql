-- Create face recognition tables
CREATE TABLE IF NOT EXISTS public.face_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL,
    embedding_count INTEGER NOT NULL DEFAULT 1,
    quality_score DECIMAL(4,3) DEFAULT 0.800,
    similarity_threshold DECIMAL(4,3) DEFAULT 0.450,
    device_fingerprint JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.face_profile_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL,
    quality_score DECIMAL(4,3) DEFAULT 0.800,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profile_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own face profile" ON public.face_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own face embeddings" ON public.face_profile_embeddings
    FOR ALL USING (auth.uid() = user_id);