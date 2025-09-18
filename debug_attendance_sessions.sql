-- Debug query to check attendance records and see if students are being grouped properly

-- 1. Check recent attendance records to see session grouping
SELECT 
    class_id,
    session_date,
    timestamp,
    student_id,
    status,
    EXTRACT(EPOCH FROM timestamp) as timestamp_epoch,
    TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted_timestamp
FROM attendance 
WHERE session_date = CURRENT_DATE
ORDER BY class_id, timestamp DESC
LIMIT 20;

-- 2. Group by session timestamp to see how students are grouped
SELECT 
    class_id,
    timestamp,
    COUNT(*) as student_count,
    STRING_AGG(student_id::text, ', ') as student_ids,
    TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted_timestamp
FROM attendance 
WHERE session_date = CURRENT_DATE
GROUP BY class_id, timestamp
ORDER BY class_id, timestamp DESC;

-- 3. Check classes table for current QR tokens
SELECT 
    id as class_id,
    class_name,
    qr_token,
    qr_expiration,
    CASE 
        WHEN qr_token LIKE '%FACE_VERIFICATION%' THEN 'Face Verification'
        ELSE 'Regular QR'
    END as token_type
FROM classes 
WHERE qr_token IS NOT NULL 
ORDER BY qr_expiration DESC;