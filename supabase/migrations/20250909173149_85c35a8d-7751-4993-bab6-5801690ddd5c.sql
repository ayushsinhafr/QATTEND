-- Drop ALL existing policies on classes table to start fresh
DROP POLICY IF EXISTS "Faculty can create classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can update their own classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can delete their own classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can view their own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;

-- Create a simpler security definer function that gets user role directly
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create much simpler policies that avoid recursion
CREATE POLICY "Faculty can manage their classes" 
ON public.classes 
FOR ALL
TO authenticated
USING (faculty_id = auth.uid() AND public.get_user_role() = 'faculty')
WITH CHECK (faculty_id = auth.uid() AND public.get_user_role() = 'faculty');

-- Separate policy for students to view classes they're enrolled in
-- This needs to be done differently to avoid recursion
CREATE POLICY "Students can view classes" 
ON public.classes
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'student' 
  AND EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = classes.id 
    AND enrollments.student_id = auth.uid()
  )
);