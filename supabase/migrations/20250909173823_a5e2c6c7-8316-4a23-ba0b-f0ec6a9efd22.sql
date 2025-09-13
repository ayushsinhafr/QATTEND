-- Re-enable RLS on classes table
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policies without any functions
-- Faculty can do everything with their own classes
CREATE POLICY "Faculty manage own classes" ON public.classes
FOR ALL TO authenticated
USING (faculty_id = auth.uid())
WITH CHECK (faculty_id = auth.uid());

-- Students can only view classes they're enrolled in (direct query, no functions)
CREATE POLICY "Students view enrolled classes" ON public.classes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = classes.id 
    AND enrollments.student_id = auth.uid()
  )
);