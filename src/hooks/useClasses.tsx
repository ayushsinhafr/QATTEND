import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Class {
  id: string;
  class_name: string;
  section: string;
  class_code: string;
  faculty_id: string;
  student_strength: number;
  qr_token: string | null;
  qr_expiration: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  enrolled_at: string;
  classes: Class;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  timestamp: string;
  status: 'present' | 'absent';
  session_date: string;
  profiles?: {
    name: string;
    unique_id: string;
  };
}

export const useClasses = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  // Fetch faculty's classes
  const fetchFacultyClasses = useCallback(async () => {
    if (!user || profile?.role !== 'faculty' || isLoadingRef) return;
    
    setIsLoadingRef(true);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('faculty_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error fetching classes",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsLoadingRef(false);
    }
  }, [user, profile?.role]);

  // Fetch student's enrolled classes
  const fetchStudentClasses = useCallback(async () => {
    if (!user || profile?.role !== 'student' || isLoadingRef) return;
    
    setIsLoadingRef(true);
    setLoading(true);
    try {
      // First get enrollments, then fetch class details separately to avoid relation issues
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id);

      if (enrollmentError) throw enrollmentError;

      if (enrollmentData && enrollmentData.length > 0) {
        // Get class IDs and fetch class details
        const classIds = enrollmentData.map(e => e.class_id);
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds);

        if (classError) throw classError;

        // Combine enrollment and class data
        const enrichedEnrollments = enrollmentData.map(enrollment => ({
          ...enrollment,
          classes: classData?.find(cls => cls.id === enrollment.class_id) || {} as Class
        }));

        setEnrollments(enrichedEnrollments as Enrollment[]);
      } else {
        setEnrollments([]);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error fetching enrolled classes",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsLoadingRef(false);
    }
  }, [user, profile?.role]);

  // Create a new class
  const createClass = async (className: string, section: string, studentStrength: number) => {
    if (!user || profile?.role !== 'faculty') return null;

    try {
      // Generate class code using the database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_class_code', {
          class_name: className,
          section: section
        });

      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from('classes')
        .insert({
          class_name: className,
          section: section,
          class_code: codeData,
          faculty_id: user.id,
          student_strength: studentStrength,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Class created successfully!",
        description: `Class code: ${data.class_code} - Share this code with students to join your class.`,
      });

      await fetchFacultyClasses();
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error creating class",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  };

  // Join a class (for students)
  const joinClass = async (classCode: string) => {
    if (!user || profile?.role !== 'student') return false;

    try {
      console.log('🎯 [joinClass] Starting with code:', classCode);
      console.log('🎯 [joinClass] User ID:', user.id);
      
      // First, find the class by code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('class_code', classCode)
        .maybeSingle();

      console.log('🏫 [joinClass] Class lookup result:', { classData, classError });

      if (classError) {
        console.error('❌ [joinClass] Database error:', classError);
        toast({
          title: "Database error",
          description: "There was an error checking the class. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (!classData) {
        console.log('❌ [joinClass] Class not found with code:', classCode);
        toast({
          title: "Class not found",
          description: "Invalid class code. Please check and try again.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [joinClass] Class found:', classData.id);

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('class_id', classData.id)
        .maybeSingle();

      console.log('🔍 [joinClass] Existing enrollment check:', existingEnrollment);

      if (existingEnrollment) {
        console.log('⚠️ [joinClass] Already enrolled');
        toast({
          title: "Already enrolled",
          description: "You are already enrolled in this class.",
          variant: "destructive",
        });
        return false;
      }

      console.log('📝 [joinClass] Creating enrollment...');

      // Enroll in the class
      const enrollmentData = {
        student_id: user.id,
        class_id: classData.id,
      };

      console.log('📝 [joinClass] Enrollment data:', enrollmentData);

      const { error } = await supabase
        .from('enrollments')
        .insert(enrollmentData);

      if (error) {
        console.error('❌ [joinClass] Enrollment error:', error);
        throw error;
      }

      console.log('✅ [joinClass] Successfully enrolled!');

      toast({
        title: "Successfully joined class!",
        description: "You have been enrolled in the class.",
      });

      await fetchStudentClasses();
      return true;
    } catch (error: unknown) {
      console.error('💥 [joinClass] Fatal error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error joining class",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  // Generate QR token for attendance
  const generateQRToken = useCallback(async (classId: string): Promise<string | null> => {
    try {
      console.log('Generating QR token for class:', classId);
      const token = `${classId}:${Date.now()}`;
      const expiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const { error } = await supabase
        .from('classes')
        .update({
          qr_token: token,
          qr_expiration: expiration.toISOString()
        })
        .eq('id', classId);

      if (error) throw error;

      console.log('QR token generated successfully:', token);
      
      // Set timer to auto-mark absent students when QR expires
      setTimeout(async () => {
        try {
          await markAbsentStudents(classId);
          console.log('Auto-marked absent students for class:', classId);
        } catch (error) {
          console.error('Error auto-marking absent students:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      return token;
    } catch (error) {
      console.error('Error generating QR token:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Get live attendance data for a class session
  const getLiveAttendance = useCallback(async (classId: string, sessionDate?: string) => {
    try {
      // Format date as DD-MM-YYYY to match database
      const today = new Date();
      const formattedDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getFullYear()}`;
      const dateFilter = sessionDate || formattedDate;
      
      // Get class information including student_strength
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('student_strength')
        .eq('id', classId)
        .maybeSingle();

      if (classError) throw classError;
      if (!classData) {
        throw new Error('Class not found');
      }
      
      // Get attendance records for today
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('session_date', dateFilter)
        .order('timestamp', { ascending: false });

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        throw attendanceError;
      }

      console.log('Raw attendance data:', attendanceData);

      // Get student details for attendance records
      const studentIds = attendanceData?.map(a => a.student_id) || [];
      const { data: attendanceStudents, error: studentsError } = studentIds.length > 0 ? 
        await supabase
          .from('profiles')
          .select('user_id, name, unique_id')
          .in('user_id', studentIds) : 
        { data: [], error: null };

      if (studentsError) {
        console.error('Error fetching student details:', studentsError);
      }

      // Create a map of student details
      const studentMap = new Map(attendanceStudents?.map(s => [s.user_id, s] as const) || []);

      // Enhance attendance data with student details
      const enhancedAttendanceData = attendanceData?.map(a => ({
        ...a,
        profiles: studentMap.get(a.student_id) || { name: 'Unknown', unique_id: 'N/A' }
      })) || [];

      // Get all enrolled students
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('class_id', classId);

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError);
        throw enrollmentError;
      }

      console.log('Raw enrollment data:', enrollmentData);

      // Get student details for enrolled students
      const enrolledStudentIds = enrollmentData?.map(e => e.student_id) || [];
      const { data: enrolledStudents, error: enrolledStudentsError } = enrolledStudentIds.length > 0 ? 
        await supabase
          .from('profiles')
          .select('user_id, name, unique_id')
          .in('user_id', enrolledStudentIds) : 
        { data: [], error: null };

      if (enrolledStudentsError) {
        console.error('Error fetching enrolled student details:', enrolledStudentsError);
      }

      // Create a map of enrolled student details
      const enrolledStudentMap = new Map(enrolledStudents?.map(s => [s.user_id, s] as const) || []);

      // Enhance enrollment data with student details
      const enhancedEnrollmentData = enrollmentData?.map(e => ({
        ...e,
        profiles: enrolledStudentMap.get(e.student_id) || { name: 'Unknown', unique_id: 'N/A' }
      })) || [];

      // Use class strength as total capacity, actual enrollments for calculations
      const totalClassStrength = classData?.student_strength || 0;
      const actualEnrolled = enhancedEnrollmentData?.length || 0;

      // Create attendance summary using enhanced data
      const presentStudents = enhancedAttendanceData?.filter(a => a.status === 'present') || [];
      const absentStudents = enhancedAttendanceData?.filter(a => a.status === 'absent') || [];
      const attendedStudentIds = new Set(enhancedAttendanceData?.map(a => a.student_id) || []);
      
      // Find students who haven't marked attendance yet (only from enrolled students)
      const notMarkedStudents = enhancedEnrollmentData?.filter(e => 
        !attendedStudentIds.has(e.student_id)
      ) || [];

      console.log('Processed attendance data:', {
        presentStudents: presentStudents.length,
        absentStudents: absentStudents.length,
        notMarkedStudents: notMarkedStudents.length,
        totalEnrolled: actualEnrolled,
        totalClassStrength: totalClassStrength
      });

      return {
        presentStudents,
        absentStudents,
        notMarkedStudents,
        totalEnrolled: actualEnrolled, // Actual enrolled students
        totalClassStrength: totalClassStrength, // Expected class strength
        sessionDate: dateFilter
      };
    } catch (error) {
      console.error('Error fetching live attendance:', error);
      return {
        presentStudents: [],
        absentStudents: [],
        notMarkedStudents: [],
        totalEnrolled: 0,
        totalClassStrength: 0,
        sessionDate: sessionDate || new Date().toISOString().split('T')[0]
      };
    }
  }, []);

  // Function to mark absent students who didn't mark attendance
  const markAbsentStudents = useCallback(async (classId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classId);

      if (enrollError) throw enrollError;

      // Get students who already marked attendance today
      const { data: presentStudents, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id')
        .eq('class_id', classId)
        .eq('session_date', today);

      if (attendanceError) throw attendanceError;

      const presentStudentIds = new Set(presentStudents?.map(s => s.student_id) || []);
      
      // Find students who need to be marked absent
      const absentStudents = enrollments?.filter(e => !presentStudentIds.has(e.student_id)) || [];

      // Mark absent students
      if (absentStudents.length > 0) {
        const absentRecords = absentStudents.map(student => ({
          student_id: student.student_id,
          class_id: classId,
          status: 'absent',
          session_date: today,
          timestamp: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('attendance')
          .insert(absentRecords);

        if (insertError) throw insertError;
        
        console.log(`Marked ${absentStudents.length} students as absent`);
        return absentStudents.length;
      }
      return 0;
    } catch (error) {
      console.error('Error marking absent students:', error);
      return 0;
    }
  }, []);

  // Mark attendance using QR token
  const markAttendance = async (token: string) => {
    if (!user || profile?.role !== 'student') return false;

    try {
      console.log('🎯 [markAttendance] Starting attendance marking with token:', token);
      
      // Get the current session to ensure we have a valid auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('❌ [markAttendance] No session found');
        toast({
          title: "Authentication required",
          description: "Please log in again to mark attendance.",
          variant: "destructive",
        });
        return false;
      }
      
      console.log('✅ [markAttendance] Session found, user ID:', user.id);
      
      // Skip Edge Function and go directly to implementation
      console.log('⚡ [markAttendance] Using direct implementation (Edge Function bypassed)');
      return await markAttendanceDirect(token);

    } catch (error) {
      console.error('💥 [markAttendance] Fatal error:', error);
      toast({
        title: "Error marking attendance",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Direct implementation as fallback
  const markAttendanceDirect = async (token: string): Promise<boolean> => {
    try {
      console.log('🔧 [markAttendanceDirect] Starting with token:', token);
      
      // Find the class with this token and check if it's still valid
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, qr_expiration')
        .eq('qr_token', token)
        .maybeSingle();

      console.log('🏫 [markAttendanceDirect] Class lookup result:', { classData, classError });

      if (classError) {
        console.log('❌ [markAttendanceDirect] Database error:', classError);
        return false;
      }

      if (!classData) {
        console.log('❌ [markAttendanceDirect] Invalid token or class not found');
        toast({
          title: "Invalid QR Code",
          description: "Invalid QR code. Make sure you're scanning the correct code.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [markAttendanceDirect] Class found:', classData.id);

      // Check if token is still valid
      const now = new Date();
      const expiration = new Date(classData.qr_expiration || 0);
      
      console.log('⏰ [markAttendanceDirect] Time check:', { now: now.toISOString(), expiration: expiration.toISOString() });
      
      if (now > expiration) {
        console.log('❌ [markAttendanceDirect] Token expired');
        toast({
          title: "QR Code Expired",
          description: "QR code has expired. Ask teacher to generate a new one.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [markAttendanceDirect] Token is valid');

      // Check if student is enrolled in this class
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user!.id)
        .eq('class_id', classData.id)
        .maybeSingle();

      console.log('👥 [markAttendanceDirect] Enrollment check:', { enrollmentData, enrollmentError });

      if (enrollmentError || !enrollmentData) {
        console.log('❌ [markAttendanceDirect] Student not enrolled in class');
        toast({
          title: "Not Enrolled",
          description: "You are not enrolled in this class. Please join the class first.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [markAttendanceDirect] Student is enrolled');

      // Check if attendance was already marked today  
      const sessionDate = new Date().toISOString().split('T')[0];
      console.log('📅 [markAttendanceDirect] Checking attendance for date:', sessionDate);
      
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', user!.id)
        .eq('class_id', classData.id)
        .eq('session_date', sessionDate)
        .maybeSingle();

      console.log('🔍 [markAttendanceDirect] Existing attendance check:', existingAttendance);

      if (existingAttendance) {
        console.log('⚠️ [markAttendanceDirect] Attendance already marked for today');
        toast({
          title: "Attendance already marked!",
          description: "Your attendance for today has already been recorded.",
        });
        
        // Refresh enrollments to update attendance status
        if (profile?.role === 'student') {
          fetchStudentClasses();
        }
        
        return true;
      }

      // Mark attendance (insert new record)
      const attendanceRecord = {
        student_id: user!.id,
        class_id: classData.id,
        status: 'present',
        session_date: sessionDate,
        timestamp: new Date().toISOString(),
      };

      console.log('💾 [markAttendanceDirect] Inserting attendance record:', attendanceRecord);

        // Use upsert to avoid duplicate key error
        const { error: attendanceError } = await supabase
    .from('attendance')
    .upsert(attendanceRecord, { onConflict: 'student_id,class_id,session_date' });

      if (attendanceError) {
        console.log('❌ [markAttendanceDirect] Error marking attendance:', {
          message: attendanceError.message,
          details: attendanceError.details,
          hint: attendanceError.hint,
          code: attendanceError.code,
          fullError: attendanceError
        });
        
        toast({
          title: "Database Error",
          description: `Failed to mark attendance: ${attendanceError.message}`,
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [markAttendanceDirect] Attendance marked successfully!', {
        userId: user!.id,
        classId: classData.id,
        sessionDate: sessionDate
      });
      toast({
        title: "Attendance marked!",
        description: "Your attendance has been recorded successfully.",
      });
      
      // Refresh enrollments to update attendance status
      if (profile?.role === 'student') {
        fetchStudentClasses();
      }
      // Notify teacher dashboard to refresh attendance (if callback is set)
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('attendanceMarked', {
          detail: {
            classId: classData.id,
            studentId: user!.id,
            sessionDate: sessionDate
          }
        }));
      }
      
      return true;

    } catch (error) {
      console.error('Direct attendance marking error:', error);
      toast({
        title: "Error marking attendance",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Fetch attendance for a class (for faculty)
  const fetchClassAttendance = async (classId: string): Promise<AttendanceRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles!attendance_student_id_fkey (
            name,
            unique_id
          )
        `)
        .eq('class_id', classId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data as AttendanceRecord[] || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error fetching attendance",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    }
  };

  // Delete a class and all related data
  const deleteClass = useCallback(async (classId: string) => {
    if (!user || profile?.role !== 'faculty') return false;

    try {
      // Delete in the correct order due to foreign key constraints
      // 1. Delete attendance records first
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .eq('class_id', classId);

      if (attendanceError) {
        console.error('Error deleting attendance records:', attendanceError);
        throw attendanceError;
      }

      // 2. Delete enrollments
      const { error: enrollmentsError } = await supabase
        .from('enrollments')
        .delete()
        .eq('class_id', classId);

      if (enrollmentsError) {
        console.error('Error deleting enrollments:', enrollmentsError);
        throw enrollmentsError;
      }

      // 3. Finally delete the class
      const { error: classError } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)
        .eq('faculty_id', user.id); // Additional security check

      if (classError) {
        console.error('Error deleting class:', classError);
        throw classError;
      }

      toast({
        title: "Class deleted successfully!",
        description: "The class and all related data have been removed.",
      });

      // Refresh the classes list
      await fetchFacultyClasses();
      return true;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error deleting class",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [user, profile?.role, toast, fetchFacultyClasses]);

  // Get attendance sessions (dates when QR was generated)
  // Debug function to check database contents
  const debugDatabaseContents = useCallback(async (classId: string) => {
    try {
      console.log('🔍 [DEBUG] Checking database contents for class:', classId);
      console.log('🔍 [DEBUG] Current user:', user?.id);
      console.log('🔍 [DEBUG] Current profile:', profile);
      
      // Check enrollments with more details
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          *,
          profiles:student_id (
            user_id,
            name,
            unique_id,
            role
          )
        `)
        .eq('class_id', classId);
      
      console.log('👥 [DEBUG] Enrollments query details:', { enrollments, enrollError });
      
      // Check attendance records with more details
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles:student_id (
            user_id,
            name,
            unique_id
          )
        `)
        .eq('class_id', classId);
      
      console.log('📊 [DEBUG] Attendance query details:', { attendance, attendanceError });
      
      // Check all enrollments (not filtered by class)
      const { data: allEnrollments, error: allEnrollError } = await supabase
        .from('enrollments')
        .select('*')
        .limit(10);
        
      console.log('👥 [DEBUG] All enrollments (sample):', { allEnrollments, allEnrollError });
      
      // Check all attendance records (not filtered by class)
      const { data: allAttendance, error: allAttendanceError } = await supabase
        .from('attendance')
        .select('*')
        .limit(10);
        
      console.log('📊 [DEBUG] All attendance records (sample):', { allAttendance, allAttendanceError });
      
      // Check classes
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*');
      
      console.log('🏫 [DEBUG] All classes:', { classes, classError });
      
      // Check current user's session and permissions
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 [DEBUG] Current session:', { 
        user: session?.user?.id, 
        role: session?.user?.user_metadata?.role,
        sessionError 
      });
      
      return { enrollments, attendance, classes };
    } catch (error) {
      console.error('❌ [DEBUG] Error checking database:', error);
      return null;
    }
  }, [user, profile]);

  const getAttendanceSessions = useCallback(async (classId: string) => {
    try {
      console.log('🔍 [getAttendanceSessions] Starting fetch for class:', classId);
      
      // Get unique session dates from attendance table
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('session_date, timestamp')
        .eq('class_id', classId)
        .order('session_date', { ascending: false });

      console.log('📊 [getAttendanceSessions] Raw query result:', { attendanceData, error });

      if (error) {
        console.error('❌ [getAttendanceSessions] Error fetching attendance data:', error);
        throw error;
      }

      if (!attendanceData || attendanceData.length === 0) {
        console.log('⚠️ [getAttendanceSessions] No attendance data found for class:', classId);
        return [];
      }

      console.log('✅ [getAttendanceSessions] Found attendance records:', attendanceData.length);

      // Get unique session dates
      const uniqueDates = [...new Set(attendanceData.map(record => record.session_date))];
      console.log('📅 [getAttendanceSessions] Unique session dates:', uniqueDates);
      
      // For each unique date, get the count of present students
      const sessionsWithCounts = await Promise.all(
        uniqueDates.map(async (date) => {
          console.log(`🔄 [getAttendanceSessions] Processing date: ${date}`);
          
          const { data: sessionAttendance, error: sessionError } = await supabase
            .from('attendance')
            .select('*')
            .eq('class_id', classId)
            .eq('session_date', date)
            .eq('status', 'present');

          console.log(`📈 [getAttendanceSessions] Present students for ${date}:`, { 
            count: sessionAttendance?.length || 0, 
            data: sessionAttendance,
            error: sessionError 
          });

          if (sessionError) {
            console.error('❌ [getAttendanceSessions] Error fetching session attendance:', sessionError);
            return {
              id: `${classId}-${date}`,
              date,
              qr_generated_at: attendanceData.find(a => a.session_date === date)?.timestamp || new Date().toISOString(),
              present_count: 0
            };
          }

          const sessionData = {
            id: `${classId}-${date}`,
            date,
            qr_generated_at: attendanceData.find(a => a.session_date === date)?.timestamp || new Date().toISOString(),
            present_count: sessionAttendance?.length || 0
          };

          console.log(`✅ [getAttendanceSessions] Session data for ${date}:`, sessionData);
          return sessionData;
        })
      );

      console.log('🎯 [getAttendanceSessions] Final sessions with counts:', sessionsWithCounts);
      return sessionsWithCounts;

    } catch (error) {
      console.error('💥 [getAttendanceSessions] Fatal error:', error);
      return [];
    }
  }, []);

  // Get attendance details for a specific session
  const getSessionAttendance = useCallback(async (classId: string, sessionDate: string) => {
    try {
      console.log('🔍 [getSessionAttendance] Starting fetch for:', { classId, sessionDate });

      // Get all enrollments for this class to include absent students
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          profiles:student_id (
            user_id,
            name,
            unique_id
          )
        `)
        .eq('class_id', classId);

      console.log('👥 [getSessionAttendance] Enrollments query:', { enrollments, enrollError });

      if (enrollError) {
        console.error('❌ [getSessionAttendance] Error fetching enrollments:', enrollError);
        throw enrollError;
      }

      // Get attendance records for this session
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('session_date', sessionDate);

      console.log('📊 [getSessionAttendance] Attendance query:', { attendanceData, attendanceError });

      if (attendanceError) {
        console.error('❌ [getSessionAttendance] Error fetching attendance:', attendanceError);
        throw attendanceError;
      }

      console.log('✅ [getSessionAttendance] Found enrollments:', enrollments?.length || 0);
      console.log('✅ [getSessionAttendance] Found attendance records:', attendanceData?.length || 0);

      // Create attendance map
      const attendanceMap = new Map(
        attendanceData?.map(a => [a.student_id, a]) || []
      );

      console.log('🗺️ [getSessionAttendance] Attendance map:', Array.from(attendanceMap.entries()));

      // Create the result array with all enrolled students
      const result = enrollments?.map(enrollment => {
        const studentProfile = enrollment.profiles;
        const attendanceRecord = attendanceMap.get(enrollment.student_id);
        
        const studentData = {
          student_id: enrollment.student_id,
          student_name: studentProfile?.name || 'Unknown Student',
          student_email: studentProfile?.unique_id || 'Unknown Email',
          status: attendanceRecord?.status || 'absent',
          marked_at: attendanceRecord?.timestamp || null
        };

        console.log(`👤 [getSessionAttendance] Student ${enrollment.student_id}:`, studentData);
        return studentData;
      }) || [];

      console.log('🎯 [getSessionAttendance] Final result:', result);
      console.log('📈 [getSessionAttendance] Summary:', {
        total: result.length,
        present: result.filter(s => s.status === 'present').length,
        absent: result.filter(s => s.status === 'absent').length
      });

      return result;

    } catch (error) {
      console.error('💥 [getSessionAttendance] Fatal error:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    if (profile?.role === 'faculty') {
      fetchFacultyClasses();
    } else if (profile?.role === 'student') {
      fetchStudentClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.role]); // Only depend on user ID and role, not the functions

  return {
    classes,
    enrollments,
    loading,
    createClass,
    joinClass,
    generateQRToken,
    markAttendance,
    markAbsentStudents,
    getLiveAttendance,
    fetchClassAttendance,
    deleteClass,
    getAttendanceSessions,
    getSessionAttendance,
    debugDatabaseContents,
    refetch: profile?.role === 'faculty' ? fetchFacultyClasses : fetchStudentClasses,
  };
};