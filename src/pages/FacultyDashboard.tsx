import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useClasses, AttendanceRecord } from "@/hooks/useClasses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GraduationCap, LogOut, Plus, QrCode, Users, BarChart, Eye, Clock, Copy, Check, TrendingUp, Trash2, Calendar, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { generateAttendancePDF, generateSessionSummaryPDF } from "@/lib/pdfGenerator";
import { ThemeToggle } from "@/components/ThemeToggle";

const FacultyDashboard = () => {
  const { profile, signOut } = useAuth();
  const { classes, loading, createClass, generateQRToken, getLiveAttendance, deleteClass, getAttendanceSessions, getSessionAttendance, fetchClassAttendance, debugDatabaseContents } = useClasses();
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSessionsDialog, setShowSessionsDialog] = useState(false);
  const [showSessionDetailDialog, setShowSessionDetailDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedAnalyticsClass, setSelectedAnalyticsClass] = useState<any>(null);
  const [selectedSessionClass, setSelectedSessionClass] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [sessionDetailData, setSessionDetailData] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState(false);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<{[key: string]: boolean}>({});
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [liveAttendance, setLiveAttendance] = useState<AttendanceRecord[]>([]);

  // Form states
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [studentStrength, setStudentStrength] = useState(30);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const newClass = await createClass(className, section, studentStrength);
    if (newClass) {
      setClassName("");
      setSection("");
      setStudentStrength(30);
      setShowCreateClass(false);
    }
  };

  const handleGenerateQR = async (classId: string) => {
    setIsGeneratingQR(true);
    try {
      const token = await generateQRToken(classId);
      if (token) {
        // Generate QR code image
        const qrUrl = await QRCode.toDataURL(token);
        setQrCodeUrl(qrUrl);
        setSelectedClass(classId);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const fetchAnalytics = async (classInfo: any) => {
    console.log('DEBUG: fetchAnalytics class_id:', classInfo.id);
    setAnalyticsLoading(true);
    try {
      console.log('Fetching analytics for class:', classInfo);
      
      // Use the new database function to get analytics
      const { data: analyticsResult, error: analyticsError } = await supabase
        .rpc('get_class_analytics', { class_uuid: classInfo.id });

      if (analyticsError) throw analyticsError;

      console.log('Analytics result from function:', analyticsResult);

      // Get detailed enrollment data
      const { data: enrollmentDetails, error: enrollmentError } = await supabase
        .rpc('get_class_enrollments_detailed', { class_uuid: classInfo.id });

      if (enrollmentError) throw enrollmentError;

      console.log('Enrollment details:', enrollmentDetails);

      // Fetch all attendance records for this class
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles!attendance_student_id_fkey (
            name,
            unique_id
          )
        `)
        .eq('class_id', classInfo.id)
        .order('session_date', { ascending: false });

      if (attendanceError) throw attendanceError;

      const attendanceRecords = attendanceData || [];
      const totalStudents = analyticsResult?.enrolled_students || 0;
      const totalSessions = analyticsResult?.total_sessions || 0;

      console.log('Total enrolled students:', totalStudents);
      console.log('Total sessions:', totalSessions);
      console.log('Total attendance records:', attendanceRecords.length);
      
      // Group attendance by date to get session-wise data
      const attendanceByDate = attendanceRecords.reduce((acc: any, record: any) => {
        const date = record.session_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            presentCount: 0,
            absentCount: 0,
            totalEnrolled: totalStudents,
            attendedStudents: new Set(),
            records: []
          };
        }
        acc[date].records.push(record);
        acc[date].attendedStudents.add(record.student_id);
        
        if (record.status === 'present') {
          acc[date].presentCount++;
        } else if (record.status === 'absent') {
          acc[date].absentCount++;
        }
        return acc;
      }, {});

      // Calculate session data with proper enrollment vs attendance breakdown
      const sessionData = Object.values(attendanceByDate).map((session: any) => {
        const markedStudents = session.attendedStudents.size;
        const notMarkedCount = Math.max(0, totalStudents - markedStudents);
        
        return {
          date: session.date,
          presentCount: session.presentCount,
          absentCount: session.absentCount,
          totalStudents: totalStudents,
          markedStudents: markedStudents,
          notMarkedCount: notMarkedCount,
          attendancePercentage: totalStudents > 0 ? Math.round((session.presentCount / totalStudents) * 100) : 0
        };
      });

      // Calculate overall statistics
      const totalPossibleAttendances = totalStudents * totalSessions;
      const totalPresentAttendances = attendanceRecords.filter((r: any) => r.status === 'present').length;
      const averageAttendance = totalPossibleAttendances > 0 
        ? Math.round((totalPresentAttendances / totalPossibleAttendances) * 100)
        : 0;

      // Get latest session data for pie chart
      const latestSession = sessionData.length > 0 ? sessionData[0] : null;
      const pieChartData = latestSession ? [
        { name: 'Present', value: latestSession.presentCount, color: '#10B981' },
        { name: 'Absent', value: latestSession.absentCount, color: '#EF4444' },
        { name: 'Not Marked', value: latestSession.notMarkedCount, color: '#6B7280' }
      ].filter(item => item.value > 0) : [];

      // Student-wise attendance using enrollment details
      const studentAttendance = enrollmentDetails?.map(enrollment => {
        const studentRecords = attendanceRecords.filter(record => record.student_id === enrollment.student_id);
        const presentDays = studentRecords.filter(record => record.status === 'present').length;
        const attendancePercentage = totalSessions > 0 ? (presentDays / totalSessions * 100) : 0;
        return {
          student: {
            name: enrollment.student_name,
            unique_id: enrollment.student_unique_id
          },
          totalSessions,
          presentDays,
          attendancePercentage
        };
      }) || [];

      console.log('Final analytics data:', {
        classInfo,
        totalStudents,
        totalSessions,
        averageAttendance,
        sessionCount: sessionData.length,
        studentCount: studentAttendance.length,
        pieChartData: pieChartData
      });

      setAnalyticsData({
        classInfo,
        totalStudents,
        totalSessions,
        averageAttendance,
        attendanceByDate: sessionData.sort((a: any, b: any) => b.date.localeCompare(a.date)),
        studentAttendance: studentAttendance.sort((a, b) => b.attendancePercentage - a.attendancePercentage),
        pieChartData: pieChartData,
        latestSession: latestSession
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleViewAnalytics = (classInfo: any) => {
    setSelectedAnalyticsClass(classInfo);
    setShowAnalytics(true);
    fetchAnalytics(classInfo);
  };

  // Handle copy class code
  const handleCopyCode = async (classCode: string, classId: string) => {
    try {
      await navigator.clipboard.writeText(classCode);
      setCopySuccess(prev => ({ ...prev, [classId]: true }));
      setTimeout(() => {
        setCopySuccess(prev => ({ ...prev, [classId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Handle delete class
  const handleDeleteClass = async (classInfo: any) => {
    if (window.confirm(`Are you sure you want to delete "${classInfo.class_name}" (Section: ${classInfo.section})? This will permanently remove the class and all related attendance data.`)) {
      await deleteClass(classInfo.id);
    }
  };

  // Handle view attendance sessions
  const handleViewSessions = async (classInfo: any) => {
    console.log('🎯 [handleViewSessions] Starting with class:', classInfo);
    
    setSelectedSessionClass(classInfo);
    setShowSessionsDialog(true);
    setLoadingSessions(true);
    
    try {
      console.log('📞 [handleViewSessions] Calling getAttendanceSessions...');
      const sessions = await getAttendanceSessions(classInfo.id);
      console.log('📋 [handleViewSessions] Received sessions:', sessions);
      
      setAttendanceSessions(sessions);
      console.log('✅ [handleViewSessions] Sessions set in state');
    } catch (error) {
      console.error('❌ [handleViewSessions] Error fetching sessions:', error);
      setAttendanceSessions([]);
    } finally {
      setLoadingSessions(false);
      console.log('🏁 [handleViewSessions] Finished loading');
    }
  };

  // Handle view session detail
  const handleViewSessionDetail = async (sessionId: string, sessionDate: string) => {
    console.log('🔍 [handleViewSessionDetail] Starting with:', { sessionId, sessionDate, selectedSessionClass });
    
    setSelectedSessionDate(sessionDate);
    setShowSessionDetailDialog(true);
    setLoadingSessionDetail(true);
    
    try {
      console.log('📞 [handleViewSessionDetail] Calling getSessionAttendance...');
      const detail = await getSessionAttendance(selectedSessionClass.id, sessionDate);
      console.log('📊 [handleViewSessionDetail] Received detail:', detail);
      
      setSessionDetailData(detail);
      console.log('✅ [handleViewSessionDetail] Detail set in state');
    } catch (error) {
      console.error('❌ [handleViewSessionDetail] Error fetching session detail:', error);
      setSessionDetailData([]);
    } finally {
      setLoadingSessionDetail(false);
      console.log('🏁 [handleViewSessionDetail] Finished loading');
    }
  };

  // Handle PDF download for attendance session
  const handleDownloadPDF = (type: 'detailed' | 'summary') => {
    if (!selectedSessionClass || !selectedSessionDate || !sessionDetailData.length) {
      console.error('Missing required data for PDF generation');
      return;
    }

    try {
      const sessionData = {
        classInfo: {
          class_name: selectedSessionClass.class_name,
          section: selectedSessionClass.section,
          class_code: selectedSessionClass.class_code,
          student_strength: selectedSessionClass.student_strength
        },
        sessionDate: selectedSessionDate,
        attendanceData: sessionDetailData as any[] // Cast to avoid type issues
      };

      if (type === 'detailed') {
        generateAttendancePDF(sessionData);
      } else {
        generateSessionSummaryPDF(sessionData);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // You could show a toast notification here
    }
  };

  // Handle PDF download directly from sessions list
  const handleDownloadFromSessionsList = async (sessionDate: string, type: 'detailed' | 'summary') => {
    if (!selectedSessionClass) {
      console.error('No class selected');
      return;
    }

    try {
      // Fetch session data
      const detail = await getSessionAttendance(selectedSessionClass.id, sessionDate);
      
      const sessionData = {
        classInfo: {
          class_name: selectedSessionClass.class_name,
          section: selectedSessionClass.section,
          class_code: selectedSessionClass.class_code,
          student_strength: selectedSessionClass.student_strength
        },
        sessionDate: sessionDate,
        attendanceData: detail as any[] // Cast to avoid type issues
      };

      if (type === 'detailed') {
        generateAttendancePDF(sessionData);
      } else {
        generateSessionSummaryPDF(sessionData);
      }
    } catch (error) {
      console.error('Error generating PDF from sessions list:', error);
      // You could show a toast notification here
    }
  };

  // Set up real-time listening for attendance updates
  useEffect(() => {
    if (!selectedClass) return;

    const channel = supabase
      .channel('attendance-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `class_id=eq.${selectedClass}`
        },
        async (payload) => {
          // Fetch the student profile for the new attendance record
          const { data: studentData } = await supabase
            .from('profiles')
            .select('name, unique_id')
            .eq('user_id', payload.new.student_id)
            .maybeSingle();

          if (studentData) {
            const newRecord: AttendanceRecord = {
              ...payload.new as AttendanceRecord,
              profiles: studentData
            };
            setLiveAttendance(prev => [newRecord, ...prev]);
          }
        }
      )
      .subscribe();

    // Fetch today's attendance when class changes
    const fetchTodayAttendance = async () => {
      if (!selectedClass) return;
      const today = new Date().toISOString().split('T')[0];
      try {
        const records = await fetchClassAttendance(selectedClass);
        const todayRecords = records.filter(r => r.session_date === today);
        setLiveAttendance(todayRecords);
      } catch (err) {
        setLiveAttendance([]);
      }
    };
    fetchTodayAttendance();

    // Listen for attendanceMarked event to refresh live attendance
    const handler = (e: CustomEvent) => {
      if (e.detail.classId === selectedClass) {
        fetchTodayAttendance();
      }
    };
    window.addEventListener('attendanceMarked', handler);
    return () => {
      window.removeEventListener('attendanceMarked', handler);
    };

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClass]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force navigation to home page even if signOut fails
      window.location.href = '/';
    }
  };

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Enhanced Header */}
      <header className="border-b border-white/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-blue-500/10 dark:border-slate-700/20 dark:bg-slate-900/80 dark:shadow-slate-900/20">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-75"></div>
                <img src="/LOGO.png" alt="AttendEase Logo" className="relative h-12 w-12 rounded-xl shadow-lg" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AttendEase
                </h1>
                <p className="text-sm font-medium text-slate-600">Faculty Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-semibold text-slate-700 dark:text-slate-300">{profile.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{profile.unique_id}</p>
              </div>
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="border-slate-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all duration-200 dark:border-slate-600 dark:hover:border-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Enhanced Actions Bar */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
              My Classes
            </h2>
            <p className="text-lg text-slate-600">Manage your classes and track attendance seamlessly</p>
          </div>
          
          <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
            <DialogTrigger asChild>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-8 py-3"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Enter the class details to create a new class and generate a unique class code.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    placeholder="e.g., Computer Science 101"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    placeholder="e.g., A, B, Morning, Evening"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentStrength">Expected Student Strength</Label>
                  <Input
                    id="studentStrength"
                    type="number"
                    min="1"
                    value={studentStrength}
                    onChange={(e) => setStudentStrength(parseInt(e.target.value))}
                    required
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Create Class</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateClass(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Enhanced QR Code Display */}
        {qrCodeUrl && selectedClass && (
          <Card className="mb-12 border border-blue-200 shadow-2xl shadow-blue-500/20 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="text-center border-b border-blue-100 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-3 text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-2">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                  <QrCode className="h-8 w-8 text-white" />
                </div>
                Attendance QR Code
              </div>
              <CardDescription className="text-base">
                Students can scan this QR code to mark their attendance instantly. 
                <div className="flex items-center justify-center gap-2 mt-3 text-orange-600 bg-orange-50 px-4 py-2 rounded-xl font-medium">
                  <Clock className="h-5 w-5" />
                  Expires in 5 minutes - Scan quickly!
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              {/* Enhanced QR Code Display */}
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative bg-white p-6 rounded-2xl shadow-xl">
                  <img 
                    src={qrCodeUrl} 
                    alt="Attendance QR Code" 
                    className="w-64 h-64 mx-auto rounded-xl"
                  />
                </div>
              </div>
              
              {/* Live Attendance Display */}
              {liveAttendance.length > 0 && (
                <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-200 shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <h4 className="text-xl font-semibold text-green-700">Live Attendance</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-3">
                    {liveAttendance.map((record) => (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-200 transform hover:scale-105 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-semibold text-green-800">{record.profiles?.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-green-600 font-medium">{record.profiles?.unique_id}</div>
                          <div className="text-xs text-green-500">
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={() => {
                  setQrCodeUrl("");
                  setSelectedClass(null);
                }}
                className="mt-8 bg-white hover:bg-red-50 border-red-200 text-red-600 hover:border-red-300 px-8 py-3 text-base font-medium rounded-xl transition-all duration-200"
                size="lg"
              >
                Close QR Code
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Classes Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-20 w-16 h-16 mx-auto"></div>
              <div className="relative animate-spin h-16 w-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div>
            </div>
            <p className="text-xl font-medium text-slate-700">Loading your classes...</p>
            <p className="text-slate-500 mt-2">Please wait while we fetch your data</p>
          </div>
        ) : classes.length === 0 ? (
          <Card className="text-center py-16 bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 shadow-xl">
            <CardContent>
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-2xl opacity-20 w-32 h-32 mx-auto"></div>
                <GraduationCap className="relative h-20 w-20 mx-auto text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-800">No Classes Created Yet</h3>
              <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
                Start by creating your first class to begin taking attendance and managing your students.
              </p>
              <Button 
                onClick={() => setShowCreateClass(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-8 py-3"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {classes.map((cls) => (
              <Card 
                key={cls.id} 
                className="group hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm border border-white/50 overflow-hidden relative"
              >
                {/* Card Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <CardHeader className="relative z-10 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"></div>
                        <span className="text-xl font-bold text-slate-800">{cls.class_name}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full w-fit">
                        Section: {cls.section}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50 px-3 py-2 rounded-xl">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-700">{cls.student_strength}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="mb-6">
                    <span className="text-xs text-slate-500 block mb-2 font-medium">Class Code (Share with students):</span>
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 rounded-lg">
                      <div className="bg-white rounded-md px-4 py-3">
                        <span className="font-mono font-bold text-lg text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                          {cls.class_code}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Button
                      onClick={() => handleGenerateQR(cls.id)}
                      disabled={isGeneratingQR}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                      size="lg"
                    >
                      <QrCode className="h-5 w-5 mr-2" />
                      {isGeneratingQR ? 'Generating...' : 'Generate QR Code'}
                    </Button>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCopyCode(cls.class_code, cls.id)}
                        className="flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200"
                      >
                        {copySuccess[cls.id] ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewSessions(cls)}
                        className="flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteClass(cls)}
                        className="flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all duration-200"
                      onClick={() => handleViewAnalytics(cls)}
                    >
                      <BarChart className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Analytics Dialog */}
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Class Analytics
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedAnalyticsClass && fetchAnalytics(selectedAnalyticsClass)}
                  disabled={analyticsLoading}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </DialogTitle>
              <DialogDescription>
                {selectedAnalyticsClass && (
                  <div className="mb-3 p-3 bg-primary/10 rounded-lg">
                    <div className="font-medium text-primary">
                      {selectedAnalyticsClass.class_name} - Section {selectedAnalyticsClass.section}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Class Code: <span className="font-mono">{selectedAnalyticsClass.class_code}</span> | 
                      Class Strength: {selectedAnalyticsClass.student_strength}
                    </div>
                  </div>
                )}
                Comprehensive analytics and attendance insights for this class.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading analytics...</p>
                </div>
              ) : !analyticsData ? (
                <div className="text-center py-12">
                  <BarChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p className="text-muted-foreground">
                    No attendance data found for this class.
                  </p>
                </div>
              ) : (
                <div>Analytics content would be here</div>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowAnalytics(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Analytics Dialog */}
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Class Analytics
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedAnalyticsClass && fetchAnalytics(selectedAnalyticsClass)}
                  disabled={analyticsLoading}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </DialogTitle>
              <DialogDescription>
                {selectedAnalyticsClass && (
                  <div className="mb-3 p-3 bg-primary/10 rounded-lg">
                    <div className="font-medium text-primary">
                      {selectedAnalyticsClass.class_name} - Section {selectedAnalyticsClass.section}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Class Code: <span className="font-mono">{selectedAnalyticsClass.class_code}</span>
                    </div>
                  </div>
                )}
                Detailed attendance analytics and student performance.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading analytics...</p>
                </div>
              ) : !analyticsData ? (
                <div className="text-center py-12">
                  <BarChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p className="text-muted-foreground">
                    No attendance data found for this class.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <div className="text-2xl font-bold">{analyticsData.totalStudents}</div>
                        <div className="text-sm text-muted-foreground">Total Enrolled</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <div className="text-2xl font-bold">{analyticsData.totalSessions}</div>
                        <div className="text-sm text-muted-foreground">Total Sessions</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <BarChart className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                        <div className="text-2xl font-bold">{analyticsData.averageAttendance}%</div>
                        <div className="text-sm text-muted-foreground">Average Attendance</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <GraduationCap className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                        <div className="text-2xl font-bold">
                          {analyticsData.studentAttendance.filter((s: any) => s.attendancePercentage >= 75).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Students ≥75%</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Latest Session Pie Chart */}
                  {analyticsData.latestSession && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Latest Session Breakdown</CardTitle>
                        <CardDescription>
                          {new Date(analyticsData.latestSession.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-3 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {analyticsData.latestSession.presentCount}
                                </div>
                                <div className="text-sm text-green-700">Present</div>
                              </div>
                              <div className="p-3 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">
                                  {analyticsData.latestSession.absentCount}
                                </div>
                                <div className="text-sm text-red-700">Absent</div>
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-600">
                                  {analyticsData.latestSession.notMarkedCount}
                                </div>
                                <div className="text-sm text-gray-700">Not Marked</div>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-primary">
                                {analyticsData.latestSession.attendancePercentage}%
                              </div>
                              <div className="text-sm text-muted-foreground">Attendance Rate</div>
                            </div>
                          </div>
                          <div className="h-64">
                            {analyticsData.pieChartData && analyticsData.pieChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={analyticsData.pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {analyticsData.pieChartData.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                No data to display
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Session-wise Attendance */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Session-wise Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {analyticsData.attendanceByDate.map((session: any, index: number) => (
                          <div key={index} className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-medium">
                                {new Date(session.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-lg font-bold">
                                {session.totalStudents > 0 ? ((session.presentCount / session.totalStudents) * 100).toFixed(1) : 0}%
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span>Present: <strong>{session.presentCount}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span>Absent: <strong>{session.absentCount}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                <span>Not Marked: <strong>{session.notMarkedCount}</strong></span>
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <div className="text-xs text-muted-foreground mb-1">
                                Total Enrolled: {session.totalStudents} | Attendance Rate: {session.attendancePercentage}%
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="flex h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-green-500" 
                                    style={{ 
                                      width: session.totalStudents > 0 ? `${(session.presentCount / session.totalStudents) * 100}%` : '0%'
                                    }}
                                  ></div>
                                  <div 
                                    className="bg-red-500" 
                                    style={{ 
                                      width: session.totalStudents > 0 ? `${(session.absentCount / session.totalStudents) * 100}%` : '0%'
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Student-wise Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Student Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {analyticsData.studentAttendance.map((student: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                student.attendancePercentage >= 90 ? 'bg-green-500' :
                                student.attendancePercentage >= 75 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`} />
                              <div>
                                <div className="font-medium">{student.student?.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {student.student?.unique_id}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                {student.attendancePercentage.toFixed(1)}%
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.presentDays}/{student.totalSessions} sessions
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowAnalytics(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sessions Dialog */}
        <Dialog open={showSessionsDialog} onOpenChange={setShowSessionsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Attendance Sessions</DialogTitle>
              <DialogDescription>
                View all attendance sessions for this class. Click on a session to see detailed attendance.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading sessions...</span>
                </div>
              ) : attendanceSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance sessions found for this class.
                </div>
              ) : (
                <div className="grid gap-2">
                  {attendanceSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleViewSessionDetail(session.id, session.date)}
                        >
                          <h4 className="font-medium">
                            {new Date(session.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            QR Generated at: {new Date(session.qr_generated_at).toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Students Present: {session.present_count}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFromSessionsList(session.date, 'summary');
                            }}
                            title="Download Summary Report"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFromSessionsList(session.date, 'detailed');
                            }}
                            title="Download Detailed Report"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Detailed
                          </Button>
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowSessionsDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Session Detail Dialog */}
        <Dialog open={showSessionDetailDialog} onOpenChange={setShowSessionDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Session Attendance Details</DialogTitle>
              <DialogDescription>
                Detailed attendance for {selectedSessionDate ? new Date(selectedSessionDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Selected Session'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {loadingSessionDetail ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading attendance details...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {sessionDetailData.filter(student => student.status === 'present').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Present</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {sessionDetailData.filter(student => student.status === 'absent').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Absent</div>
                      </div>
                    </Card>
                  </div>

                  {/* Attendance List */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Student Attendance</h4>
                    {sessionDetailData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No students found for this session.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {sessionDetailData.map((student) => (
                          <div
                            key={student.student_id}
                            className={`p-3 border rounded-lg flex items-center justify-between ${
                              student.status === 'present' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{student.student_name}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={student.status === 'present' ? 'default' : 'destructive'}
                                className={student.status === 'present' ? 'bg-green-600' : ''}
                              >
                                {student.status}
                              </Badge>
                              {student.marked_at && (
                                <div className="text-xs text-muted-foreground">
                                  {new Date(student.marked_at).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between space-x-2 pt-4">
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleDownloadPDF('detailed')}
                  disabled={!sessionDetailData.length}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Detailed Report
                </Button>
                <Button
                  onClick={() => handleDownloadPDF('summary')}
                  disabled={!sessionDetailData.length}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Summary
                </Button>
              </div>
              <Button variant="outline" onClick={() => setShowSessionDetailDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default FacultyDashboard;