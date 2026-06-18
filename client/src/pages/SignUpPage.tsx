import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, GraduationCap, Users, Stethoscope, Globe, Moon, Sun, Volume2, Eye, EyeOff, AlertTriangle, Check, HelpCircle, ArrowRight, UserPlus, Phone, Mail, Calendar, IdCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

const loginBg = "/attached_assets/stock_images/modern_dental_hospit_e3518571.jpg";

interface SignUpPageProps {
  onSignUp?: () => Promise<void>; // Just trigger refetch after successful signup
  onLoginClick?: () => void;
}

interface BackendValidationError {
  field?: string;
  message?: string;
}

interface RegisterErrorResponse {
  message?: string;
  messageEn?: string;
  errors?: BackendValidationError[];
}

export default function SignUpPage({ onSignUp, onLoginClick }: SignUpPageProps) {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<string>("patient");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    nationalId: "",
    dateOfBirth: "",
    gender: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [isDark, setIsDark] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const userTypes = [
    { value: "patient", label: "مريض", labelEn: "Patient", icon: UserCircle },
    { value: "student", label: "طالب", labelEn: "Student", icon: GraduationCap },
    { value: "graduate", label: "إمتياز", labelEn: "Excellence", icon: Users },
  ];

  const translations = {
    ar: {
      title: "إنشاء حساب جديد",
      subtitle: "انضم إلى Dento Health Care",
      userType: "نوع المستخدم",
      step1: "نوع الحساب",
      step2: "البيانات الشخصية",
      step3: "بيانات الدخول",
      fullName: "الاسم الكامل",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      nationalId: "الرقم القومي",
      dateOfBirth: "تاريخ الميلاد",
      gender: "الجنس",
      male: "ذكر",
      female: "أنثى",
      username: "اسم المستخدم",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      next: "التالي",
      back: "رجوع",
      createAccount: "إنشاء الحساب",
      haveAccount: "لديك حساب بالفعل؟",
      login: "تسجيل الدخول",
      acceptTerms: "أوافق على الشروط والأحكام",
      required: "هذا الحقل مطلوب",
      invalidEmail: "البريد الإلكتروني غير صالح",
      invalidPhone: "رقم الهاتف غير صالح",
      passwordMismatch: "كلمة المرور غير متطابقة",
      passwordWeak: "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم",
      success: "تم إنشاء الحساب بنجاح!",
      enterFullName: "أدخل الاسم الكامل",
      enterEmail: "أدخل البريد الإلكتروني",
      enterPhone: "أدخل رقم الهاتف",
      enterNationalId: "أدخل الرقم القومي",
      enterUsername: "أدخل اسم المستخدم",
      enterPassword: "أدخل كلمة المرور",
      enterConfirmPassword: "أعد إدخال كلمة المرور",
      selectGender: "اختر الجنس",
    },
    en: {
      title: "Create New Account",
      subtitle: "Join Dento Health Care",
      userType: "User Type",
      step1: "Account Type",
      step2: "Personal Information",
      step3: "Login Credentials",
      fullName: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      nationalId: "National ID",
      dateOfBirth: "Date of Birth",
      gender: "Gender",
      male: "Male",
      female: "Female",
      username: "Username",
      password: "Password",
      confirmPassword: "Confirm Password",
      next: "Next",
      back: "Back",
      createAccount: "Create Account",
      haveAccount: "Already have an account?",
      login: "Sign In",
      acceptTerms: "I accept the terms and conditions",
      required: "This field is required",
      invalidEmail: "Invalid email address",
      invalidPhone: "Invalid phone number",
      passwordMismatch: "Passwords do not match",
      passwordWeak: "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      success: "Account created successfully!",
      enterFullName: "Enter full name",
      enterEmail: "Enter email address",
      enterPhone: "Enter phone number",
      enterNationalId: "Enter national ID",
      enterUsername: "Enter username",
      enterPassword: "Enter password",
      enterConfirmPassword: "Re-enter password",
      selectGender: "Select gender",
    },
  };

  const t = translations[language];

  const isPasswordStrong = (password: string) =>
    password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);

  const getLocalizedBackendError = (field: string, message?: string) => {
    if (field === "password") return t.passwordWeak;
    if (field === "username") {
      if (message?.toLowerCase().includes("at least 3")) {
        return language === "ar" ? "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" : "Username must be at least 3 characters";
      }
      return language === "ar" ? "اسم المستخدم غير صالح" : "Invalid username";
    }
    if (field === "fullName") return language === "ar" ? "الاسم الكامل مطلوب" : "Full name is required";
    if (field === "email") return t.invalidEmail;
    if (field === "phone") return t.invalidPhone;
    return message || (language === "ar" ? "تعذر إنشاء الحساب، يرجى مراجعة البيانات" : "Could not create account. Please check your details.");
  };

  const buildRegisterErrors = (data: RegisterErrorResponse) => {
    const nextErrors: Record<string, string> = {};

    data.errors?.forEach(({ field = "", message }) => {
      const rootField = field.split(".")[0];
      if (!rootField) return;
      nextErrors[rootField] = getLocalizedBackendError(rootField, message);
    });

    if (Object.keys(nextErrors).length > 0) {
      return nextErrors;
    }

    const message = language === "ar" ? data.message : data.messageEn || data.message;
    const normalizedMessage = `${data.message ?? ""} ${data.messageEn ?? ""}`.toLowerCase();

    if (normalizedMessage.includes("email") || normalizedMessage.includes("البريد")) {
      nextErrors.email = message || (language === "ar" ? "البريد الإلكتروني مستخدم بالفعل" : "Email already in use");
    } else if (normalizedMessage.includes("username") || normalizedMessage.includes("اسم المستخدم")) {
      nextErrors.username = message || (language === "ar" ? "اسم المستخدم مستخدم بالفعل" : "Username already in use");
    } else {
      nextErrors.username = message || (language === "ar" ? "حدث خطأ أثناء إنشاء الحساب" : "Error creating account");
    }

    return nextErrors;
  };

  const updateFormData = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = t.required;
    if (!formData.email.trim()) {
      newErrors.email = t.required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.invalidEmail;
    }
    if (!formData.phone.trim()) {
      newErrors.phone = t.required;
    } else if (!/^01[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = t.invalidPhone;
    }
    if (!formData.gender) newErrors.gender = t.required;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.username.trim()) newErrors.username = t.required;
    if (!formData.password.trim()) {
      newErrors.password = t.required;
    } else if (!isPasswordStrong(formData.password)) {
      newErrors.password = t.passwordWeak;
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t.passwordMismatch;
    }
    if (!acceptTerms) newErrors.terms = t.required;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 2 && !validateStep2()) return;
    if (step < 3) {
      setErrors({});
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setErrors({});
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          userType: userType,
        }),
      });

      const data = await response.json() as RegisterErrorResponse;

      if (!response.ok) {
        const nextErrors = buildRegisterErrors(data);
        setErrors(nextErrors);
        if (nextErrors.fullName || nextErrors.email || nextErrors.phone) {
          setStep(2);
        }
        setIsLoading(false);
        return;
      }

      // Success! Notify parent to refetch user data
      if (onSignUp) {
        await onSignUp();
      }
    } catch (error) {
      setErrors({ username: language === "ar" ? "حدث خطأ في الاتصال بالخادم" : "Server connection error" });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center">
          <motion.div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s === step
                ? "bg-primary text-white"
                : s < step
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            animate={{ scale: s === step ? 1.1 : 1 }}
          >
            {s < step ? <Check className="w-4 h-4" /> : s}
          </motion.div>
          {s < 3 && (
            <div
              className={`w-12 h-1 mx-1 rounded ${s < step ? "bg-green-500" : "bg-muted"
                }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden dental-pattern`}>
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBg})` }}
        >
          <div className="absolute inset-0 dental-gradient opacity-95"></div>
        </div>
        <motion.div
          className="absolute top-10 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, delay: 0.5 }}
        />
      </div>

      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setIsDark(!isDark); document.documentElement.classList.toggle("dark"); }}
          className="bg-white/20 hover:bg-white/30 text-white rounded-full"
          data-testid="button-toggle-theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="bg-white/20 hover:bg-white/30 text-white rounded-full"
          data-testid="button-toggle-language"
        >
          <Globe className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if ('speechSynthesis' in window) {
              const text = language === "ar" ? "أنشئ حسابك الجديد في دينتو هيلث كير" : "Create your new account at Dento Health Care";
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = language === "ar" ? "ar-SA" : "en-US";
              window.speechSynthesis.speak(utterance);
            }
          }}
          className="bg-white/20 hover:bg-white/30 text-white rounded-full"
          data-testid="button-text-to-speech"
        >
          <Volume2 className="w-5 h-5" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`w-full max-w-lg mx-4 relative z-10 ${language === "en" ? "ltr" : "rtl"}`}
        dir={language === "en" ? "ltr" : "rtl"}
      >
        <Card className="shadow-2xl backdrop-blur-md border border-white/20 dark:border-white/10 bg-white/95 dark:bg-slate-950/80">
          <CardHeader className="text-center space-y-2 pb-4 bg-gradient-to-b from-primary/5 to-transparent dark:from-primary/10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2"
            >
              <UserPlus className="w-8 h-8 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-primary">{t.title}</CardTitle>
            <CardDescription className="text-base">{t.subtitle}</CardDescription>
          </CardHeader>

          <CardContent>
            {renderStepIndicator()}

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-4"
                  >
                    <Label className="text-base font-semibold">{t.userType}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {userTypes.map(({ value, label, labelEn, icon: Icon }, idx) => (
                        <motion.div
                          key={value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.3, delay: idx * 0.1 }}
                        >
                          <Card
                            onClick={() => setUserType(value)}
                            className={`cursor-pointer transition-all duration-300 ${userType === value
                                ? "border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg"
                                : "border hover:border-primary/50"
                              }`}
                            data-testid={`card-signup-${value}`}
                          >
                            <CardContent className="flex flex-col items-center justify-center p-4">
                              <Icon className={`w-8 h-8 mb-2 transition-colors ${userType === value ? "text-primary" : "text-muted-foreground"}`} />
                              <span className={`font-medium text-sm ${userType === value ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                                {language === "ar" ? label : labelEn}
                              </span>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4" />
                        {t.fullName}
                      </Label>
                      <Input
                        id="fullName"
                        placeholder={t.enterFullName}
                        value={formData.fullName}
                        onChange={(e) => updateFormData("fullName", e.target.value)}
                        className={errors.fullName ? "border-red-500" : ""}
                        data-testid="input-fullname"
                      />
                      {errors.fullName && <p className="text-sm text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.fullName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {t.email}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.enterEmail}
                        value={formData.email}
                        onChange={(e) => updateFormData("email", e.target.value)}
                        className={errors.email ? "border-red-500" : ""}
                        data-testid="input-email"
                      />
                      {errors.email && <p className="text-sm text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t.phone}
                      </Label>
                      <Input
                        id="phone"
                        placeholder={t.enterPhone}
                        value={formData.phone}
                        onChange={(e) => updateFormData("phone", e.target.value)}
                        className={errors.phone ? "border-red-500" : ""}
                        data-testid="input-phone"
                      />
                      {errors.phone && <p className="text-sm text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.phone}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {t.dateOfBirth}
                        </Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => updateFormData("dateOfBirth", e.target.value)}
                          data-testid="input-dob"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">{t.gender}</Label>
                        <Select value={formData.gender} onValueChange={(v) => updateFormData("gender", v)}>
                          <SelectTrigger className={errors.gender ? "border-red-500" : ""} data-testid="select-gender">
                            <SelectValue placeholder={t.selectGender} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t.male}</SelectItem>
                            <SelectItem value="female">{t.female}</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.gender && <p className="text-sm text-red-500">{errors.gender}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nationalId" className="flex items-center gap-2">
                        <IdCard className="w-4 h-4" />
                        {t.nationalId}
                      </Label>
                      <Input
                        id="nationalId"
                        placeholder={t.enterNationalId}
                        value={formData.nationalId}
                        onChange={(e) => updateFormData("nationalId", e.target.value)}
                        data-testid="input-nationalid"
                      />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="username">{t.username}</Label>
                      <Input
                        id="username"
                        placeholder={t.enterUsername}
                        value={formData.username}
                        onChange={(e) => updateFormData("username", e.target.value)}
                        className={errors.username ? "border-red-500" : ""}
                        data-testid="input-signup-username"
                      />
                      {errors.username && <p className="text-sm text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.username}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t.password}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t.enterPassword}
                          value={formData.password}
                          onChange={(e) => updateFormData("password", e.target.value)}
                          className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                          data-testid="input-signup-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-sm text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t.enterConfirmPassword}
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                          className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                          data-testid="input-confirm-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-sm text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.confirmPassword}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                        data-testid="checkbox-terms"
                      />
                      <Label htmlFor="terms" className="text-sm cursor-pointer">
                        {t.acceptTerms}
                      </Label>
                    </div>
                    {errors.terms && <p className="text-sm text-red-500">{errors.terms}</p>}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 pt-4">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    {t.back}
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    data-testid="button-next"
                  >
                    {t.next}
                    <ArrowRight className="w-4 h-4 mr-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    data-testid="button-create-account"
                  >
                    {isLoading ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t.createAccount}
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t.haveAccount}{" "}
                  <button
                    type="button"
                    onClick={onLoginClick}
                    className="text-primary hover:underline font-medium"
                    data-testid="link-login"
                  >
                    {t.login}
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
