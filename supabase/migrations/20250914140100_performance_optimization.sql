-- Performance optimization migration
-- Adds missing indexes and query optimizations for QAttend

-- Add composite indexes for frequent query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_class_date 
ON attendance (class_id, session_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_student_class 
ON attendance (student_id, class_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_timestamp_desc 
ON attendance (timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status_date 
ON attendance (status, session_date) WHERE status = 'present';

-- Optimize enrollment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_class_student 
ON enrollments (class_id, student_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_student_enrolled 
ON enrollments (student_id, enrolled_at DESC);

-- Optimize class queries for faculty
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_faculty_created 
ON classes (faculty_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_qr_expiration 
ON classes (qr_expiration) WHERE qr_expiration IS NOT NULL;

-- Add partial index for active QR tokens
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_active_qr 
ON classes (qr_token, qr_expiration) 
WHERE qr_token IS NOT NULL AND qr_expiration > NOW();

-- Optimize profile lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_name 
ON profiles (role, name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_unique_id 
ON profiles (unique_id) WHERE unique_id IS NOT NULL;

-- Add statistics targets for better query planning
ALTER TABLE attendance ALTER COLUMN class_id SET STATISTICS 1000;
ALTER TABLE attendance ALTER COLUMN session_date SET STATISTICS 1000;
ALTER TABLE attendance ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE classes ALTER COLUMN faculty_id SET STATISTICS 1000;
ALTER TABLE enrollments ALTER COLUMN class_id SET STATISTICS 1000;

-- Create materialized view for attendance summary (optional, commented out for now)
-- This can be enabled later if needed for heavy reporting
/*
CREATE MATERIALIZED VIEW attendance_summary AS
SELECT 
    c.id as class_id,
    c.class_name,
    c.section,
    date_trunc('day', a.session_date::date) as session_date,
    COUNT(*) as total_enrolled,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
    ROUND(
        (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as attendance_percentage
FROM classes c
LEFT JOIN enrollments e ON c.id = e.class_id
LEFT JOIN attendance a ON e.student_id = a.student_id AND c.id = a.class_id
GROUP BY c.id, c.class_name, c.section, date_trunc('day', a.session_date::date);

CREATE UNIQUE INDEX ON attendance_summary (class_id, session_date);
CREATE INDEX ON attendance_summary (class_id);
CREATE INDEX ON attendance_summary (session_date DESC);

-- Set up automatic refresh (requires extension)
-- SELECT cron.schedule('refresh-attendance-summary', '0 */6 * * *', 'REFRESH MATERIALIZED VIEW attendance_summary;');
*/

-- Add comments for documentation
COMMENT ON INDEX idx_attendance_class_date IS 'Optimizes attendance queries by class and date';
COMMENT ON INDEX idx_attendance_student_class IS 'Optimizes student attendance history queries';
COMMENT ON INDEX idx_attendance_timestamp_desc IS 'Optimizes recent attendance queries';
COMMENT ON INDEX idx_attendance_status_date IS 'Optimizes present attendance count queries';
COMMENT ON INDEX idx_enrollments_class_student IS 'Optimizes enrollment verification queries';
COMMENT ON INDEX idx_classes_faculty_created IS 'Optimizes faculty class listing queries';
COMMENT ON INDEX idx_classes_active_qr IS 'Optimizes active QR token validation queries';