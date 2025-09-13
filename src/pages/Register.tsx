import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  uniqueId: z.string().min(1, "Unique ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  role: z.enum(["faculty", "student"], {
    message: "Please select your role",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const { error } = await signUp({
        email: data.email,
        password: data.password,
        name: data.name,
        uniqueId: data.uniqueId,
        role: data.role,
      });
      
      if (error) {
        if (error.message?.includes("already registered")) {
          toast({
            title: "Account already exists",
            description: "This email is already registered. Please try logging in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration failed",
            description: error.message || "Please try again with different details.",
            variant: "destructive",
          });
        }
      } else {
        navigate("/login");
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur opacity-75"></div>
              <img src="/LOGO.png" alt="AttendEase Logo" className="relative h-14 w-14 p-1 rounded-2xl shadow-lg" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gradient">Create Account</CardTitle>
          <CardDescription className="text-neutral-600 text-base">
            Join AttendEase to manage attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-700 font-medium">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                {...register("name")}
                className={`h-11 bg-white/50 border-neutral-200 focus:border-brand-400 focus:ring-brand-400/20 ${errors.name ? "border-red-300 focus:border-red-500" : ""}`}
              />
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-700 font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
                className={`h-11 bg-white/50 border-neutral-200 focus:border-brand-400 focus:ring-brand-400/20 ${errors.email ? "border-red-300 focus:border-red-500" : ""}`}
              />
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-neutral-700 font-medium">Role</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={(value) => setValue("role", value as "faculty" | "student")}
                className="flex flex-col space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 bg-white/30 rounded-lg border border-neutral-200 hover:border-brand-300 transition-colors">
                  <RadioGroupItem value="faculty" id="faculty" className="text-brand-600" />
                  <Label htmlFor="faculty" className="cursor-pointer text-neutral-700 font-medium">
                    Faculty Member
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white/30 rounded-lg border border-neutral-200 hover:border-brand-300 transition-colors">
                  <RadioGroupItem value="student" id="student" className="text-brand-600" />
                  <Label htmlFor="student" className="cursor-pointer text-neutral-700 font-medium">
                    Student
                  </Label>
                </div>
              </RadioGroup>
              {errors.role && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span>
                  {errors.role.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="uniqueId" className="text-neutral-700 font-medium">
                {selectedRole === "faculty" ? "Professor ID" : "Registration Number"}
              </Label>
              <Input
                id="uniqueId"
                placeholder={
                  selectedRole === "faculty" 
                    ? "Enter your professor ID" 
                    : "Enter your registration number"
                }
                {...register("uniqueId")}
                className={`h-11 bg-white/50 border-neutral-200 focus:border-brand-400 focus:ring-brand-400/20 ${errors.uniqueId ? "border-red-300 focus:border-red-500" : ""}`}
              />
              {errors.uniqueId && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span>
                  {errors.uniqueId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                {...register("password")}
                className={`h-11 bg-white/50 border-neutral-200 focus:border-brand-400 focus:ring-brand-400/20 ${errors.password ? "border-red-300 focus:border-red-500" : ""}`}
              />
              {errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span>
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-neutral-700 font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                {...register("confirmPassword")}
                className={`h-11 bg-white/50 border-neutral-200 focus:border-brand-400 focus:ring-brand-400/20 ${errors.confirmPassword ? "border-red-300 focus:border-red-500" : ""}`}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-12 btn-primary text-white font-medium text-base mt-8" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-neutral-600">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-brand-600 hover:text-brand-700 underline font-medium transition-colors"
              >
                Sign in here
              </Link>
            </p>
            <Link 
              to="/" 
              className="text-sm text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1 transition-colors"
            >
              <span>←</span>
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;