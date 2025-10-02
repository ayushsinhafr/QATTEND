import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  LogOut, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  BookOpen,
  Phone,
  User,
  BarChart3,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

interface StudentInfo {
  user_id: string;
  name: string;
  unique_id: string;
  role: string;
  email: string;
}

interface ParentAccess {
  parentPhone: string;
  studentInfo: StudentInfo;
  accessType: string;
  loginMethod?: string;
  loginTime?: string;
  verifiedPassword?: string;
  loginAttempt?: any;
}

interface ClassData {
  id: string;
  class_name: string;
  section: string;
  class_code: string;
}

interface AttendanceRecord {
  id: string;
  class_id: string;
  session_date: string;
  status: 'present' | 'absent';
  timestamp: string;
  classes?: ClassData;
}

const ParentDashboard = () => {
  const [parentAccess, setParentAccess] = useState<ParentAccess | null>(null);
  const [studentClasses, setStudentClasses] = useState<ClassData[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState({
    totalClasses: 0,
    attendancePercentage: 0,
    presentDays: 0,
    totalDays: 0
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if parent is logged in
    const parentAccessData = localStorage.getItem('parentAccess');
    if (!parentAccessData) {
      navigate('/parent-login');
      return;
    }

    try {
      const accessData = JSON.parse(parentAccessData);
      setParentAccess(accessData);

      // If we have a placeholder access, we need to verify and fetch real student data
      if (accessData.studentInfo.user_id === 'lookup_needed') {
        verifyAndFetchStudentData(accessData.parentPhone, accessData.verifiedPassword);
      } else {
        // We already have real student data, just load their attendance
        fetchStudentData(accessData.studentInfo.user_id);
      }
    } catch (error) {
      console.error('Error parsing parent access data:', error);
      navigate('/parent-login');
    }
  }, [navigate]);

  const verifyAndFetchStudentData = async (parentPhone: string, password: string) => {
    try {
      // For now, we'll use a simple approach - just look up by unique_id
      // In a real implementation, this would be enhanced with proper phone lookup
      const { data: studentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, name, unique_id, role')
        .eq('role', 'student')
        .ilike('unique_id', `%${parentPhone.slice(-4)}%`) // Simple matching for demo
        .limit(1)
        .maybeSingle();

      if (profileError) {
        console.log('Profile lookup error:', profileError);
      }

      // For demo purposes, if no exact match, create placeholder data
      const studentInfo = studentProfile ? {
        user_id: studentProfile.user_id,
        name: studentProfile.name,
        unique_id: studentProfile.unique_id,
        role: 'student' as const,
        email: 'demo@example.com'
      } : {
        user_id: 'demo-user-id',
        name: 'Demo Student',
        unique_id: parentPhone,
        role: 'student' as const,
        email: 'demo@example.com'
      };

      // Update the parent access with real student data
      const updatedAccess = {
        parentPhone: parentPhone,
        studentInfo: studentInfo,
        accessType: 'parent',
        loginMethod: 'phone_password',
        loginTime: new Date().toISOString()
      };

      setParentAccess(updatedAccess);
      localStorage.setItem('parentAccess', JSON.stringify(updatedAccess));

      // Load student data
      if (studentProfile) {
        fetchStudentData(studentProfile.user_id);
      } else {
        setLoading(false);
        toast({
          title: "No Data Found",
          description: "No student profile found. Student may not be enrolled yet.",
          variant: "default",
        });
      }

    } catch (error) {
      console.error('Error verifying student data:', error);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to find student information. Please check the phone number.",
        variant: "destructive",
      });
    }
  };

  const fetchStudentData = async (studentUserId: string) => {
    try {
      setLoading(true);

      // Fetch student's enrolled classes
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          class_id,
          classes (
            id,
            class_name,
            section,
            class_code
          )
        `)
        .eq('student_id', studentUserId);

      if (enrollmentError) {
        console.error('Enrollment error:', enrollmentError);
        setStudentClasses([]);
      } else {
        const classes = enrollments?.map(enrollment => enrollment.classes).filter(Boolean) || [];
        setStudentClasses(classes);
      }

      // Fetch attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          id,
          class_id,
          session_date,
          status,
          timestamp,
          classes (
            id,
            class_name,
            section,
            class_code
          )
        `)
        .eq('student_id', studentUserId)
        .order('session_date', { ascending: false });

      if (attendanceError) {
        console.error('Attendance error:', attendanceError);
        setAttendanceRecords([]);
      } else {
        setAttendanceRecords((attendance || []) as AttendanceRecord[]);
      }

      // Calculate statistics
      const classes = enrollments?.map(enrollment => enrollment.classes).filter(Boolean) || [];
      const totalRecords = attendance?.length || 0;
      const presentRecords = attendance?.filter(record => record.status === 'present').length || 0;
      const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

      setStudentStats({
        totalClasses: classes.length,
        attendancePercentage,
        presentDays: presentRecords,
        totalDays: totalRecords
      });

    } catch (error) {
      console.error('Error fetching student data:', error);
      toast({
        title: "Error",
        description: "Failed to load student data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parentAccess');
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate('/parent-login');
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceBadgeColor = (status: string) => {
    return status === 'present' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-muted-foreground">Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                  Parent Dashboard
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Monitoring: {parentAccess?.studentInfo.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Parent Info Card */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Student Name</p>
                <p className="font-semibold">{parentAccess?.studentInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student Email</p>
                <p className="font-semibold">{parentAccess?.studentInfo.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registration Number</p>
                <p className="font-semibold">{parentAccess?.studentInfo.unique_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                  <p className="text-2xl font-bold">{studentStats.totalClasses}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className={`text-2xl font-bold ${getAttendanceColor(studentStats.attendancePercentage)}`}>
                    {studentStats.attendancePercentage}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Present Days</p>
                  <p className="text-2xl font-bold text-green-600">{studentStats.presentDays}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{studentStats.totalDays}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Classes */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Enrolled Classes
            </CardTitle>
            <CardDescription>
              Classes your child is currently enrolled in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentClasses.map((classItem) => (
                  <Card key={classItem.id} className="border border-neutral-200 dark:border-slate-600">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{classItem.class_name}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Section: {classItem.section}</p>
                        <p>Code: <span className="font-mono bg-muted px-2 py-1 rounded">{classItem.class_code}</span></p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  No classes enrolled yet. Your child needs to join classes to see attendance data.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Recent Attendance
            </CardTitle>
            <CardDescription>
              Latest attendance records for your child
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length > 0 ? (
              <div className="space-y-3">
                {attendanceRecords.slice(0, 10).map((record) => (
                  <div 
                    key={record.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-slate-600"
                  >
                    <div className="flex items-center space-x-3">
                      {record.status === 'present' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{record.classes?.class_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(record.session_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getAttendanceBadgeColor(record.status)}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  No attendance records found. Attendance will appear here once your child starts attending classes.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;