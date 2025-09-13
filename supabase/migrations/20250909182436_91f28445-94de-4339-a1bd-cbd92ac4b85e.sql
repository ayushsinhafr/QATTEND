-- Add RLS policy to allow students to read classes when joining
CREATE POLICY "Students can view classes to join them" ON public.classes
FOR SELECT TO authenticated
USING (true);

-- Also add a policy to allow students to view enrolled classes  
CREATE POLICY "Students can view their enrolled classes" ON public.classes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = classes.id 
    AND enrollments.student_id = auth.uid()
  )
);