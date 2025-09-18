-- Create face recognition tables

-- Face profiles table to store user face data
CREATE TABLE IF NOT EXISTS public.face_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL, -- Stored as PostgreSQL array string
    embedding_count INTEGER NOT NULL DEFAULT 1,
    quality_score DECIMAL(4,3) DEFAULT 0.800,
    similarity_threshold DECIMAL(4,3) DEFAULT 0.450,
    device_fingerprint JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Face profile embeddings table for storing individual samples
CREATE TABLE IF NOT EXISTS public.face_profile_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL, -- Stored as PostgreSQL array string
    quality_score DECIMAL(4,3) DEFAULT 0.800,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Face verification attempts table for logging
CREATE TABLE IF NOT EXISTS public.face_verification_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID,
    similarity_score DECIMAL(5,4),
    threshold_used DECIMAL(4,3),
    verification_successful BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for face_profiles
DROP POLICY IF EXISTS "Users can manage their own face profile" ON public.face_profiles;
CREATE POLICY "Users can manage their own face profile" ON public.face_profiles
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for face_profile_embeddings  
DROP POLICY IF EXISTS "Users can manage their own face embeddings" ON public.face_profile_embeddings;
CREATE POLICY "Users can manage their own face embeddings" ON public.face_profile_embeddings
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for face_verification_attempts
DROP POLICY IF EXISTS "Users can view their own verification attempts" ON public.face_verification_attempts;
CREATE POLICY "Users can view their own verification attempts" ON public.face_verification_attempts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert verification attempts" ON public.face_verification_attempts;
CREATE POLICY "System can insert verification attempts" ON public.face_verification_attempts
    FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_face_profiles_user_id ON public.face_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_face_profile_embeddings_user_id ON public.face_profile_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_face_verification_attempts_user_id ON public.face_verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_face_verification_attempts_created_at ON public.face_verification_attempts(created_at);

-- Update attendance table to support face verification
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'qr';

ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS student_id UUID;

ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS session_id UUID;

ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();

-- Update student_id from user_id if it's empty
UPDATE public.attendance 
SET student_id = user_id 
WHERE student_id IS NULL AND user_id IS NOT NULL;

-- Add RLS policies for attendance
DROP POLICY IF EXISTS "Students can insert their own attendance" ON public.attendance;
CREATE POLICY "Students can insert their own attendance" ON public.attendance
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS attendance_student_id_session_date_idx 
ON public.attendance(student_id, session_date);