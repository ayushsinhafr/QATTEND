-- Add foreign key constraints back to maintain referential integrity

-- Add foreign key from enrollments to classes
ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- Add foreign key from attendance to classes
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- Add foreign key from attendance to profiles (student)
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key from enrollments to profiles (student)
ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_classes_faculty_id ON public.classes(faculty_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_class ON public.enrollments(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, session_date);