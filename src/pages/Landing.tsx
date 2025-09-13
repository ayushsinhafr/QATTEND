import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, QrCode, BarChart } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Enhanced Header */}
      <header className="border-b border-white/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-blue-500/10 dark:border-slate-700/20 dark:bg-slate-900/80 dark:shadow-slate-900/20">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                <img src="/LOGO.png" alt="AttendEase Logo" className="relative h-12 w-12 rounded-xl shadow-lg" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AttendEase
                </h1>
                <p className="text-sm font-medium text-slate-600">Smart Attendance Solution</p>
              </div>
            </div>
            <div className="flex gap-4">
              <ThemeToggle />
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')} 
                className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 px-6 py-2 transition-all duration-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate('/register')} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-6 py-2"
              >
                Register
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="text-center max-w-6xl mx-auto">
          <div className="relative mb-8">
            <h2 className="text-6xl font-bold text-slate-800 mb-6 leading-tight">
              Automated Student{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Attendance System
                </span>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-30"></div>
              </span>
            </h2>
          </div>
          <p className="text-2xl text-slate-600 mb-16 leading-relaxed max-w-4xl mx-auto">
            Streamline attendance tracking with cutting-edge QR code technology. 
            <br className="hidden md:block" />
            Perfect for modern educational institutions.
          </p>

          {/* Enhanced Features Grid */}
          <div className="grid md:grid-cols-3 gap-10 mb-20">
            <div className="group bg-white/80 backdrop-blur-sm border border-white/50 p-8 rounded-2xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <QrCode className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-800">QR Code Scanning</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                Lightning-fast attendance marking with secure, dynamic QR codes that refresh automatically
              </p>
            </div>
            <div className="group bg-white/80 backdrop-blur-sm border border-white/50 p-8 rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <Users className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-800">Real-time Tracking</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                Monitor attendance instantly with live updates and comprehensive student management
              </p>
            </div>
            <div className="group bg-white/80 backdrop-blur-sm border border-white/50 p-8 rounded-2xl hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <BarChart className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-800">Analytics Dashboard</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                Generate detailed reports and insights with powerful analytics and PDF exports
              </p>
            </div>
          </div>

          {/* Enhanced CTA Section */}
          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-12 rounded-3xl shadow-2xl overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-sm"></div>
              <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/10 rounded-full blur-lg"></div>
            </div>
            
            <div className="relative z-10 text-center text-white">
              <h3 className="text-4xl font-bold mb-6">Ready to Transform Your Classroom?</h3>
              <p className="text-xl mb-10 leading-relaxed opacity-90 max-w-2xl mx-auto">
                Join thousands of educators already using AttendEase to streamline their attendance management and focus on what matters most - teaching.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/register')} 
                  className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-10 py-4 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Create Account
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => navigate('/login')} 
                  className="border-white border-2 text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm text-lg px-10 py-4 font-semibold transition-all duration-200 shadow-lg"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-gray-100 mt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/LOGO.png" alt="AttendEase Logo" className="h-8 w-8 rounded-lg" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AttendEase
              </span>
            </div>
            <p className="text-slate-600 mb-2">Smart Attendance Solution for Modern Education</p>
            <p className="text-slate-500 text-sm">&copy; 2025 AttendEase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;