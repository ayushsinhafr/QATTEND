-- Add student access policy for classes table (for QR code scanning)
-- Students need to be able to read class data when scanning QR codes

CREATE POLICY "classes_student_qr_access" ON public.classes
FOR SELECT TO authenticated
USING (
  -- Allow students to access class data when they have a valid QR token
  qr_token IS NOT NULL 
  AND qr_expiration > now()
  AND EXISTS (
    SELECT 1 FROM auth.users au 
    JOIN profiles p ON p.user_id = au.id 
    WHERE au.id = auth.uid() 
    AND p.role = 'student'
  )
);

-- Also ensure students can read their enrollment status
CREATE POLICY IF NOT EXISTS "enrollments_student_select" ON public.enrollments
FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Allow students to insert attendance records
CREATE POLICY IF NOT EXISTS "attendance_student_insert" ON public.attendance
FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

-- Allow students to view their own attendance
CREATE POLICY IF NOT EXISTS "attendance_student_select" ON public.attendance
FOR SELECT TO authenticated
USING (student_id = auth.uid());
