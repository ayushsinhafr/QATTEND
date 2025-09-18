-- ✅ FACE RECOGNITION DATABASE SETUP
-- Copy and paste this entire script into your Supabase SQL Editor

-- Create face_profiles table
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

-- Create face_profile_embeddings table  
CREATE TABLE IF NOT EXISTS public.face_profile_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL,
    quality_score DECIMAL(4,3) DEFAULT 0.800,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profile_embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can manage their own face profile" ON public.face_profiles;
CREATE POLICY "Users can manage their own face profile" ON public.face_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own face embeddings" ON public.face_profile_embeddings;
CREATE POLICY "Users can manage their own face embeddings" ON public.face_profile_embeddings
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_face_profiles_user_id ON public.face_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_face_profile_embeddings_user_id ON public.face_profile_embeddings(user_id);

-- Fix attendance table for face verification
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'qr';

ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS student_id UUID;

ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS session_id UUID;

ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();

-- Success message
SELECT 'Face recognition tables created successfully!' as status;