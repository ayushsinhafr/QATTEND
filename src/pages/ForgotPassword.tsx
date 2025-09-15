import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    
    try {
      console.log("🔥 [ForgotPassword] Starting password reset request...", { email: data.email });
      
      const result = await resetPassword(data.email);
      
      console.log("🔥 [ForgotPassword] Reset password result:", result);
      
      if (result.error) {
        console.log("❌ [ForgotPassword] Reset password error:", result.error);
        toast({
          title: "Reset failed",
          description: result.error.message || "Failed to send reset email. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log("✅ [ForgotPassword] Reset email sent, redirecting to verification...");
        toast({
          title: "Reset email sent!",
          description: "Please check your email for a verification code to reset your password.",
        });
        
        // Redirect to password reset verification page
        const verifyUrl = `/reset-password-verify?email=${encodeURIComponent(data.email)}`;
        console.log("🔥 [ForgotPassword] Navigating to:", verifyUrl);
        navigate(verifyUrl);
      }
    } catch (error: any) {
      console.error("❌ [ForgotPassword] Unexpected error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
            <Mail className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-neutral-600 dark:text-neutral-400 text-base">
            Enter your email address and we'll send you a verification code to reset your password
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-700 dark:text-neutral-300 font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                {...register("email")}
                className={`h-12 ${errors.email ? "border-red-300 focus:border-red-400" : "border-neutral-200 focus:border-brand-400"}`}
                autoFocus
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full btn-primary h-12 text-base font-medium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Email...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reset Code
                </>
              )}
            </Button>
          </form>

          <div className="space-y-4 text-center">
            <p className="text-sm text-neutral-600">
              Remember your password?{" "}
              <Link 
                to="/login" 
                className="text-brand-600 hover:text-brand-700 font-semibold hover:underline transition-colors"
              >
                Sign in instead
              </Link>
            </p>
            <Link 
              to="/" 
              className="text-sm text-neutral-500 hover:text-neutral-700 hover:underline transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;