-- Simple face config table creation
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

-- Insert default config if not exists
INSERT INTO public.face_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.face_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Authenticated users can read face config" ON public.face_config
  FOR SELECT USING (auth.role() = 'authenticated');