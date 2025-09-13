-- First, let's see what's currently on the classes table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'classes';

-- Temporarily disable RLS on classes table to stop the recursion
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- Clean up any remaining policies
DROP POLICY IF EXISTS "Faculty can manage their classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view classes" ON public.classes;