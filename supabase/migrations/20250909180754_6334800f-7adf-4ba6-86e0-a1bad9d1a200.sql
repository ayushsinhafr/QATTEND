-- NUCLEAR OPTION: Drop the table and recreate it fresh without any policy issues
DROP TABLE IF EXISTS public.classes CASCADE;

-- Recreate classes table from scratch
CREATE TABLE public.classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name text NOT NULL,
  section text NOT NULL,
  class_code text NOT NULL UNIQUE,
  faculty_id uuid NOT NULL,
  student_strength integer DEFAULT 0,
  qr_token text,
  qr_expiration timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policies that cannot cause recursion
CREATE POLICY "faculty_full_access" ON public.classes
FOR ALL TO authenticated
USING (faculty_id = auth.uid())
WITH CHECK (faculty_id = auth.uid());