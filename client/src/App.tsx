import { useState, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NotFound from "@/pages/not-found";
import LoginPage from "@/components/LoginPage";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/common/NotificationBell";
import AppSidebar from "@/components/AppSidebar";
import DashboardStats from "@/components/DashboardStats";
import PatientList from "@/components/PatientList";
import ReportsList from "@/components/ReportsList";
import ClinicCard from "@/components/ClinicCard";
import UserProfileCard from "@/components/UserProfileCard";
import PatientChatbot from "@/components/PatientChatbot";
import FloatingChatbot from "@/components/FloatingChatbot";
import DentocadPage from "@/pages/DentocadPage";
import TreatmentPlansPage from "@/pages/TreatmentPlansPage";
import TreatmentPlanDetailPage from "@/pages/TreatmentPlanDetailPage";
import AppointmentBookingPageNew from "@/pages/AppointmentBookingPageNew";
import DoctorManagementPage from "@/pages/DoctorManagementPage";
import MedicalRecordsPage from "@/pages/MedicalRecordsPage";
import RatingsPage from "@/pages/RatingsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SearchPage from "@/pages/SearchPage";
import PaymentPageNew from "@/pages/PaymentPageNew";
import AIDiagnosisPage from "@/pages/AIDiagnosisPage";
import DiagnosisHistoryPage from "@/pages/DiagnosisHistoryPage";
import AdminPanelPage from "@/pages/AdminPanelPage";
import SettingsPage from "@/pages/SettingsPage";
import SupportTicketsPage from "@/pages/SupportTicketsPage";
import FinancialManagementPage from "@/pages/FinancialManagementPage";
import ClinicsOverviewPage from "@/pages/ClinicsOverviewPage";
import ClinicDetailPageNew from "@/pages/ClinicDetailPage";
import HomePage from "@/pages/HomePage";
import ReportsPage from "@/pages/ReportsPage";
import ChatBotPage from "@/pages/ChatBotPage";
import VoiceChatPage from "@/pages/VoiceChatPage";
import MyAppointmentsPage from "@/pages/MyAppointmentsPage";
import MedicationsPage from "@/pages/MedicationsPage";
import MyReviewsPage from "@/pages/MyReviewsPage";
import SignUpPage from "@/pages/SignUpPage";
import TodayAppointmentsPage from "@/components/TodayAppointmentsPage";
import PriceManagementPage from "@/components/PriceManagementPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import { getClinicBySlug } from "@/constants/clinics";
import { ProtectedRoute, AdminRoute, DoctorRoute, MedicalStaffRoute, PatientRoute, DoctorOnlyRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Stethoscope, Syringe, Scissors, Layers, Building2, Moon, Sun, Activity, Sparkles, Baby, Smile, User, Globe, MessageCircle, ArrowLeft, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Initialize from localStorage or system preference
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme on mount
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

function LanguageToggle({ language, onLanguageChange }: { language: "ar" | "en"; onLanguageChange: (lang: "ar" | "en") => void }) {
  const toggleLanguage = () => {
    const newLang: "ar" | "en" = language === "ar" ? "en" : "ar";
    onLanguageChange(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      data-testid="button-language-toggle"
      title={language === "ar" ? "English" : "العربية"}
    >
      <Globe className="h-5 w-5" />
      <span className="text-xs ms-1">{language === "ar" ? "EN" : "AR"}</span>
    </Button>
  );
}

// Internal components removed - using modular pages from @/pages/*

// Legacy internal components removed - using modular pages from @/pages/*

interface CustomPage {
  id: string;
  name: string;
  content: string;
  icon: string;
}

// Router component removed - routing consolidated in Dashboard

function Dashboard() {
  // Use AuthContext for centralized auth state that persists on refresh
  const { isAuthenticated, userType, userId, userName, login, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const activePage = location.substring(1) || "home";

  const { language, setLanguage } = useLanguage();
  const [customPages, setCustomPages] = useState([
    { id: "1", name: "ملفي الطبي", content: "معلومات صحتي الشاملة", icon: "Heart" },
    { id: "2", name: "تقاريري", content: "جميع التقارير الطبية", icon: "FileText" },
  ]);

  // Navigation History Management removed - using wouter's history
  const [isLoading, setIsLoading] = useState(false);

  // Login handler now just needs to refetch - API call happens in LoginPage
  const handleLogin = async () => {
    await login(); // Refetch user from server
  };

  const handleNavigate = (page: string) => {
    const path = page.startsWith("/") ? page : `/${page}`;
    if (location === path) return;

    setIsLoading(true);
    setTimeout(() => {
      setLocation(path);
      setIsLoading(false);
    }, 100);
  };

  const goBack = () => {
    window.history.back();
  };

  const goHome = () => {
    setLocation("/home");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + ArrowLeft = Go Back
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
      // Ctrl/Cmd + Home = Go to Home
      if ((e.ctrlKey || e.metaKey) && e.key === "Home") {
        e.preventDefault();
        goHome();
      }
      // Escape = Go Back
      if (e.key === "Escape" && activePage !== "home") {
        e.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePage]);

  const getBreadcrumbs = () => {
    // Breadcrumb translations
    const breadcrumbTranslations = {
      ar: {
        home: "الرئيسية",
        clinics: "العيادات الطبية",
        clinic: "العيادة",
        treatmentPlans: "الخطط العلاجية",
        reports: "التقارير والإحصائيات",
        settings: "الإعدادات",
        planDetails: "تفاصيل الخطة",
        appointments: "حجز المواعيد",
        doctors: "الأطباء",
        medicalRecords: "السجل الطبي",
        ratings: "التقييمات",
        notifications: "الإشعارات",
        search: "البحث",
        payment: "الفواتير والدفع",
        doctorPanel: "لوحة تحكم الطبيب",
        adminPanel: "لوحة تحكم المسؤول",
        supportTickets: "تذاكر الدعم",
        financial: "الإدارة المالية",
        chat: "Dento - مساعدك الطبي",
        aiDiagnosis: "التشخيص الذكي",
        todayAppointments: "مواعيد اليوم",
        priceManagement: "إدارة الأسعار",
        patients: "المرضى",
      },
      en: {
        home: "Home",
        clinics: "Clinics",
        clinic: "Clinic",
        treatmentPlans: "Treatment Plans",
        reports: "Reports & Analytics",
        settings: "Settings",
        planDetails: "Plan Details",
        appointments: "Book Appointment",
        doctors: "Doctors",
        medicalRecords: "Medical Records",
        ratings: "Ratings",
        notifications: "Notifications",
        search: "Search",
        payment: "Billing & Payment",
        doctorPanel: "Doctor Panel",
        adminPanel: "Admin Panel",
        supportTickets: "Support Tickets",
        financial: "Financial Management",
        chat: "Dento - Your Medical Assistant",
        aiDiagnosis: "AI Diagnosis",
        todayAppointments: "Today's Appointments",
        priceManagement: "Price Management",
        patients: "Patients",
      },
    };

    const t = breadcrumbTranslations[language];

    const breadcrumbs = [{ name: t.home, path: "home" }];

    if (activePage.startsWith("clinic/")) {
      breadcrumbs.push({ name: t.clinics, path: "clinics" });
      const clinicId = activePage.replace("clinic/", "");
      const clinic = getClinicBySlug(clinicId);
      breadcrumbs.push({
        name: clinic ? (language === "ar" ? clinic.nameAr : clinic.nameEn) : t.clinic,
        path: activePage,
      });
    } else if (activePage === "treatment-plans") {
      breadcrumbs.push({ name: t.treatmentPlans, path: activePage });
    } else if (activePage === "reports") {
      breadcrumbs.push({ name: t.reports, path: activePage });
    } else if (activePage === "dentocad") {
      breadcrumbs.push({ name: "Dentocad", path: activePage });
    } else if (activePage === "settings") {
      breadcrumbs.push({ name: t.settings, path: activePage });
    } else if (activePage === "treatment-plan-detail") {
      breadcrumbs.push({ name: t.treatmentPlans, path: "treatment-plans" });
      breadcrumbs.push({ name: t.planDetails, path: activePage });
    } else if (activePage === "appointments") {
      breadcrumbs.push({ name: t.appointments, path: activePage });
    } else if (activePage === "doctors") {
      breadcrumbs.push({ name: t.doctors, path: activePage });
    } else if (activePage === "medical-records") {
      breadcrumbs.push({ name: t.medicalRecords, path: activePage });
    } else if (activePage === "ratings") {
      breadcrumbs.push({ name: t.ratings, path: activePage });
    } else if (activePage === "notifications") {
      breadcrumbs.push({ name: t.notifications, path: activePage });
    } else if (activePage === "search") {
      breadcrumbs.push({ name: t.search, path: activePage });
    } else if (activePage === "payment") {
      breadcrumbs.push({ name: t.payment, path: activePage });
    } else if (activePage === "doctor-panel") {
      breadcrumbs.push({ name: t.doctorPanel, path: activePage });
    } else if (activePage === "admin-panel") {
      breadcrumbs.push({ name: t.adminPanel, path: activePage });
    } else if (activePage === "support-tickets") {
      breadcrumbs.push({ name: t.supportTickets, path: activePage });
    } else if (activePage === "financial") {
      breadcrumbs.push({ name: t.financial, path: activePage });
    } else if (activePage === "chat") {
      breadcrumbs.push({ name: t.chat, path: activePage });
    } else if (activePage === "clinics") {
      breadcrumbs.push({ name: t.clinics, path: activePage });
    } else if (activePage === "ai-diagnosis") {
      breadcrumbs.push({ name: t.aiDiagnosis, path: activePage });
    } else if (activePage === "today-appointments") {
      breadcrumbs.push({ name: t.todayAppointments, path: activePage });
    } else if (activePage === "price-management") {
      breadcrumbs.push({ name: t.priceManagement, path: activePage });
    } else if (activePage === "patients") {
      breadcrumbs.push({ name: t.patients, path: activePage });
    }

    return breadcrumbs;
  };

  const [showSignUp, setShowSignUp] = useState(false);

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showSignUp) {
      return <SignUpPage
        onSignUp={async () => {
          await handleLogin(); // Refetch user after successful signup
          setShowSignUp(false);
        }}
        onLoginClick={() => setShowSignUp(false)}
      />;
    }
    return <LoginPage onLogin={handleLogin} onSignUpClick={() => setShowSignUp(true)} />;
  }

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" dir={language === "ar" ? "rtl" : "ltr"}>
        <AppSidebar customPages={customPages} userType={userType} language={language} />
        <div className="flex flex-col flex-1">
          {/* Header with Navigation Controls */}
          <header className="flex items-center justify-between p-4 border-b bg-card gap-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />

              {/* Back Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                title="رجوع (Alt+←)"
                data-testid="button-back"
                className="transition-all hover-elevate"
              >
                {language === "ar" ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>

              {/* Home Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goHome}
                title="الرئيسية (Ctrl+Home)"
                data-testid="button-home"
                className="transition-all hover-elevate"
              >
                <Home className="h-5 w-5" />
              </Button>

              {/* Breadcrumbs */}
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.path} className="flex items-center gap-1">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {index === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage className="font-semibold">{crumb.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            className="cursor-pointer hover-elevate transition-all rounded px-2 py-1 text-start"
                            onClick={() => handleNavigate(crumb.path)}
                            data-testid={`breadcrumb-${crumb.path}`}
                          >
                            {crumb.name}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-end hidden sm:block">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "ar"
                    ? (userType === "patient" ? "مريض" : userType === "doctor" ? "طبيب" : userType === "student" ? "طالب" : userType === "graduate" ? "إمتياز" : "مسؤول")
                    : (userType === "patient" ? "Patient" : userType === "doctor" ? "Doctor" : userType === "student" ? "Student" : userType === "graduate" ? "Graduate" : "Admin")
                  }
                </p>
              </div>
              <Avatar data-testid="avatar-user">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <NotificationBell language={language} onNotificationClick={(page) => handleNavigate(page)} />
              <LanguageToggle language={language} onLanguageChange={setLanguage} />
              <ThemeToggle />
            </div>
          </header>
          <main className={`flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900 ${isLoading ? 'opacity-50 pointer-events-none' : 'page-transition'}`}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                  <p className="text-muted-foreground">جاري التحميل...</p>
                </div>
              </div>
            ) : (
              <>
                <Switch>
                  <Route path="/home">
                    <HomePage userName={userName} userType={userType} userId={userId} onNavigate={handleNavigate} language={language} />
                  </Route>
                  <Route path="/treatment-plans">
                    <PatientRoute>
                      <TreatmentPlansPage />
                    </PatientRoute>
                  </Route>
                  <Route path="/dentocad">
                    <DentocadPage />
                  </Route>
                  <Route path="/treatment-plan-detail">
                    <TreatmentPlanDetailPage onBackClick={() => handleNavigate("treatment-plans")} />
                  </Route>
                  {/* Patient-Only Routes */}
                  <Route path="/my-appointments">
                    <PatientRoute>
                      <MyAppointmentsPage />
                    </PatientRoute>
                  </Route>

                  <Route path="/my-medications">
                    <PatientRoute>
                      <MedicationsPage />
                    </PatientRoute>
                  </Route>

                  <Route path="/my-reviews">
                    <PatientRoute>
                      <MyReviewsPage />
                    </PatientRoute>
                  </Route>

                  <Route path="/appointments">
                    <PatientRoute>
                      <AppointmentBookingPageNew />
                    </PatientRoute>
                  </Route>
                  <Route path="/doctors">
                    <DoctorManagementPage />
                  </Route>
                  <Route path="/medical-records">
                    <MedicalRecordsPage />
                  </Route>
                  <Route path="/ratings">
                    <RatingsPage />
                  </Route>
                  <Route path="/notifications">
                    <NotificationsPage />
                  </Route>
                  <Route path="/search">
                    <SearchPage />
                  </Route>
                  <Route path="/payment">
                    <PatientRoute>
                      <PaymentPageNew />
                    </PatientRoute>
                  </Route>
                  <Route path="/support-tickets">
                    <SupportTicketsPage />
                  </Route>
                  <Route path="/financial">
                    <FinancialManagementPage />
                  </Route>
                  <Route path="/reports">
                    <ReportsPage />
                  </Route>
                  <Route path="/chat">
                    <ChatBotPage />
                  </Route>
                  <Route path="/voice-chat">
                    <VoiceChatPage />
                  </Route>
                  <Route path="/ai-diagnosis">
                    <AIDiagnosisPage />
                  </Route>
                  <Route path="/diagnosis-history">
                    <PatientRoute>
                      <DiagnosisHistoryPage />
                    </PatientRoute>
                  </Route>
                  {/* Medical Staff Routes */}
                  <Route path="/today-appointments">
                    <MedicalStaffRoute allowedRoles={['doctor', 'graduate']}>
                      <TodayAppointmentsPage language={language} />
                    </MedicalStaffRoute>
                  </Route>
                  {/* Doctor-Only Routes */}
                  <Route path="/price-management">
                    <DoctorOnlyRoute>
                      <PriceManagementPage language={language} />
                    </DoctorOnlyRoute>
                  </Route>
                  <Route path="/patients">
                    <MedicalStaffRoute>
                      <PatientList clinicName="الكل" onViewPatient={() => { }} />
                    </MedicalStaffRoute>
                  </Route>
                  <Route path="/clinics">
                    <ClinicsOverviewPage onNavigate={(page) => handleNavigate(page)} />
                  </Route>
                  <Route path="/clinic/:id">
                    {(params) => <ClinicDetailPageNew clinicId={params.id} onNavigate={(page) => handleNavigate(page)} />}
                  </Route>
                  <Route path="/settings">
                    <SettingsPage customPages={customPages} setCustomPages={setCustomPages} />
                  </Route>

                  {/* Admin-Only Routes */}
                  <Route path="/admin-panel">
                    {/* FIX (H6): AdminPanelPage was imported but had no Route — admin had NO UI. */}
                    <AdminRoute>
                      <AdminPanelPage />
                    </AdminRoute>
                  </Route>

                  {/* Unauthorized Page */}
                  <Route path="/unauthorized">
                    <UnauthorizedPage />
                  </Route>

                  <Route path="/">
                    <HomePage userName={userName} userType={userType} userId={userId} onNavigate={handleNavigate} language={language} />
                  </Route>
                  <Route component={NotFound} />
                </Switch>
                {userType === "patient" && <FloatingChatbot patientName={userName} />}
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function DirectionalAppShell() {
  const { language } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <DirectionProvider dir={dir}>
      <TooltipProvider>
        <Dashboard />
        <Toaster />
      </TooltipProvider>
    </DirectionProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <LanguageProvider>
            <DirectionalAppShell />
          </LanguageProvider>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
