import { supabase } from '@/integrations/supabase/client';
import { logger, logAttendance, logError, logPerformance } from './logger';

export interface AttendanceSession {
  sessionId: string;
  sessionTimestamp: string;
  sessionType: 'qr' | 'manual' | 'hybrid';
  classId: string;
  isActive: boolean;
}

/**
 * Session Manager for consistent timestamp handling across all attendance methods
 */
export class AttendanceSessionManager {
  private static activeSessions = new Map<string, AttendanceSession>();

  /**
   * Create a new attendance session with unified timestamp
   */
  static createSession(classId: string, sessionType: 'qr' | 'manual' | 'hybrid'): AttendanceSession {
    const sessionTimestamp = new Date().toISOString();
    const sessionId = `${sessionType}_${classId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: AttendanceSession = {
      sessionId,
      sessionTimestamp,
      sessionType,
      classId,
      isActive: true
    };

    this.activeSessions.set(sessionId, session);
    
    logger.info('session', `New ${sessionType} session created`, {
      sessionId,
      sessionType,
      classId,
      timestamp: sessionTimestamp
    });

    return session;
  }

  /**
   * Get active session for a class
   */
  static getActiveSession(classId: string, sessionType?: 'qr' | 'manual' | 'hybrid'): AttendanceSession | null {
    for (const [id, session] of this.activeSessions) {
      if (session.classId === classId && session.isActive) {
        if (!sessionType || session.sessionType === sessionType) {
          return session;
        }
      }
    }
    return null;
  }

  /**
   * End a session
   */
  static endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      
      logger.info('session', `Session ended`, {
        sessionId,
        sessionType: session.sessionType,
        classId: session.classId,
        duration: Date.now() - new Date(session.sessionTimestamp).getTime()
      });
    } else {
      logger.warn('session', `Attempted to end non-existent session`, { sessionId });
    }
  }

  /**
   * Generate secure QR token with session context
   */
  static generateSecureQRToken(session: AttendanceSession): string {
    // Use crypto API for secure token generation
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
    
    // Include session info in token format that can be decoded
    // Format: secure_[classId]_[sessionId]_[randomString]_[timestamp]
    const sessionTimestamp = new Date(session.sessionTimestamp).getTime();
    return `secure_${session.classId}_${session.sessionId}_${randomString}_${sessionTimestamp}`;
  }

  /**
   * Decode session information from secure QR token
   */
  static decodeQRToken(token: string): {
    classId: string;
    sessionId: string;
    sessionTimestamp: string;
    isValid: boolean;
  } | null {
    try {
      if (!token.startsWith('secure_')) {
        // Handle legacy format: classId:timestamp
        if (token.includes(':')) {
          const parts = token.split(':');
          const classId = parts[0];
          const timestamp = parseInt(parts[1]);
          return {
            classId,
            sessionId: `legacy_${classId}_${timestamp}`,
            sessionTimestamp: new Date(timestamp).toISOString(),
            isValid: true
          };
        }
        return null;
      }

      // Parse secure format: secure_classId_sessionId_randomString_timestamp
      const parts = token.replace('secure_', '').split('_');
      if (parts.length >= 4) {
        const classId = parts[0];
        const sessionId = parts[1];
        const timestamp = parseInt(parts[parts.length - 1]);
        
        return {
          classId,
          sessionId,
          sessionTimestamp: new Date(timestamp).toISOString(),
          isValid: true
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error decoding QR token:', error);
      return null;
    }
  }

  /**
   * Create attendance record with consistent session timestamp
   */
  static createAttendanceRecord(
    studentId: string,
    session: AttendanceSession,
    status: 'present' | 'absent'
  ) {
    const attendanceRecord = {
      student_id: studentId,
      class_id: session.classId,
      status: status,
      session_date: session.sessionTimestamp.split('T')[0],
      timestamp: session.sessionTimestamp, // Consistent timestamp for all records in session
    };

    console.log('💾 [SessionManager] Creating attendance record:', {
      sessionId: session.sessionId,
      studentId,
      status,
      timestamp: session.sessionTimestamp
    });

    return attendanceRecord;
  }

  /**
   * Batch create multiple attendance records with consistent timestamp
   */
  static async createBatchAttendanceRecords(
    studentStatusPairs: { studentId: string; status: 'present' | 'absent' }[],
    session: AttendanceSession
  ) {
    const records = studentStatusPairs.map(({ studentId, status }) =>
      this.createAttendanceRecord(studentId, session, status)
    );

    console.log('📦 [SessionManager] Creating batch attendance records:', {
      sessionId: session.sessionId,
      count: records.length,
      timestamp: session.sessionTimestamp
    });

    // Use single batch insert for better performance
    const { data, error } = await supabase
      .from('attendance')
      .insert(records)
      .select();

    if (error) {
      console.error('❌ [SessionManager] Batch insert failed:', error);
      
      // Fallback to individual inserts with conflict handling
      const results = [];
      for (const record of records) {
        try {
          const { data: recordData, error: recordError } = await supabase
            .from('attendance')
            .insert(record)
            .select()
            .single();

          if (recordError) {
            // Handle unique constraint violation
            if (recordError.code === '23505') {
              const { data: updateData, error: updateError } = await supabase
                .from('attendance')
                .update({
                  status: record.status,
                  timestamp: record.timestamp,
                })
                .eq('student_id', record.student_id)
                .eq('class_id', record.class_id)
                .eq('session_date', record.session_date)
                .select()
                .single();

              if (updateError) {
                console.error('❌ [SessionManager] Update failed:', updateError);
              } else {
                results.push(updateData);
                console.log('🔄 [SessionManager] Updated existing record:', record.student_id);
              }
            }
          } else {
            results.push(recordData);
            console.log('✅ [SessionManager] Inserted new record:', record.student_id);
          }
        } catch (individualError) {
          console.error('❌ [SessionManager] Individual record failed:', individualError);
        }
      }
      return { data: results, error: null };
    }

    console.log('✅ [SessionManager] Batch insert successful:', data?.length);
    return { data, error: null };
  }

  /**
   * End all active sessions (cleanup utility)
   */
  static endAllSessions(): void {
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(sessionId => this.endSession(sessionId));
    
    logger.info('session', `Ended all active sessions`, {
      sessionCount: sessionIds.length,
      sessionIds
    });
  }

  /**
   * Clean up expired sessions (older than 1 hour)
   */
  static cleanupExpiredSessions(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [sessionId, session] of this.activeSessions) {
      const sessionTime = new Date(session.sessionTimestamp).getTime();
      if (sessionTime < oneHourAgo) {
        this.activeSessions.delete(sessionId);
        console.log('🧹 [SessionManager] Cleaned up expired session:', sessionId);
      }
    }
  }
}

// Auto cleanup every 30 minutes
let cleanupInterval: NodeJS.Timeout | null = null;

if (typeof window !== 'undefined') {
  cleanupInterval = setInterval(() => {
    AttendanceSessionManager.cleanupExpiredSessions();
  }, 30 * 60 * 1000);
}

// Cleanup interval when module is unloaded
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });
}