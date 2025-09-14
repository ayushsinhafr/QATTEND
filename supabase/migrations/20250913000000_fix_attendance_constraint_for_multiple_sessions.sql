-- Fix attendance constraint to allow multiple sessions per day
-- Drop the existing unique constraint that prevents multiple sessions per day
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_class_id_session_date_key;

-- Add new unique constraint that includes timestamp to allow multiple sessions per day
-- This ensures one attendance record per student per class per specific session (timestamp)
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_class_id_timestamp_key 
  UNIQUE(student_id, class_id, timestamp);

-- Update the attendance table comment
COMMENT ON TABLE public.attendance IS 'Stores student attendance records - allows multiple sessions per day with unique timestamps';