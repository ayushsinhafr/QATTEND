-- Enable pgvector extension for face embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Face profiles table - stores averaged embeddings per user
CREATE TABLE IF NOT EXISTS public.face_profiles (
  user_id UUID PRIMARY KEY,
  embedding vector(512), -- 512-dimensional face embedding
  embedding_count INT DEFAULT 0,
  quality_score REAL CHECK (quality_score >= 0 AND quality_score <= 1),
  similarity_threshold REAL DEFAULT 0.82 CHECK (similarity_threshold >= 0 AND similarity_threshold <= 1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Face profile embeddings - stores individual enrollment samples
CREATE TABLE IF NOT EXISTS public.face_profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  embedding vector(512),
  quality_score REAL CHECK (quality_score >= 0 AND quality_score <= 1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Face verification attempts - audit log for all verification attempts
CREATE TABLE IF NOT EXISTS public.face_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  class_id UUID,
  session_id UUID,
  embedding_hash TEXT,
  similarity_score REAL,
  threshold_used REAL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  device_fingerprint TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Face verification config - system-wide settings
CREATE TABLE IF NOT EXISTS public.face_config (
  id INT PRIMARY KEY DEFAULT 1,
  default_similarity_threshold REAL DEFAULT 0.82 CHECK (default_similarity_threshold >= 0 AND default_similarity_threshold <= 1),
  max_attempts_per_session INT DEFAULT 3 CHECK (max_attempts_per_session > 0),
  enrollment_min_samples INT DEFAULT 3 CHECK (enrollment_min_samples > 0),
  enrollment_max_samples INT DEFAULT 5 CHECK (enrollment_max_samples >= enrollment_min_samples),
  replay_window_minutes INT DEFAULT 5 CHECK (replay_window_minutes > 0),
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default config
INSERT INTO public.face_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS face_profiles_user_id_idx ON public.face_profiles(user_id);
CREATE INDEX IF NOT EXISTS face_profile_embeddings_user_id_idx ON public.face_profile_embeddings(user_id);
CREATE INDEX IF NOT EXISTS face_verification_attempts_user_id_idx ON public.face_verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS face_verification_attempts_created_at_idx ON public.face_verification_attempts(created_at);

-- Enable Row Level Security
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own face profiles" ON public.face_profiles
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own face profile embeddings" ON public.face_profile_embeddings
  USING (user_id IN (SELECT user_id FROM public.face_profiles WHERE auth.uid() = user_id));

CREATE POLICY "Users can view their own face verification attempts" ON public.face_verification_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read face config" ON public.face_config
  FOR SELECT USING (auth.role() = 'authenticated');