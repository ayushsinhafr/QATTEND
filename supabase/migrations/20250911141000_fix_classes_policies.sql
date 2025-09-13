-- Fix the infinite recursion issue in classes table policies
-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "faculty_full_access" ON public.classes;
DROP POLICY IF EXISTS "Faculty can view their own classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can insert their own classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can update their own classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can delete their own classes" ON public.classes;

-- Create simple, non-recursive policies
CREATE POLICY "classes_faculty_select" ON public.classes
FOR SELECT TO authenticated
USING (faculty_id = auth.uid());

CREATE POLICY "classes_faculty_insert" ON public.classes
FOR INSERT TO authenticated
WITH CHECK (faculty_id = auth.uid());

CREATE POLICY "classes_faculty_update" ON public.classes
FOR UPDATE TO authenticated
USING (faculty_id = auth.uid())
WITH CHECK (faculty_id = auth.uid());

CREATE POLICY "classes_faculty_delete" ON public.classes
FOR DELETE TO authenticated
USING (faculty_id = auth.uid());

-- Also ensure the classes table exists with correct structure
-- (This is safe to run even if table exists)
CREATE TABLE IF NOT EXISTS public.classes (
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

-- Make sure RLS is enabled
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
