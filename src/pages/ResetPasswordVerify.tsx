import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Eye, EyeOff, CheckCircle2, Check, X } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/^(?=.*[a-z])/, "Password must contain at least one lowercase letter")
  .regex(/^(?=.*[A-Z])/, "Password must contain at least one uppercase letter") 
  .regex(/^(?=.*\d)/, "Password must contain at least one number")
  .regex(/^(?=.*[@#$%^&*!+=?])/, "Password must contain at least one special character (@#$%^&*!+=?)")
  .regex(/^[^_-]*$/, "Password cannot contain underscores (_) or hyphens (-)");

const resetPasswordSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPasswordVerify = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const email = searchParams.get("email");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch("password");

  // Password strength validation
  const getPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 8,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@#$%^&*!+=?]/.test(password),
      noForbiddenChars: !/[_-]/.test(password),
    };
  };

  const requirements = getPasswordRequirements(passwordValue || "");
  const isPasswordStrong = Object.values(requirements).every(Boolean);

  // Update form when OTP changes
  useEffect(() => {
    setValue("otp", otp);
  }, [otp, setValue]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-submit when OTP is complete and form is valid
  useEffect(() => {
    if (otp.length === 6) {
      const password = watch("password");
      const confirmPassword = watch("confirmPassword");
      
      if (password && confirmPassword && password === confirmPassword && password.length >= 8) {
        handleSubmit(onSubmit)();
      }
    }
  }, [otp, watch, handleSubmit]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email parameter is missing. Please start the reset process again.",
        variant: "destructive",
      });
      navigate("/forgot-password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔥 [ResetPasswordVerify] Verifying OTP and updating password...");

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: data.otp,
        type: 'recovery',
      });

      if (verifyError) {
        console.error("❌ [ResetPasswordVerify] OTP verification error:", verifyError);
        
        if (verifyError.message?.includes("expired")) {
          setError("The verification code has expired. Please request a new one.");
        } else if (verifyError.message?.includes("invalid")) {
          setError("Invalid verification code. Please check and try again.");
        } else {
          setError(verifyError.message || "Failed to verify code. Please try again.");
        }
        return;
      }

      console.log("✅ [ResetPasswordVerify] OTP verified, updating password...");

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      });

      if (updateError) {
        console.error("❌ [ResetPasswordVerify] Password update error:", updateError);
        setError(updateError.message || "Failed to update password. Please try again.");
        return;
      }

      console.log("✅ [ResetPasswordVerify] Password updated successfully");

      toast({
        title: "Password Reset Successful!",
        description: "Your password has been updated. You can now sign in with your new password.",
      });

      // Sign out user and redirect to login
      await supabase.auth.signOut();
      
      navigate("/login", {
        state: { 
          message: "Password updated successfully! Please sign in with your new password.",
          email: email 
        }
      });

    } catch (error: any) {
      console.error("❌ [ResetPasswordVerify] Unexpected error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email || countdown > 0) return;

    setResending(true);
    setError("");

    try {
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password-complete`,
      });

      if (resendError) {
        throw resendError;
      }

      toast({
        title: "Code Sent!",
        description: "A new verification code has been sent to your email.",
      });

      setCountdown(60); // 1 minute countdown
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast({
        title: "Failed to resend",
        description: error.message || "Could not resend verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="mx-auto max-w-sm">
          <CardContent className="text-center p-6">
            <p className="text-muted-foreground">Invalid reset link. Please start the password reset process again.</p>
            <Button asChild className="mt-4">
              <Link to="/forgot-password">Reset Password</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            <Shield className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold dark:text-neutral-100">Reset Your Password</CardTitle>
          <CardDescription className="text-center dark:text-neutral-400">
            Enter the verification code sent to your email and create a new password
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Code sent to: <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  {...register("password")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Password Requirements */}
              {passwordValue && (
                <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-slate-600">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Requirements:</p>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className={`flex items-center gap-2 ${requirements.minLength ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {requirements.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-2 ${requirements.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {requirements.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      One lowercase letter (a-z)
                    </div>
                    <div className={`flex items-center gap-2 ${requirements.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {requirements.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      One uppercase letter (A-Z)
                    </div>
                    <div className={`flex items-center gap-2 ${requirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {requirements.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      One number (0-9)
                    </div>
                    <div className={`flex items-center gap-2 ${requirements.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {requirements.hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      One special character (@#$%^&*!+=?)
                    </div>
                    <div className={`flex items-center gap-2 ${requirements.noForbiddenChars ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {requirements.noForbiddenChars ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      No underscores (_) or hyphens (-)
                    </div>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  {...register("confirmPassword")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={otp.length !== 6 || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Didn't receive the code?
            </span>
            <Button
              variant="link"
              onClick={handleResendOTP}
              disabled={countdown > 0 || resending}
              className="p-0 h-auto font-medium"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend Code'
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordVerify;