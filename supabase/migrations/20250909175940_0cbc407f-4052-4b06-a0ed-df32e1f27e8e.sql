-- Drop ALL existing policies on classes table to start fresh
DROP POLICY IF EXISTS "Allow faculty to create new classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty manage own classes" ON public.classes;
DROP POLICY IF EXISTS "Students view enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can manage their classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view classes" ON public.classes;

-- Ensure RLS is enabled
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create completely new, simple policies without any recursion
-- Faculty can manage their own classes (all operations)
CREATE POLICY "faculty_manage_own_classes" ON public.classes
FOR ALL TO authenticated
USING (faculty_id = auth.uid())
WITH CHECK (faculty_id = auth.uid());

-- Students can view classes they are enrolled in
CREATE POLICY "students_view_enrolled_classes" ON public.classes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = classes.id 
    AND enrollments.student_id = auth.uid()
  )
);