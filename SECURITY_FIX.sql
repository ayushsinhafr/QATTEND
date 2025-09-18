-- Fix the security issues and reset thresholds
-- Reset any manually set thresholds (remove the column if it exists)
ALTER TABLE face_profiles DROP COLUMN IF EXISTS similarity_threshold;

-- Add a unique constraint to prevent duplicate attendance per session per day
-- This will prevent the "attendance already marked" bypass
ALTER TABLE attendance ADD CONSTRAINT unique_student_class_session_date 
UNIQUE (student_id, class_id, session_date);

-- Also add a check to ensure status is valid
ALTER TABLE attendance ADD CONSTRAINT valid_attendance_status 
CHECK (status IN ('present', 'absent', 'late'));

-- Verify the changes
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'attendance' AND table_schema = 'public';