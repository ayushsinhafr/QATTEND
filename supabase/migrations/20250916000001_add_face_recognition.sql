-- Enable pgvector extension for face embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Face profiles table - stores averaged embeddings per user
CREATE TABLE public.face_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  embedding vector(512), -- 512-dimensional face embedding
  embedding_count INT DEFAULT 0,
  quality_score REAL CHECK (quality_score >= 0 AND quality_score <= 1),
  similarity_threshold REAL DEFAULT 0.82 CHECK (similarity_threshold >= 0 AND similarity_threshold <= 1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Face profile embeddings - stores individual enrollment samples
CREATE TABLE public.face_profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.face_profiles(user_id) ON DELETE CASCADE,
  embedding vector(512),
  quality_score REAL CHECK (quality_score >= 0 AND quality_score <= 1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Face verification attempts - audit log for all verification attempts
CREATE TABLE public.face_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  embedding_hash TEXT, -- Hash of the attempted embedding for replay detection
  similarity_score REAL,
  threshold_used REAL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT, -- 'low_similarity', 'no_profile', 'replay_detected', etc.
  device_fingerprint TEXT,
  ip_hash TEXT, -- Partial IP hash for abuse detection
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Face verification config - system-wide settings
CREATE TABLE public.face_config (
  id INT PRIMARY KEY DEFAULT 1,
  default_similarity_threshold REAL DEFAULT 0.82 CHECK (default_similarity_threshold >= 0 AND default_similarity_threshold <= 1),
  max_attempts_per_session INT DEFAULT 3 CHECK (max_attempts_per_session > 0),
  enrollment_min_samples INT DEFAULT 3 CHECK (enrollment_min_samples > 0),
  enrollment_max_samples INT DEFAULT 5 CHECK (enrollment_max_samples >= enrollment_min_samples),
  replay_window_minutes INT DEFAULT 5 CHECK (replay_window_minutes > 0),
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_config_row CHECK (id = 1)
);

-- Insert default config
INSERT INTO public.face_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Add face verification settings to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS face_verification_enabled BOOLEAN DEFAULT false;

-- Add verification method to attendance table
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'qr';

-- Indexes for performance
CREATE INDEX face_verification_attempts_user_id_created_at_idx ON public.face_verification_attempts(user_id, created_at DESC);
CREATE INDEX face_verification_attempts_session_id_idx ON public.face_verification_attempts(session_id);
CREATE INDEX face_verification_attempts_success_created_at_idx ON public.face_verification_attempts(success, created_at DESC);
CREATE INDEX face_profile_embeddings_user_id_idx ON public.face_profile_embeddings(user_id);

-- RLS Policies
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_config ENABLE ROW LEVEL SECURITY;

-- Face profiles - users can only access their own
CREATE POLICY "Users can manage their own face profile" ON public.face_profiles
  FOR ALL USING (user_id = auth.uid());

-- Face profile embeddings - users can only access their own
CREATE POLICY "Users can manage their own face embeddings" ON public.face_profile_embeddings
  FOR ALL USING (user_id = auth.uid());

-- Face verification attempts - users can read their own, faculty can read for their classes
CREATE POLICY "Users can view their own verification attempts" ON public.face_verification_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Faculty can view verification attempts for their classes" ON public.face_verification_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes c 
      WHERE c.id = face_verification_attempts.class_id 
      AND c.faculty_id = auth.uid()
    )
  );

-- Face config - readable by all authenticated users, writable by faculty
CREATE POLICY "Authenticated users can read face config" ON public.face_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Faculty can update face config" ON public.face_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'faculty'
    )
  );

-- Function to update face profile timestamp
CREATE OR REPLACE FUNCTION public.update_face_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating face profile timestamp
CREATE TRIGGER update_face_profile_updated_at_trigger
  BEFORE UPDATE ON public.face_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_face_profile_updated_at();

-- Function to prevent excessive verification attempts
CREATE OR REPLACE FUNCTION public.check_face_verification_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  attempt_count INT;
  config_max_attempts INT;
BEGIN
  -- Get max attempts from config
  SELECT max_attempts_per_session INTO config_max_attempts 
  FROM public.face_config WHERE id = 1;
  
  -- Count recent attempts for this session
  SELECT COUNT(*) INTO attempt_count
  FROM public.face_verification_attempts
  WHERE user_id = NEW.user_id 
    AND session_id = NEW.session_id
    AND created_at > now() - interval '10 minutes';
  
  -- Check if limit exceeded
  IF attempt_count >= config_max_attempts THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many verification attempts';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rate limiting
CREATE TRIGGER check_face_verification_rate_limit_trigger
  BEFORE INSERT ON public.face_verification_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_face_verification_rate_limit();

-- Function to calculate average embedding from samples
CREATE OR REPLACE FUNCTION public.calculate_average_embedding(p_user_id UUID)
RETURNS vector(512) AS $$
DECLARE
  avg_embedding vector(512);
BEGIN
  -- Calculate component-wise average of all embeddings for the user
  SELECT vector_avg(embedding) INTO avg_embedding
  FROM public.face_profile_embeddings
  WHERE user_id = p_user_id;
  
  RETURN avg_embedding;
END;
$$ LANGUAGE plpgsql;

-- Function to safely compute cosine similarity
CREATE OR REPLACE FUNCTION public.cosine_similarity(a vector(512), b vector(512))
RETURNS REAL AS $$
BEGIN
  -- Using built-in vector operations
  RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql;