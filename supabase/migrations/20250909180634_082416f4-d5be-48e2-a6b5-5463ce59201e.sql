-- Add student policy to view enrolled classes
CREATE POLICY "simple_student_policy" ON public.classes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = classes.id 
    AND enrollments.student_id = auth.uid()
  )
);