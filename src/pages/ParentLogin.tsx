import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Loader2, Phone, Eye, EyeOff, Users, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const parentLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type ParentLoginFormData = z.infer<typeof parentLoginSchema>;

const ParentLogin = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ParentLoginFormData>({
    resolver: zodResolver(parentLoginSchema),
  });

  // Parent login using same email + password as student (shared credentials)
  const signInParent = async (email: string, password: string) => {
    try {
      console.log('🔍 [ParentLogin] Attempting login with email:', email);
      
      // Use the same authentication as student login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ [ParentLogin] Authentication failed:', error);
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }
        throw new Error(error.message || 'Invalid credentials. Please check your email and password.');
      }

      console.log('✅ [ParentLogin] Authentication successful');
      
      // Get the authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Failed to get user information after login.');
      }

      // Get the user's profile to verify they are a student
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ [ParentLogin] Profile fetch failed:', profileError);
        throw new Error('Failed to load user profile. Please try again.');
      }

      console.log('👤 [ParentLogin] User profile:', profile);

      // Verify this is a student account
      if (profile.role !== 'student') {
        throw new Error('Parent access is only available for student accounts. Please use a student email.');
      }

      const parentAccess = {
        parentPhone: email, // Store email instead of phone
        studentInfo: {
          user_id: profile.user_id,
          name: profile.name,
          unique_id: profile.unique_id,
          role: 'student' as const,
          email: email
        },
        accessType: 'parent',
        loginMethod: 'email_password',
        loginTime: new Date().toISOString()
      };

      return { success: true, parentAccess };

    } catch (error: unknown) {
      console.error('Parent login error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred during login' 
      };
    }
  };

  const onSubmit = async (data: ParentLoginFormData) => {
    setLoading(true);
    
    try {
      const { success, parentAccess } = await signInParent(data.email, data.password);
      
      if (success && parentAccess) {
        // Store parent access in localStorage
        localStorage.setItem('parentAccess', JSON.stringify(parentAccess));
        navigate('/parent-dashboard');
      }
    } catch (error) {
      console.error('Parent login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      // Check if it's the "no students" error and provide helpful guidance
      if (errorMessage.includes('No students found')) {
        toast({
          title: "No Students Registered",
          description: "No students found in the system yet. Your child needs to register first. Please visit the registration page or contact your school.",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div className="flex items-center space-x-1">
              <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                QAttend
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
            Parent Portal
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Monitor your child's attendance and academic progress
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-neutral-800 dark:text-neutral-200">
              Parent Login
            </CardTitle>
            <CardDescription className="text-center text-neutral-600 dark:text-neutral-400">
              Use your child's email and password to access parent dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-700 dark:text-neutral-300 font-medium">
                  Student Email Address
                </Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter student's email address"
                    {...register("email")}
                    className={`pl-10 h-11 input-field ${errors.email ? "border-red-300 focus:border-red-500 dark:border-red-500 dark:focus:border-red-400" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="text-xs">⚠</span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-700 dark:text-neutral-300 font-medium">
                  Student's Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter student's password"
                    {...register("password")}
                    className={`h-11 input-field pr-10 ${errors.password ? "border-red-300 focus:border-red-500 dark:border-red-500 dark:focus:border-red-400" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="text-xs">⚠</span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  "Access Dashboard"
                )}
              </Button>
            </form>

            {/* Help Section */}
            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-slate-600 space-y-3">
              <div className="text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Need help?{" "}
                  <Link 
                    to="/register" 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline"
                  >
                    Register your child first
                  </Link>
                </p>
              </div>
              
              <div className="text-center">
                <Link 
                  to="/" 
                  className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 underline"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentLogin;