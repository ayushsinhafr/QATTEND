# Database Migration Verification Script

Copy and paste this SQL script into your Supabase SQL Editor to verify all changes were applied correctly:

```sql
-- ============================================================================
-- AttendEase Database Migration Verification Script
-- Run this to confirm all fixes were applied successfully
-- ============================================================================

-- Check 1: Verify the new attendance constraint exists
SELECT 
    'CONSTRAINT CHECK' as check_type,
    conname as constraint_name,
    CASE 
        WHEN conname = 'attendance_unique_session' THEN '✅ NEW CONSTRAINT EXISTS'
        ELSE '❌ OLD CONSTRAINT STILL EXISTS'
    END as status
FROM pg_constraint 
WHERE conrelid = 'public.attendance'::regclass 
AND contype = 'u'  -- unique constraints
ORDER BY conname;

-- Check 2: Verify updated_at column was added
SELECT 
    'COLUMN CHECK' as check_type,
    'updated_at' as column_name,
    CASE 
        WHEN column_name = 'updated_at' THEN '✅ UPDATED_AT COLUMN EXISTS'
        ELSE '❌ UPDATED_AT COLUMN MISSING'
    END as status,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND column_name = 'updated_at'
UNION ALL
SELECT 
    'COLUMN CHECK' as check_type,
    'updated_at' as column_name,
    '❌ UPDATED_AT COLUMN NOT FOUND' as status,
    null as data_type,
    null as is_nullable,
    null as column_default
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'updated_at'
);

-- Check 3: Verify performance indexes were created
SELECT 
    'INDEX CHECK' as check_type,
    indexname,
    tablename,
    '✅ INDEX EXISTS' as status
FROM pg_indexes 
WHERE tablename IN ('attendance', 'enrollments', 'classes', 'profiles') 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check 4: Count total indexes created
SELECT 
    'INDEX SUMMARY' as check_type,
    tablename,
    COUNT(*) as index_count,
    CASE 
        WHEN tablename = 'attendance' AND COUNT(*) >= 7 THEN '✅ SUFFICIENT INDEXES'
        WHEN tablename = 'enrollments' AND COUNT(*) >= 4 THEN '✅ SUFFICIENT INDEXES'
        WHEN tablename = 'classes' AND COUNT(*) >= 3 THEN '✅ SUFFICIENT INDEXES'
        WHEN tablename = 'profiles' AND COUNT(*) >= 2 THEN '✅ SUFFICIENT INDEXES'
        ELSE '⚠️ SOME INDEXES MAY BE MISSING'
    END as status
FROM pg_indexes 
WHERE tablename IN ('attendance', 'enrollments', 'classes', 'profiles') 
AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;

-- Check 5: Verify trigger function exists
SELECT 
    'TRIGGER CHECK' as check_type,
    routine_name as function_name,
    '✅ TRIGGER FUNCTION EXISTS' as status
FROM information_schema.routines
WHERE routine_name = 'update_attendance_updated_at'
AND routine_type = 'FUNCTION'
UNION ALL
SELECT 
    'TRIGGER CHECK' as check_type,
    'update_attendance_updated_at' as function_name,
    '❌ TRIGGER FUNCTION NOT FOUND' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'update_attendance_updated_at'
    AND routine_type = 'FUNCTION'
);

-- Check 6: Verify trigger exists on attendance table
SELECT 
    'TRIGGER CHECK' as check_type,
    trigger_name,
    event_manipulation,
    '✅ TRIGGER EXISTS' as status
FROM information_schema.triggers
WHERE event_object_table = 'attendance'
AND trigger_name = 'update_attendance_updated_at_trigger'
UNION ALL
SELECT 
    'TRIGGER CHECK' as check_type,
    'update_attendance_updated_at_trigger' as trigger_name,
    null as event_manipulation,
    '❌ TRIGGER NOT FOUND' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'attendance'
    AND trigger_name = 'update_attendance_updated_at_trigger'
);

-- Check 7: Test the constraint - verify multiple sessions are allowed
-- This will show if we can have multiple attendance records for same student/class/date
SELECT 
    'CONSTRAINT TEST' as check_type,
    'Multiple Sessions Test' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ MULTIPLE SESSIONS ALLOWED'
        ELSE '⚠️ NO TEST DATA FOUND'
    END as status,
    COUNT(*) as sample_count
FROM (
    SELECT 
        student_id, 
        class_id, 
        session_date,
        COUNT(*) as session_count
    FROM public.attendance 
    GROUP BY student_id, class_id, session_date
    HAVING COUNT(*) > 1
    LIMIT 5
) multiple_sessions;

-- Check 8: Verify table statistics were updated
SELECT 
    'STATISTICS CHECK' as check_type,
    ps.tablename,
    ps.attname as column_name,
    ps.n_distinct,
    CASE 
        WHEN pa.attstattarget = 1000 THEN '✅ STATISTICS OPTIMIZED'
        ELSE '⚠️ DEFAULT STATISTICS'
    END as status
FROM pg_stats ps
JOIN pg_attribute pa ON pa.attname = ps.attname 
JOIN pg_class pc ON pc.oid = pa.attrelid AND pc.relname = ps.tablename
WHERE ps.tablename IN ('attendance', 'classes', 'enrollments')
AND ps.attname IN ('class_id', 'session_date', 'status', 'faculty_id')
ORDER BY ps.tablename, ps.attname;

-- Check 9: Overall migration status summary
SELECT 
    '🎯 MIGRATION SUMMARY' as check_type,
    'Database Migration Status' as description,
    CASE 
        WHEN (
            -- Check if new constraint exists
            EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.attendance'::regclass AND conname = 'attendance_unique_session')
            -- Check if updated_at column exists  
            AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'updated_at')
            -- Check if sufficient indexes exist
            AND (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'attendance' AND indexname LIKE 'idx_%') >= 6
            -- Check if trigger function exists
            AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_attendance_updated_at')
        ) THEN '🎉 ALL MIGRATIONS SUCCESSFUL!'
        ELSE '❌ SOME MIGRATIONS INCOMPLETE'
    END as final_status;

-- Check 10: Sample data structure verification
SELECT 
    'DATA STRUCTURE' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance'
ORDER BY ordinal_position;
```

## What to Look For:

After running this script, you should see:

1. **✅ NEW CONSTRAINT EXISTS** - The attendance_unique_session constraint
2. **✅ UPDATED_AT COLUMN EXISTS** - New column for tracking updates
3. **Multiple ✅ INDEX EXISTS** entries - At least 15+ indexes created
4. **✅ SUFFICIENT INDEXES** for all tables
5. **✅ TRIGGER FUNCTION EXISTS** and **✅ TRIGGER EXISTS**
6. **✅ STATISTICS OPTIMIZED** for key columns
7. **🎉 ALL MIGRATIONS SUCCESSFUL!** in the final summary

Please run this verification script and paste the complete output here so I can confirm everything was applied correctly!