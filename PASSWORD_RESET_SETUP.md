# 🔐 Password Reset Email Template Configuration

## 📧 Configure Reset Password Email Template

You need to customize the "Reset Password" email template in Supabase:

### Step 1: Go to Supabase Dashboard
1. **Navigate to**: Authentication → Email Templates
2. **Click on**: "Reset Password" tab

### Step 2: Update the Template
Replace the template with this:

```html
<h2>Reset Your Password 🔐</h2>

<p>Hi there!</p>

<p>You requested to reset your password for your AttendEase account. Please enter this verification code in the app:</p>

<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
  <h1 style="font-size: 32px; color: #dc2626; margin: 0; letter-spacing: 4px;">{{ .Token }}</h1>
</div>

<p>This code will expire in <strong>60 minutes</strong>.</p>

<p><strong>Important:</strong> If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
<p style="color: #6b7280; font-size: 12px;">
  This email was sent by AttendEase. Please do not reply to this email.
</p>
```

### Step 3: Test the Flow

1. **Go to**: http://localhost:8081/login
2. **Click**: "Forgot password?"
3. **Enter your email** and click "Send Reset Code"
4. **Check your email** for the reset code
5. **Enter the code** and set new password
6. **Login** with the new password

## 🎯 Complete Password Reset Flow

```
Login Page → "Forgot Password?" → 
Enter Email → Send Reset Code → 
Check Email → Enter OTP + New Password → 
Password Updated → Login with New Password
```

## ✨ Features Included

- ✅ **Beautiful forgot password button** on login page
- ✅ **Email input page** with validation
- ✅ **OTP + password reset page** with show/hide password
- ✅ **Email verification** using Supabase OTP
- ✅ **Automatic redirect** to login after success
- ✅ **Resend functionality** with countdown timer
- ✅ **Proper error handling** and user feedback
- ✅ **Consistent UI** matching your app design

---

**Your password reset flow is now complete and ready to use!** 🚀