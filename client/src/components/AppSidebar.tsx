import { Home, Hospital, Calendar, SquareCode, Clock, Users, FileTextIcon, Star, Search, CreditCard, Wand2, Brain, ClipboardList, DollarSign, CalendarCheck, Settings, Shield } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

interface AppSidebarProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
  customPages?: Array<{ id: string; name: string; content: string; icon: string }>;
  userType?: string;
  language?: "ar" | "en";
}

export default function AppSidebar({ customPages = [], userType = "patient", language = "ar" }: AppSidebarProps) {
  const [location] = useLocation();
  const activePage = location.substring(1) || "home";

  // handleClick removed - using Link components directly

  const isPatient = userType === "patient";
  const isDoctor = userType === "doctor";
  const isStudent = userType === "student";
  const isGraduate = userType === "graduate";
  const isAdmin = userType === "admin";
  const isStaff = isDoctor || isStudent || isGraduate;

  const translations = {
    ar: {
      adminPanel: "لوحة تحكم المسؤول",
      mainMenu: "القائمة الرئيسية",
      home: "الرئيسية",
      aiDiagnosis: "التشخيص الذكي",
      diagnosisHistory: "سجل التشخيص الذكي",
      clinicDetails: "تفاصيل العيادات",
      treatmentPlans: "الخطة العلاجية للمريض",
      dentocad: "Dentocad",
      myAppointments: "مواعيدي",
      bookAppointment: "حجز المواعيد",
      myMedications: "أدويتي",
      myReviews: "تقييماتي",
      doctors: "الأطباء",
      medicalRecords: "السجل الطبي",
      ratings: "التقييمات",
      search: "البحث",
      payment: "الفواتير والدفع",
      chat: "Dento الذكي",
      todayAppointments: "مواعيد اليوم",
      priceManagement: "إدارة الأسعار",
      patients: "المرضى",
      settings: "الإعدادات",
      university: "جامعة الدلتا للعلوم والتكنولوجيا",
    },
    en: {
      adminPanel: "Admin Panel",
      mainMenu: "Main Menu",
      home: "Home",
      aiDiagnosis: "AI Diagnosis",
      diagnosisHistory: "Diagnosis History",
      clinicDetails: "Clinic Details",
      treatmentPlans: "Treatment Plans",
      dentocad: "Dentocad",
      myAppointments: "My Appointments",
      bookAppointment: "Book Appointment",
      myMedications: "My Medications",
      myReviews: "My Reviews",
      doctors: "Doctors",
      medicalRecords: "Medical Records",
      ratings: "Ratings",
      search: "Search",
      payment: "Billing & Payment",
      chat: "Smart Dento",
      todayAppointments: "Today's Appointments",
      priceManagement: "Price Management",
      patients: "Patients",
      settings: "Settings",
      university: "Delta University of Science and Technology",
    },
  };

  const t = translations[language];

  return (
    <Sidebar side={language === "ar" ? "right" : "left"} collapsible="offcanvas">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Hospital className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Dento Health Care</h2>
            <p className="text-xs text-[#ffffff]">{t.university}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.mainMenu}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePage === "home"}
                  data-testid="nav-home"
                >
                  <Link href="/home">
                    <Home className="w-4 h-4" />
                    <span>{t.home}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* FIX (H6): Admin-only nav item. Previously AdminPanelPage had no route and no sidebar link. */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "admin-panel"}
                    data-testid="nav-admin-panel"
                    className="font-semibold bg-gradient-to-r from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20"
                  >
                    <Link href="/admin-panel">
                      <Shield className="w-4 h-4 text-red-600" />
                      <span>{t.adminPanel}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isStaff && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "today-appointments"}
                    data-testid="nav-today-appointments"
                    className="font-semibold bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20"
                  >
                    <Link href="/today-appointments">
                      <CalendarCheck className="w-4 h-4 text-green-600" />
                      <span>{t.todayAppointments}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isStaff && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "patients"}
                    data-testid="nav-patients"
                  >
                    <Link href="/patients">
                      <Users className="w-4 h-4" />
                      <span>{t.patients}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isDoctor && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "price-management"}
                    data-testid="nav-price-management"
                  >
                    <Link href="/price-management">
                      <DollarSign className="w-4 h-4" />
                      <span>{t.priceManagement}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePage === "ai-diagnosis"}
                  data-testid="nav-ai-diagnosis"
                  className="font-semibold bg-gradient-to-r from-primary/10 to-blue-500/10 hover:from-primary/20 hover:to-blue-500/20"
                >
                  <Link href="/ai-diagnosis">
                    <Brain className="w-4 h-4 text-primary" />
                    <span>{t.aiDiagnosis}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "diagnosis-history"}
                    data-testid="nav-diagnosis-history"
                  >
                    <Link href="/diagnosis-history">
                      <ClipboardList className="w-4 h-4" />
                      <span>{t.diagnosisHistory}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePage === "clinics" || activePage.startsWith("clinic/")}
                  data-testid="nav-clinic-details"
                >
                  <Link href="/clinics">
                    <Hospital className="w-4 h-4" />
                    <span>{t.clinicDetails}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "treatment-plans"}
                    data-testid="nav-treatment-plans"
                  >
                    <Link href="/treatment-plans">
                      <ClipboardList className="w-4 h-4" />
                      <span>{t.treatmentPlans}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "dentocad"}
                    data-testid="nav-dentocad"
                  >
                    <Link href="/dentocad">
                      <SquareCode className="w-4 h-4" />
                      <span>{t.dentocad}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "appointments"}
                    data-testid="nav-appointments"
                  >
                    <Link href="/appointments">
                      <Clock className="w-4 h-4" />
                      <span>{t.bookAppointment}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "my-appointments"}
                    data-testid="nav-my-appointments"
                  >
                    <Link href="/my-appointments">
                      <Calendar className="w-4 h-4" />
                      <span>{t.myAppointments}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "my-medications"}
                    data-testid="nav-my-medications"
                  >
                    <Link href="/my-medications">
                      <FileTextIcon className="w-4 h-4" />
                      <span>{t.myMedications}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "my-reviews"}
                    data-testid="nav-my-reviews"
                  >
                    <Link href="/my-reviews">
                      <Star className="w-4 h-4" />
                      <span>{t.myReviews}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePage === "doctors"}
                  data-testid="nav-doctors"
                >
                  <Link href="/doctors">
                    <Users className="w-4 h-4" />
                    <span>{t.doctors}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "medical-records"}
                    data-testid="nav-medical-records"
                  >
                    <Link href="/medical-records">
                      <FileTextIcon className="w-4 h-4" />
                      <span>{t.medicalRecords}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePage === "ratings"}
                  data-testid="nav-ratings"
                >
                  <Link href="/ratings">
                    <Star className="w-4 h-4" />
                    <span>{t.ratings}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePage === "search"}
                  data-testid="nav-search"
                >
                  <Link href="/search">
                    <Search className="w-4 h-4" />
                    <span>{t.search}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isPatient && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === "payment"}
                    data-testid="nav-payment"
                  >
                    <Link href="/payment">
                      <CreditCard className="w-4 h-4" />
                      <span>{t.payment}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePage === "chat"}
                  data-testid="nav-chat"
                  className="font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-500 dark:to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Link href="/chat">
                    <Wand2 className="w-4 h-4" />
                    <span>{t.chat}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePage === "settings"}
                  data-testid="nav-settings"
                >
                  <Link href="/settings">
                    <Settings className="w-4 h-4" />
                    <span>{t.settings}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
