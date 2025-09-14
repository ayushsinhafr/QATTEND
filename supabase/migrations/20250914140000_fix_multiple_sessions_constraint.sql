-- Fix database constraint to allow multiple attendance sessions per day
-- This fixes the critical issue where only one session per day was allowed

-- Drop the existing constraint that prevents multiple sessions per day
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_class_id_session_date_key;

-- Add new constraint that allows multiple sessions by including timestamp
-- This ensures uniqueness per session while allowing multiple sessions per day
ALTER TABLE public.attendance ADD CONSTRAINT attendance_unique_session 
UNIQUE(student_id, class_id, session_date, timestamp);

-- Create indexes for better performance on frequent queries
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON public.attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_student_session ON public.attendance(student_id, session_date);

-- Create index for enrollments table to improve join performance
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);

-- Create composite index for common attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_class_student_date ON public.attendance(class_id, student_id, session_date);

-- Add updated_at trigger for attendance table
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'updated_at') THEN
        ALTER TABLE public.attendance ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    END IF;
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_attendance_updated_at_trigger ON public.attendance;
CREATE TRIGGER update_attendance_updated_at_trigger
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_updated_at();

-- Add comment for documentation
COMMENT ON CONSTRAINT attendance_unique_session ON public.attendance IS 
'Allows multiple attendance sessions per day by including timestamp in uniqueness constraint';