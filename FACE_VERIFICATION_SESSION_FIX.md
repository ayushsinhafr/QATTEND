# Face Verification Session Grouping Fix

## Problem
Face verification was creating separate sessions for each student instead of grouping all students in the same session like regular QR attendance.

## Root Cause
The face verification Edge Function was using `gte('timestamp', sessionTimestamp)` for checking existing attendance, which allowed multiple students to have different timestamps for the same session. This differed from regular QR system behavior.

## Solution Applied
1. **Consistent Token Parsing**: Both regular QR and face verification now use the same session timestamp extracted from the token format `classId:timestamp` or `classId:timestamp:FACE_VERIFICATION`

2. **Exact Timestamp Matching**: Changed the attendance lookup query in the Edge Function from:
   ```typescript
   .gte('timestamp', sessionTimestamp)  // Old - allowed different timestamps
   ```
   to:
   ```typescript
   .eq('timestamp', sessionTimestamp)   // New - requires exact timestamp match
   ```

3. **Session Consistency**: Now all students scanning the same QR (regular or face verification) will share the exact same session timestamp, ensuring they appear in one session group.

## Files Modified
- `supabase/functions/verify-face-attendance/index.ts`: Updated attendance checking logic

## Expected Behavior After Fix
- ✅ Regular QR: Students grouped in single session with shared timestamp
- ✅ Face Verification QR: Students grouped in single session with shared timestamp  
- ✅ Both systems now behave consistently for session management

## Test Results
The Edge Function has been successfully deployed. When faculty generates a face verification QR and multiple students scan it, all attendance records should now have the same `timestamp` value and appear as one session in the attendance dashboard.