-- Step 1: First, let's see the duplicate records
SELECT student_id, class_id, session_date, COUNT(*) as duplicate_count
FROM attendance 
GROUP BY student_id, class_id, session_date 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Remove duplicate records, keeping only the latest one by timestamp
-- This will delete older duplicate entries for the same student/class/date
DELETE FROM attendance a1 
WHERE a1.ctid NOT IN (
    SELECT DISTINCT ON (student_id, class_id, session_date) ctid
    FROM attendance a2 
    WHERE a2.student_id = a1.student_id 
      AND a2.class_id = a1.class_id 
      AND a2.session_date = a1.session_date
    ORDER BY student_id, class_id, session_date, timestamp DESC
);

-- Step 3: Verify duplicates are removed
SELECT student_id, class_id, session_date, COUNT(*) as remaining_count
FROM attendance 
GROUP BY student_id, class_id, session_date 
HAVING COUNT(*) > 1;

-- Step 4: Now add the unique constraint (should work after cleanup)
ALTER TABLE attendance ADD CONSTRAINT unique_student_class_session_date 
UNIQUE (student_id, class_id, session_date);

-- Step 5: Add status validation constraint
ALTER TABLE attendance ADD CONSTRAINT valid_attendance_status 
CHECK (status IN ('present', 'absent', 'late'));

-- Step 6: Remove the similarity_threshold column if it exists
ALTER TABLE face_profiles DROP COLUMN IF EXISTS similarity_threshold;

-- Step 7: Verify all constraints are in place
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'attendance' AND table_schema = 'public';