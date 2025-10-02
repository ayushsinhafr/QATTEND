import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  Users, 
  QrCode, 
  BarChart, 
  User, 
  LogIn, 
  UserPlus, 
  Phone,
  Shield,
  Zap,
  Brain,
  Camera,
  Clock,
  TrendingUp,
  CheckCircle,
  Star,
  Play,
  Smartphone,
  Monitor,
  Database,
  Cloud,
  Lock,
  Globe,
  ArrowRight,
  Heart,
  Award
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: QrCode,
      title: "QR Code Attendance",
      description: "Generate QR codes for attendance tracking that can be refreshed for each session to help maintain security.",
      color: "from-blue-500 to-purple-600",
      features: ["Session-based codes", "Security features", "Quick generation"]
    },
    {
      icon: Camera,
      title: "Face Recognition",
      description: "Uses face recognition technology with ONNX models to help verify student identity during attendance marking.",
      color: "from-emerald-500 to-teal-600", 
      features: ["Identity verification", "ONNX models", "Browser-based"]
    },
    {
      icon: BarChart,
      title: "Attendance Reports",
      description: "View attendance data with charts and generate PDF reports for classes and individual students.",
      color: "from-indigo-500 to-purple-600",
      features: ["Data visualization", "PDF export", "Class reports"]
    },
    {
      icon: Users,
      title: "User Management", 
      description: "Supports different user roles including students, faculty, and parents with appropriate access levels.",
      color: "from-orange-500 to-red-600",
      features: ["Multiple roles", "Access control", "User dashboards"]
    },
    {
      icon: Shield,
      title: "Security Features",
      description: "Implements authentication, data encryption, and secure database access using Supabase security features.",
      color: "from-cyan-500 to-blue-600",
      features: ["Authentication", "Data encryption", "Secure database"]
    },
    {
      icon: Smartphone,
      title: "Responsive Design",
      description: "Works on mobile phones, tablets, and desktop computers with a responsive web interface.",
      color: "from-pink-500 to-rose-600",
      features: ["Mobile friendly", "Web-based", "Cross-device"]
    }
  ];

  const techStack = [
    {
      category: "Frontend",
      technologies: [
        { name: "React 18", description: "Modern UI library with hooks" },
        { name: "TypeScript", description: "Type-safe development" },
        { name: "Tailwind CSS", description: "Utility-first styling" },
        { name: "Vite", description: "Lightning-fast bundler" },
        { name: "React Hook Form", description: "Performant forms" },
        { name: "Recharts", description: "Beautiful data visualization" }
      ]
    },
    {
      category: "Backend & Database",
      technologies: [
        { name: "Supabase", description: "PostgreSQL with real-time sync" },
        { name: "Row Level Security", description: "Database-level permissions" },
        { name: "Real-time Subscriptions", description: "Live data updates" },
        { name: "Edge Functions", description: "Serverless computing" }
      ]
    },
    {
      category: "AI & Recognition",
      technologies: [
        { name: "MobileFaceNet", description: "Lightweight face recognition" },
        { name: "ONNX Runtime", description: "Cross-platform AI inference" },
        { name: "WebRTC", description: "Real-time camera access" },
        { name: "TensorFlow.js", description: "Browser-based ML" }
      ]
    },
    {
      category: "Security & Performance",
      technologies: [
        { name: "JWT Authentication", description: "Secure token-based auth" },
        { name: "Encryption", description: "Data protection at rest" },
        { name: "Progressive Web App", description: "Native app experience" },
        { name: "Service Workers", description: "Offline functionality" }
      ]
    }
  ];

  const uniquePoints = [
    {
      icon: Brain,
      title: "Dual Verification",
      description: "Combines QR code scanning with optional face recognition for attendance verification."
    },
    {
      icon: Zap,
      title: "Cross-Platform Solution",
      description: "Currently available as a web application that works on any device. Native mobile apps coming soon for enhanced performance."
    },
    {
      icon: Lock,
      title: "Privacy Focused",
      description: "Face recognition processing happens in the browser, facial data is not permanently stored on servers."
    },
    {
      icon: Globe,
      title: "Easy Access",
      description: "Accessible from any device with a web browser and camera - no special hardware needed."
    },
    {
      icon: Award,
      title: "Open Source Approach",
      description: "Built using modern web technologies and open-source libraries for transparency and reliability."
    },
    {
      icon: Heart,
      title: "Educational Focus",
      description: "Designed specifically for educational institutions with features tailored for classroom environments."
    }
  ];

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'home') {
      // Scroll to top of page where QAttend logo starts
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Enhanced Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-900/5 dark:border-slate-700/10 dark:bg-slate-900/95 dark:shadow-slate-900/20">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            {/* Left side - Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => scrollToSection('home')}
                className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('demo-video')}
                className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                Demo Video
              </button>
              <button 
                onClick={() => scrollToSection('tech-stack')}
                className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                Tech Stack
              </button>
            </nav>

            {/* Center - Empty space for cleaner look */}
            <div className="flex-1"></div>

            {/* Right side - Theme Toggle and Get Started */}
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-blue-200 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-800 transition-all duration-200">
                    <User className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Get Started</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    <p className="text-sm font-medium">Student & Faculty</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/login')} className="cursor-pointer">
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Sign In</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/register')} className="cursor-pointer">
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Create Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    <p className="text-sm font-medium">Parent Access</p>
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate('/parent-login')} className="cursor-pointer">
                    <Phone className="mr-2 h-4 w-4" />
                    <span>Parent Dashboard</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex justify-center gap-4 mt-3 pt-3 border-t border-white/20 dark:border-slate-700/20">
            <button 
              onClick={() => scrollToSection('home')}
              className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors duration-200"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('features')}
              className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors duration-200"
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('demo-video')}
              className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors duration-200"
            >
              Demo Video
            </button>
            <button 
              onClick={() => scrollToSection('tech-stack')}
              className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors duration-200"
            >
              Tech Stack
            </button>
          </nav>
        </div>
      </header>

      {/* Logo and Brand Section */}
      <section className="pt-24 sm:pt-28 pb-6 sm:pb-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 sm:gap-5 mb-6 sm:mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-10"></div>
                <img src="/LOGO.png" alt="QAttend Logo" className="relative h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20 rounded-2xl shadow-2xl ring-2 ring-white/20 dark:ring-slate-700/20" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent drop-shadow-sm">
                  QAttend
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Hero Section */}
      <main id="home" className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="text-center max-w-6xl mx-auto">
          <div className="relative mb-6 sm:mb-8">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6 leading-tight px-2 sm:px-0">
              Automated Student{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Attendance System
                </span>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-30"></div>
              </span>
            </h2>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-12 sm:mb-16 leading-relaxed max-w-4xl mx-auto px-2 sm:px-0">
            A web-based attendance tracking system using QR codes and face recognition technology. 
            <br className="hidden sm:block" />
            Built for educational institutions.
          </p>

          {/* Comprehensive Features Section */}
          <section id="features" className="mb-16 sm:mb-24">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6">
                Features
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-0">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <Card key={index} className="group hover:shadow-2xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/40 transition-all duration-500 transform hover:-translate-y-3 border-slate-200/60 bg-white/90 backdrop-blur-sm dark:bg-slate-800/90 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-all duration-500`}></div>
                          <div className={`relative w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/10 dark:ring-slate-700/20`}>
                            <IconComponent className="h-6 w-6 text-white drop-shadow-sm" />
                          </div>
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                          {feature.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                        {feature.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2">
                        {feature.features.map((feat, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {feat}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Why Choose Us Section */}
          <section className="mb-16 sm:mb-24">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6">
                About
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                What makes this attendance system different
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-0">
              {uniquePoints.map((point, index) => {
                const IconComponent = point.icon;
                return (
                  <div key={index} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-600/5 rounded-2xl blur-2xl group-hover:from-blue-500/10 group-hover:to-purple-600/10 transition-all duration-500"></div>
                    <Card className="relative hover:shadow-2xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/40 transition-all duration-500 transform hover:-translate-y-3 border-slate-200/60 bg-white/95 backdrop-blur-sm dark:bg-slate-800/95 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                      <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/10 dark:ring-slate-700/20 group-hover:scale-110 transition-transform duration-300">
                            <IconComponent className="h-8 w-8 text-white drop-shadow-sm" />
                          </div>
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                          {point.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-slate-600 dark:text-slate-300 leading-relaxed text-center">
                          {point.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Demo Video Section */}
          <section id="demo-video" className="mb-16 sm:mb-24">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6">
                See QAttend in Action
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Watch how QAttend transforms attendance management in real educational environments
              </p>
            </div>
            
            <div className="relative max-w-4xl mx-auto px-4 sm:px-0">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                <div className="relative bg-white/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 dark:bg-slate-800/95">
                  {/* Video Placeholder - Replace with actual video embed */}
                  <div className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center relative group/video cursor-pointer hover:from-slate-100 hover:to-slate-150 dark:hover:from-slate-650 dark:hover:to-slate-750 transition-all duration-300">
                    <div className="absolute inset-0 bg-black/10 group-hover/video:bg-black/5 transition-colors duration-300"></div>
                    <div className="relative z-10 text-center">
                      <div className="w-20 h-20 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 mx-auto shadow-xl ring-4 ring-white/20 group-hover/video:scale-110 group-hover/video:ring-blue-500/30 transition-all duration-300">
                        <Play className="h-8 w-8 text-blue-600 ml-1 drop-shadow-sm" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Demo Video Coming Soon</h3>
                      <p className="text-slate-600 dark:text-slate-300">Experience QAttend's full capabilities</p>
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute top-6 left-6 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute bottom-6 right-6 w-12 h-12 bg-blue-500/20 rounded-full blur-lg"></div>
                  </div>
                  
                  {/* Video description */}
                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Quick Setup</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">5-minute implementation</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Instant Results</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Real-time attendance tracking</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Heart className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">User Friendly</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Intuitive for all ages</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Enhanced CTA Section */}
          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-8 sm:p-12 rounded-3xl shadow-2xl overflow-hidden mx-4 sm:mx-0">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-sm"></div>
              <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/10 rounded-full blur-lg"></div>
            </div>
            
            <div className="relative z-10 text-center text-white">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">Try the System</h3>
              <p className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 leading-relaxed opacity-90 max-w-2xl mx-auto px-2 sm:px-0">
                Test out the attendance system features and see how it works for your educational needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/register')} 
                  className="bg-white text-blue-600 hover:bg-gray-100 text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                >
                  Create Account
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => navigate('/login')} 
                  className="border-white border-2 text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 font-semibold transition-all duration-200 shadow-lg w-full sm:w-auto"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 mt-16 sm:mt-24">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Tech Stack Section */}
          <section id="tech-stack" className="mb-8 sm:mb-12">
            <div className="text-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">
                Technology Stack
              </h2>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {techStack.map((category, index) => (
                  <div key={index} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-white/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 dark:bg-slate-800/80 rounded-2xl p-4 text-center hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/40 hover:-translate-y-1 transition-all duration-500 ring-1 ring-slate-200/40 dark:ring-slate-700/40">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                        {category.category}
                      </h3>
                      <div className="space-y-2">
                        {category.technologies.map((tech, techIndex) => (
                          <div key={techIndex} className="text-xs text-slate-600 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200 transition-colors duration-200">
                            {tech.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Footer Content */}
          <div className="text-center border-t border-slate-200/60 dark:border-slate-700/60 pt-6 sm:pt-8">
            <div className="relative group max-w-sm mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-white/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 dark:bg-slate-800/60 rounded-2xl p-6 shadow-xl ring-1 ring-slate-200/40 dark:ring-slate-700/40">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-sm opacity-50"></div>
                    <img src="/LOGO.png" alt="QAttend Logo" className="relative h-6 w-6 sm:h-8 sm:w-8 rounded-lg ring-2 ring-white/30" />
                  </div>
                  <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
                    QAttend
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-200 mb-2 text-sm sm:text-base font-medium">Smart Attendance Solution for Modern Education</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">&copy; 2025 QAttend. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;