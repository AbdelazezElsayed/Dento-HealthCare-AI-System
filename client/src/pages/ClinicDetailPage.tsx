import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { clinicsEndpoints } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  Users,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  Heart,
  Share2,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  CLINICS_ROUTE,
  getClinicBySlug,
  resolveClinicSlug,
  shouldRedirectClinicToOverview,
} from "@/constants/clinics";

interface ClinicDetailProps {
  clinicId?: string;
  onNavigate?: (page: string) => void;
}

// Clinic data for all 11 clinics
const clinicsData: Record<string, any> = {
  diagnosis: {
    name: "التشخيص وعلاج اللثة",
    specialty: "Oral Diagnosis and Periodontology",
    description: "مركز متقدم للتشخيص السريري وعلاج اللثة باستخدام أحدث التقنيات",
    rating: 4.8,
    reviews: 245,
    waitTime: "15 دقيقة",
    minPrice: 150,
    maxPrice: 500,
    hours: "8:00 AM - 8:00 PM",
    phone: "+20-100-123-4567",
    email: "diagnosis@dentodelta.edu.eg",
    location: "الدور الثاني - جناح التشخيص",
    imageColor: "from-blue-600 to-blue-400",
    aboutShort: "عيادة متخصصة في التشخيص الدقيق وصحة اللثة",
    aboutLong: `عيادة التشخيص وعلاج اللثة بجامعة الدلتا للعلوم والتكنولوجيا تجمع بين الخبرة والتكنولوجيا الحديثة.
    نحن متخصصون في تقييم حالات الفم والأسنان وعلاج أمراض اللثة باستخدام أحدث الأجهزة والتقنيات.
    الفريق الطبي المتخصص يعمل على توفير تقييم واضح وخطة متابعة مناسبة لكل حالة.`,
    doctors: [
      {
        id: "1",
        name: "د. أحمد محمد",
        specialty: "استشاري التصوير الشعاعي",
        rating: 4.9,
        reviews: 156,
        image: "👨‍⚕️",
        experience: "15 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. فاطمة علي",
        specialty: "متخصص أشعات رقمية",
        rating: 4.7,
        reviews: 89,
        image: "👩‍⚕️",
        experience: "10 سنوات خبرة",
        status: "متاح بعد ساعتين",
      },
    ],
    services: [
      {
        name: "أشعات سينية",
        description: "أشعات بسيطة وآمنة",
        price: "150 ج.م",
        duration: "15 دقيقة",
      },
      {
        name: "CT Scan",
        description: "مسح ثلاثي الأبعاد متقدم",
        price: "500 ج.م",
        duration: "30 دقيقة",
      },
      {
        name: "OCT",
        description: "تصوير بالضوء المترابط",
        price: "300 ج.م",
        duration: "20 دقيقة",
      },
      {
        name: "الموجات فوق الصوتية",
        description: "تصوير آمن بلا إشعاعات",
        price: "200 ج.م",
        duration: "20 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز Panoramic X-ray", status: "جديد", year: "2024" },
      { name: "CBCT Machine", status: "متقدم", year: "2023" },
      { name: "Digital OCT", status: "جديد", year: "2024" },
    ],
    highlights: [
      "أحدث أجهزة التصوير",
      "فريق متخصص",
      "نتائج سريعة",
      "أسعار منافسة",
      "خدمة عملاء ممتازة",
      "ضمان جودة الخدمة",
    ],
    images: [
      "https://images.unsplash.com/photo-1631217314830-4d9e6a1c92f6?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1585607032915-c3400ca199e7?w=600&h=400&fit=crop",
    ],
  },
  conservative: {
    name: "العلاج التحفظي",
    specialty: "Conservative Dentistry",
    description: "علاجات حفظية متقدمة وحشوات جمالية بأحدث التقنيات",
    rating: 4.6,
    reviews: 312,
    waitTime: "20 دقيقة",
    minPrice: 200,
    maxPrice: 800,
    hours: "8:00 AM - 9:00 PM",
    phone: "+20-100-234-5678",
    email: "conservative@dentodelta.edu.eg",
    location: "الدور الثاني - جناح العلاج",
    imageColor: "from-green-600 to-green-400",
    aboutShort: "متخصصة في العلاجات التحفظية المتقدمة",
    aboutLong: `عيادة العلاج التحفظي متخصصة في الحفاظ على الأسنان الطبيعية.
    نقدم خدمات حشو وترميم متقدمة بأحدث التقنيات الرقمية.
    فريقنا المتخصص يعمل بدقة عالية لضمان سلامة وصحة أسنانك.`,
    doctors: [
      {
        id: "1",
        name: "د. محمود سالم",
        specialty: "استشاري علاج الجذور",
        rating: 4.8,
        reviews: 178,
        image: "👨‍⚕️",
        experience: "18 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. نور الدين",
        specialty: "متخصص حشوات جمالية",
        rating: 4.5,
        reviews: 134,
        image: "👨‍⚕️",
        experience: "8 سنوات خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "حشوات جمالية",
        description: "حشوات ملونة حسب لون السن",
        price: "200 ج.م",
        duration: "30 دقيقة",
      },
      {
        name: "علاج الجذور المتقدم",
        description: "علاج متخصص للجذور الملتهبة",
        price: "600 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "تبيض الأسنان",
        description: "تبيض احترافي بتقنية حديثة",
        price: "350 ج.م",
        duration: "45 دقيقة",
      },
      {
        name: "إعادة ترميم السن",
        description: "ترميم شامل للأسنان التالفة",
        price: "500 ج.م",
        duration: "90 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز Root Canal Treatment", status: "جديد", year: "2024" },
      { name: "Rotary Endodontic System", status: "متقدم", year: "2023" },
    ],
    highlights: [
      "حفظ الأسنان الطبيعية",
      "تقنيات رقمية حديثة",
      "علاجات بدون ألم",
      "نتائج طويلة الأمد",
      "أطباء متخصصون",
      "راحة المريض الأولى",
    ],
    images: [
      "https://images.unsplash.com/photo-1576091160550-112173f7f869?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1599580570394-f7d9d59d7c5a?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop",
    ],
  },
  surgery: {
    name: "جراحة الوجه والفكين",
    specialty: "Oral & Maxillofacial Surgery",
    description: "جراحات متقدمة بأحدث التقنيات والمعايير الطبية الدولية",
    rating: 4.9,
    reviews: 189,
    waitTime: "30 دقيقة",
    minPrice: 800,
    maxPrice: 2000,
    hours: "9:00 AM - 6:00 PM",
    phone: "+20-100-345-6789",
    email: "surgery@dentodelta.edu.eg",
    location: "الدور الثالث - غرفة الجراحة",
    imageColor: "from-red-600 to-red-400",
    aboutShort: "متخصصة في الجراحات المتقدمة للفم والفكين",
    aboutLong: `عيادة جراحة الوجه والفكين توفر خدمات جراحية عالية الجودة.
    نستخدم أحدث التقنيات الجراحية والتخدير الحديث لضمان سلامة المريض.
    الفريق الطبي ذو خبرة عالية في جميع أنواع الجراحات.`,
    doctors: [
      {
        id: "1",
        name: "د. محمد خميس",
        specialty: "استشاري جراحة الفكين",
        rating: 4.9,
        reviews: 145,
        image: "👨‍⚕️",
        experience: "20 سنة خبرة",
        status: "متاح",
      },
      {
        id: "2",
        name: "د. سارة أحمد",
        specialty: "جراح فم متخصصة",
        rating: 4.8,
        reviews: 112,
        image: "👩‍⚕️",
        experience: "12 سنة خبرة",
        status: "متاح بعد ساعة",
      },
    ],
    services: [
      {
        name: "استخلاص الأسنان",
        description: "إزالة آمنة للأسنان المتضررة",
        price: "300 ج.م",
        duration: "30 دقيقة",
      },
      {
        name: "جراحة الفك",
        description: "تصحيح عيوب الفك الجراحية",
        price: "2000 ج.م",
        duration: "120 دقيقة",
      },
      {
        name: "تصحيح العضة",
        description: "تصحيح مشاكل الإطباق",
        price: "1500 ج.م",
        duration: "90 دقيقة",
      },
      {
        name: "جراحة اللثة",
        description: "تصحيح مشاكل اللثة الجراحية",
        price: "800 ج.م",
        duration: "45 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز التخدير الحديث", status: "جديد", year: "2024" },
      { name: "أجهزة مراقبة المريض", status: "متقدم", year: "2023" },
      { name: "غرفة عمليات معقمة", status: "معايير دولية", year: "2024" },
    ],
    highlights: [
      "غرفة عمليات حديثة",
      "تخدير آمن",
      "فريق متخصص",
      "معايير دولية",
      "رعاية ما بعد الجراحة",
      "نتائج ممتازة",
    ],
  },
  removable: {
    name: "التركيبات المتحركة",
    specialty: "Removable Prosthodontics",
    description: "تركيبات متحركة مريحة وجمالية حسب احتياجات المريض",
    rating: 4.5,
    reviews: 156,
    waitTime: "25 دقيقة",
    minPrice: 300,
    maxPrice: 1000,
    hours: "8:00 AM - 7:00 PM",
    phone: "+20-100-456-7890",
    email: "removable@dentodelta.edu.eg",
    location: "الدور الثاني - جناح التركيبات",
    imageColor: "from-purple-600 to-purple-400",
    aboutShort: "متخصصة في التركيبات المتحركة المريحة والجمالية",
    aboutLong: `عيادة التركيبات المتحركة توفر حلولاً مريحة لاستعادة الأسنان المفقودة.
    نصنع تركيبات حسب قياسات دقيقة لضمان الراحة والجمال.
    المواد المستخدمة عالية الجودة وآمنة تماماً.`,
    doctors: [
      {
        id: "1",
        name: "د. هناء محمود",
        specialty: "استشارية تركيبات متحركة",
        rating: 4.6,
        reviews: 98,
        image: "👩‍⚕️",
        experience: "14 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. علي رضا",
        specialty: "فني تركيبات",
        rating: 4.4,
        reviews: 76,
        image: "👨‍⚕️",
        experience: "10 سنوات خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "طقم كامل",
        description: "تركيبة كاملة للفك العلوي أو السفلي",
        price: "800 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "تركيبات جزئية",
        description: "تركيبة لملء الفجوات بين الأسنان",
        price: "500 ج.م",
        duration: "45 دقيقة",
      },
      {
        name: "تركيبات فورية",
        description: "تركيبة مؤقتة سريعة",
        price: "400 ج.م",
        duration: "30 دقيقة",
      },
      {
        name: "صيانة وتعديل",
        description: "تعديل وتنظيف التركيبات",
        price: "150 ج.م",
        duration: "20 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز قياس ثلاثي الأبعاد", status: "جديد", year: "2024" },
      { name: "معمل متخصص", status: "متقدم", year: "2023" },
    ],
    highlights: [
      "تركيبات مريحة",
      "مواد عالية الجودة",
      "قياسات دقيقة",
      "صيانة منتظمة",
      "ضمان الرضا",
      "أسعار مناسبة",
    ],
  },
  fixed: {
    name: "التركيبات الثابتة",
    specialty: "Fixed Prosthodontics",
    description: "تاجات وجسور بتقنيات حديثة وأسعار مناسبة",
    rating: 4.7,
    reviews: 278,
    waitTime: "20 دقيقة",
    minPrice: 400,
    maxPrice: 1500,
    hours: "8:00 AM - 8:00 PM",
    phone: "+20-100-567-8901",
    email: "fixed@dentodelta.edu.eg",
    location: "الدور الثاني - جناح التركيبات",
    imageColor: "from-amber-600 to-amber-400",
    aboutShort: "متخصصة في التركيبات الثابتة والتاجات",
    aboutLong: `عيادة التركيبات الثابتة متخصصة في تصنيع التاجات والجسور بأحدث التقنيات.
    نستخدم مواد متينة وجمالية تدوم لسنوات طويلة.
    الفريق المتخصص يضمن تركيباً مثالياً.`,
    doctors: [
      {
        id: "1",
        name: "د. رشا محمد",
        specialty: "استشارية تركيبات ثابتة",
        rating: 4.8,
        reviews: 167,
        image: "👩‍⚕️",
        experience: "16 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. محسن إبراهيم",
        specialty: "فني تاجات",
        rating: 4.6,
        reviews: 111,
        image: "👨‍⚕️",
        experience: "12 سنة خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "تاج سيراميك",
        description: "تاج جمالي دائم",
        price: "600 ج.م",
        duration: "45 دقيقة",
      },
      {
        name: "جسر",
        description: "جسر لملء الفجوة بين السنين",
        price: "1000 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "فينير",
        description: "قشرة رقيقة لتجميل السن",
        price: "400 ج.م",
        duration: "30 دقيقة",
      },
      {
        name: "لومينيز",
        description: "قشرة فاخرة للابتسامة المثالية",
        price: "800 ج.م",
        duration: "45 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز CAD/CAM", status: "جديد", year: "2024" },
      { name: "معمل خزف متخصص", status: "متقدم", year: "2023" },
      { name: "جهاز قياس رقمي", status: "جديد", year: "2024" },
    ],
    highlights: [
      "تركيبات دقيقة",
      "مواد فاخرة",
      "جمالية عالية",
      "ضمان طويل الأمد",
      "تقنيات حديثة",
      "نتائج طبيعية",
    ],
  },
  gums: {
    name: "التشخيص وعلاج اللثة",
    specialty: "Periodontology",
    description: "علاجات متخصصة لصحة اللثة والوقاية من الأمراض",
    rating: 4.4,
    reviews: 98,
    waitTime: "15 دقيقة",
    minPrice: 150,
    maxPrice: 600,
    hours: "9:00 AM - 6:00 PM",
    phone: "+20-100-678-9012",
    email: "gums@dentodelta.edu.eg",
    location: "الدور الثاني - جناح اللثة",
    imageColor: "from-pink-600 to-pink-400",
    aboutShort: "متخصصة في صحة اللثة والوقاية من الأمراض",
    aboutLong: `عيادة التشخيص وعلاج اللثة متخصصة في علاج أمراض اللثة والوقاية منها.
    نوفر خدمات تنظيف متقدم وعلاجات لثوية حديثة.
    الهدف الأساسي هو الحفاظ على صحة اللثة والأسنان.`,
    doctors: [
      {
        id: "1",
        name: "د. ليندا فهمي",
        specialty: "استشارية أمراض اللثة",
        rating: 4.5,
        reviews: 67,
        image: "👩‍⚕️",
        experience: "11 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. طارق عمر",
        specialty: "متخصص علاج لثوي",
        rating: 4.3,
        reviews: 31,
        image: "👨‍⚕️",
        experience: "7 سنوات خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "تنظيف متقدم",
        description: "تنظيف عميق وآمن للثة",
        price: "150 ج.م",
        duration: "30 دقيقة",
      },
      {
        name: "علاج اللثة",
        description: "علاج التهاب وأمراض اللثة",
        price: "300 ج.م",
        duration: "45 دقيقة",
      },
      {
        name: "زراعة عظم",
        description: "زراعة عظم لتقوية اللثة",
        price: "500 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "جراحة لثوية",
        description: "جراحة متخصصة للثة",
        price: "600 ج.م",
        duration: "90 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز الموجات فوق الصوتية", status: "جديد", year: "2024" },
      { name: "ليزر علاجي", status: "متقدم", year: "2023" },
    ],
    highlights: [
      "وقاية متقدمة",
      "علاجات فعالة",
      "تنظيف آمن",
      "جراحات دقيقة",
      "خدمة ما بعد العلاج",
      "نتائج مستدامة",
    ],
  },
  "oral-surgery": {
    name: "جراحة الفم",
    specialty: "Oral Surgery",
    description: "جراحات متخصصة بأحدث التقنيات الحديثة",
    rating: 4.8,
    reviews: 201,
    waitTime: "25 دقيقة",
    minPrice: 600,
    maxPrice: 1800,
    hours: "8:00 AM - 8:00 PM",
    phone: "+20-100-789-0123",
    email: "oralsurgery@dentodelta.edu.eg",
    location: "الدور الثالث - غرفة الجراحة",
    imageColor: "from-red-500 to-rose-500",
    aboutShort: "متخصصة في الجراحات الفموية المتقدمة",
    aboutLong: `عيادة جراحة الفم متخصصة في جميع أنواع الجراحات الفموية.
    نستخدم تقنيات حديثة وتخدير آمن لضمان راحة المريض.
    الفريق له خبرة عالية في جميع الجراحات المعقدة.`,
    doctors: [
      {
        id: "1",
        name: "د. كمال السيد",
        specialty: "استشاري جراحة فم",
        rating: 4.9,
        reviews: 156,
        image: "👨‍⚕️",
        experience: "19 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. منى إبراهيم",
        specialty: "جراح فم متخصصة",
        rating: 4.7,
        reviews: 95,
        image: "👩‍⚕️",
        experience: "13 سنة خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "استخلاص معقد",
        description: "إزالة أسنان معقدة",
        price: "600 ج.م",
        duration: "45 دقيقة",
      },
      {
        name: "جراحة الأورام",
        description: "إزالة أورام الفم",
        price: "1200 ج.م",
        duration: "90 دقيقة",
      },
      {
        name: "تصحيح الفك",
        description: "جراحات تصحيح الفك",
        price: "1800 ج.م",
        duration: "120 دقيقة",
      },
      {
        name: "جراحة الجيوب",
        description: "علاج جراحي لمشاكل الجيوب",
        price: "1000 ج.م",
        duration: "75 دقيقة",
      },
    ],
    equipment: [
      { name: "غرفة عمليات متطورة", status: "جديدة", year: "2024" },
      { name: "أجهزة تصوير متقدمة", status: "متقدمة", year: "2023" },
      { name: "معدات تخدير حديثة", status: "جديدة", year: "2024" },
    ],
    highlights: [
      "جراحات متقدمة",
      "تقنيات حديثة",
      "تخدير آمن",
      "نتائج ممتازة",
      "رعاية شاملة",
      "خبرة عالية",
    ],
  },
  cosmetic: {
    name: "تجميل الأسنان",
    specialty: "Cosmetic Dentistry",
    description: "تحسينات جمالية للابتسامة بأحدث الطرق",
    rating: 4.8,
    reviews: 203,
    waitTime: "20 دقيقة",
    minPrice: 250,
    maxPrice: 1200,
    hours: "8:00 AM - 8:00 PM",
    phone: "+20-100-890-1234",
    email: "cosmetic@dentodelta.edu.eg",
    location: "الدور الثاني - جناح التجميل",
    imageColor: "from-rose-600 to-rose-400",
    aboutShort: "متخصصة في تجميل الابتسامة والأسنان",
    aboutLong: `عيادة تجميل الأسنان متخصصة في تحسين الابتسامة بطرق آمنة وجمالية.
    نوفر خدمات تبيض احترافي وتصحيح جمالي للأسنان.
    الهدف هو إطلالة جمالية طبيعية وساحرة.`,
    doctors: [
      {
        id: "1",
        name: "د. ياسمين حسن",
        specialty: "استشارية تجميل أسنان",
        rating: 4.9,
        reviews: 134,
        image: "👩‍⚕️",
        experience: "14 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. عمرو فاضل",
        specialty: "متخصص تجميل",
        rating: 4.7,
        reviews: 89,
        image: "👨‍⚕️",
        experience: "10 سنوات خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "تبيض احترافي",
        description: "تبيض آمن وفعال",
        price: "350 ج.م",
        duration: "45 دقيقة",
      },
      {
        name: "فينير",
        description: "قشرة رقيقة للابتسامة المثالية",
        price: "500 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "تصحيح الابتسامة",
        description: "تصحيح شامل للابتسامة",
        price: "800 ج.م",
        duration: "90 دقيقة",
      },
      {
        name: "تصميم ابتسامة رقمي",
        description: "تصميم ثلاثي الأبعاد قبل التطبيق",
        price: "200 ج.م",
        duration: "30 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز تبيض LED", status: "جديد", year: "2024" },
      { name: "كاميرا تصوير عالية الدقة", status: "متقدمة", year: "2023" },
      { name: "برنامج ديزاين رقمي", status: "جديد", year: "2024" },
    ],
    highlights: [
      "ابتسامة جمالية",
      "نتائج طبيعية",
      "تقنيات آمنة",
      "تصميم رقمي",
      "نتائج دائمة",
      "رضا المريض",
    ],
  },
  implants: {
    name: "زراعة الأسنان",
    specialty: "Implantology",
    description: "زراعات حديثة بنسب نجاح عالية جداً",
    rating: 4.7,
    reviews: 156,
    waitTime: "30 دقيقة",
    minPrice: 1200,
    maxPrice: 3000,
    hours: "8:00 AM - 7:00 PM",
    phone: "+20-100-901-2345",
    email: "implants@dentodelta.edu.eg",
    location: "الدور الثالث - جناح الزراعة",
    imageColor: "from-cyan-600 to-blue-400",
    aboutShort: "متخصصة في زراعة الأسنان الحديثة",
    aboutLong: `عيادة زراعة الأسنان متخصصة في زراعات عالية الجودة.
    نستخدم أحدث تقنيات الزراعة بنسب نجاح تصل إلى 98%.
    الفريق الطبي ذو خبرة عالية في جميع حالات الزراعة.`,
    doctors: [
      {
        id: "1",
        name: "د. إبراهيم حسن",
        specialty: "استشاري زراعة أسنان",
        rating: 4.9,
        reviews: 123,
        image: "👨‍⚕️",
        experience: "17 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. ليلى محمد",
        specialty: "متخصصة زراعة",
        rating: 4.6,
        reviews: 87,
        image: "👩‍⚕️",
        experience: "11 سنة خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "زراعة سن واحد",
        description: "زراعة حديثة لسن واحد",
        price: "1500 ج.م",
        duration: "90 دقيقة",
      },
      {
        name: "زراعة متعددة",
        description: "زراعة عدة أسنان",
        price: "2500 ج.م",
        duration: "150 دقيقة",
      },
      {
        name: "عملية الرفع الجيبي",
        description: "تجهيز العظم للزراعة",
        price: "1200 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "التاج على الزراعة",
        description: "تاج جمالي على الزراعة",
        price: "800 ج.م",
        duration: "45 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز زراعة كهربائي", status: "جديد", year: "2024" },
      { name: "نظام 3D Imaging", status: "متقدم", year: "2023" },
      { name: "مجهر جراحي", status: "جديد", year: "2024" },
    ],
    highlights: [
      "زراعات حديثة",
      "نسب نجاح عالية",
      "أطباء متخصصون",
      "تقنيات متقدمة",
      "ضمان طويل",
      "نتائج طبيعية",
    ],
  },
  orthodontics: {
    name: "تقويم الأسنان",
    specialty: "Orthodontics",
    description: "تقويم أسنان حديث وسريع بأقل الأضرار",
    rating: 4.6,
    reviews: 234,
    waitTime: "20 دقيقة",
    minPrice: 300,
    maxPrice: 1000,
    hours: "9:00 AM - 7:00 PM",
    phone: "+20-100-012-3456",
    email: "orthodontics@dentodelta.edu.eg",
    location: "الدور الثاني - جناح التقويم",
    imageColor: "from-indigo-600 to-indigo-400",
    aboutShort: "متخصصة في تقويم الأسنان الحديث",
    aboutLong: `عيادة تقويم الأسنان متخصصة في تصحيح مشاكل الإطباق والمحاذاة.
    نوفر خيارات تقويم حديثة بما فيها التقويم الشفاف والمعدني.
    الفريق يعمل على نتائج جمالية وصحية.`,
    doctors: [
      {
        id: "1",
        name: "د. نديم السيد",
        specialty: "استشاري تقويم أسنان",
        rating: 4.7,
        reviews: 145,
        image: "👨‍⚕️",
        experience: "15 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. هديل أحمد",
        specialty: "متخصصة تقويم",
        rating: 4.5,
        reviews: 98,
        image: "👩‍⚕️",
        experience: "9 سنوات خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "تقويم معدني",
        description: "تقويم تقليدي فعال",
        price: "300 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "تقويم شفاف",
        description: "تقويم غير مرئي Invisalign",
        price: "800 ج.م",
        duration: "45 دقيقة",
      },
      {
        name: "تقويم سيراميكي",
        description: "تقويم جمالي",
        price: "600 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "تصحيح بسيط",
        description: "تصحيح جزئي سريع",
        price: "400 ج.م",
        duration: "30 دقيقة",
      },
    ],
    equipment: [
      { name: "كاميرا 3D التقويم", status: "جديدة", year: "2024" },
      { name: "برنامج محاكاة التقويم", status: "متقدم", year: "2023" },
      { name: "أجهزة معالجة", status: "حديثة", year: "2024" },
    ],
    highlights: [
      "نتائج سريعة",
      "خيارات متعددة",
      "راحة المريض",
      "نتائج جمالية",
      "متابعة دقيقة",
      "أسعار مناسبة",
    ],
  },
  pediatric: {
    name: "أسنان الأطفال والاحتياجات الخاصة",
    specialty: "Pediatric and Special Care Dentistry",
    description: "رعاية متخصصة وودية لأسنان الأطفال وذوي الاحتياجات الخاصة",
    rating: 4.5,
    reviews: 189,
    waitTime: "15 دقيقة",
    minPrice: 100,
    maxPrice: 400,
    hours: "9:00 AM - 5:00 PM",
    phone: "+20-100-123-4890",
    email: "pediatric@dentodelta.edu.eg",
    location: "الدور الأول - جناح الأطفال",
    imageColor: "from-lime-600 to-lime-400",
    aboutShort: "متخصصة في رعاية أسنان الأطفال وذوي الاحتياجات الخاصة بطريقة ودية",
    aboutLong: `عيادة أسنان الأطفال والاحتياجات الخاصة متخصصة في رعاية أسنان الصغار بطريقة ودية وآمنة.
    نستخدم تقنيات حديثة وبسيطة تناسب الأطفال وذوي الاحتياجات الخاصة.
    الفريق مدرب على التعامل مع الخوف والقلق لدى الأطفال.`,
    doctors: [
      {
        id: "1",
        name: "د. رحاب الطاهر",
        specialty: "استشارية أسنان أطفال",
        rating: 4.6,
        reviews: 112,
        image: "👩‍⚕️",
        experience: "12 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. أحمد كامل",
        specialty: "متخصص أسنان أطفال",
        rating: 4.4,
        reviews: 67,
        image: "👨‍⚕️",
        experience: "8 سنوات خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "تنظيف وفحص",
        description: "فحص دوري وتنظيف آمن",
        price: "100 ج.م",
        duration: "30 دقيقة",
      },
      {
        name: "حشو الأسنان",
        description: "حشو آمن بمواد بسيطة",
        price: "150 ج.م",
        duration: "30 دقيقة",
      },
      {
        name: "إزالة ولادية",
        description: "إزالة آمنة للأسنان اللبنية",
        price: "200 ج.م",
        duration: "20 دقيقة",
      },
      {
        name: "تطبيق الفلوريد",
        description: "حماية الأسنان من التسوس",
        price: "100 ج.م",
        duration: "15 دقيقة",
      },
    ],
    equipment: [
      { name: "كرسي أطفال خاص", status: "ودود", year: "2024" },
      { name: "أجهزة آمنة للأطفال", status: "حديثة", year: "2023" },
      { name: "نظام ترفيه", status: "جديد", year: "2024" },
    ],
    highlights: [
      "بيئة ودية",
      "فريق مدرب",
      "تقنيات آمنة",
      "راحة الطفل",
      "رعاية وقائية",
      "نتائج جيدة",
    ],
  },
  periodontal: {
    name: "أمراض اللثة المتقدمة",
    specialty: "Advanced Periodontology",
    description: "متخصصة في علاج أمراض اللثة المتقدمة والزراعات",
    rating: 4.6,
    reviews: 142,
    waitTime: "25 دقيقة",
    minPrice: 250,
    maxPrice: 800,
    hours: "9:00 AM - 6:00 PM",
    phone: "+20-100-234-5678",
    email: "periodontal@dentodelta.edu.eg",
    location: "الدور الثاني - جناح اللثة المتقدمة",
    imageColor: "from-violet-600 to-violet-400",
    aboutShort: "متخصصة في علاج أمراض اللثة المتقدمة",
    aboutLong: `عيادة أمراض اللثة المتقدمة متخصصة في علاج جميع أمراض اللثة والعظم.
    نوفر خدمات علاج متقدمة بما في ذلك الزراعات وتحديث العظم.
    الفريق مدرب على أحدث التقنيات العالمية.`,
    doctors: [
      {
        id: "1",
        name: "د. حسام القاضي",
        specialty: "استشاري أمراض لثة",
        rating: 4.7,
        reviews: 98,
        image: "👨‍⚕️",
        experience: "16 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. سماح فودة",
        specialty: "متخصصة علاج لثوي",
        rating: 4.5,
        reviews: 64,
        image: "👩‍⚕️",
        experience: "10 سنوات خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "علاج متقدم للثة",
        description: "علاج متخصص لأمراض اللثة",
        price: "400 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "رفع عظم",
        description: "بناء عظم إضافي للزراعات",
        price: "600 ج.م",
        duration: "90 دقيقة",
      },
      {
        name: "زراعات اللثة",
        description: "زراعة أنسجة الثة الحديثة",
        price: "500 ج.م",
        duration: "75 دقيقة",
      },
      {
        name: "جراحة لثوية متقدمة",
        description: "جراحات معقدة للثة",
        price: "700 ج.م",
        duration: "120 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز ليزر متقدم", status: "جديد", year: "2024" },
      { name: "نظام 3D للزراعات", status: "متقدم", year: "2023" },
      { name: "مجهر جراحي", status: "جديد", year: "2024" },
    ],
    highlights: [
      "علاجات متقدمة",
      "أطباء متخصصون",
      "تقنيات عالمية",
      "نتائج طويلة الأمد",
      "خدمة متميزة",
      "ضمان الجودة",
    ],
  },
  dentocad: {
    name: "Dentocad التكنولوجيا الرقمية",
    specialty: "Digital & CAD/CAM",
    description: "تصميم وتصنيع رقمي للتركيبات والتيجان",
    rating: 4.8,
    reviews: 176,
    waitTime: "30 دقيقة",
    minPrice: 500,
    maxPrice: 2000,
    hours: "8:00 AM - 7:00 PM",
    phone: "+20-100-345-6789",
    email: "dentocad@dentodelta.edu.eg",
    location: "الدور الثالث - معمل Dentocad",
    imageColor: "from-orange-600 to-orange-400",
    aboutShort: "متخصصة في التصميم الرقمي والتصنيع بتقنية CAD/CAM",
    aboutLong: `معمل Dentocad متخصص في تصميم وتصنيع التركيبات الرقمية بدقة عالية جداً.
    نستخدم أحدث تقنيات CAD/CAM العالمية لضمان نتائج مثالية.
    الإنتاج سريع وآمن وبأسعار منافسة.`,
    doctors: [
      {
        id: "1",
        name: "د. يحيى عبدالله",
        specialty: "استشاري تصميم رقمي",
        rating: 4.8,
        reviews: 112,
        image: "👨‍⚕️",
        experience: "14 سنة خبرة",
        status: "متاح الآن",
      },
      {
        id: "2",
        name: "د. رؤى حسن",
        specialty: "متخصصة CAD/CAM",
        rating: 4.7,
        reviews: 78,
        image: "👩‍⚕️",
        experience: "11 سنة خبرة",
        status: "متاح",
      },
    ],
    services: [
      {
        name: "تصميم ثلاثي الأبعاد",
        description: "تصميم دقيق للتركيبات",
        price: "200 ج.م",
        duration: "45 دقيقة",
      },
      {
        name: "تيجان زركونيوم",
        description: "تيجان جمالية دائمة",
        price: "800 ج.م",
        duration: "60 دقيقة",
      },
      {
        name: "جسور رقمية",
        description: "جسور بدقة عالية",
        price: "1200 ج.م",
        duration: "90 دقيقة",
      },
      {
        name: "قشرة رقمية",
        description: "قشرة زركونيوم للابتسامة",
        price: "500 ج.م",
        duration: "60 دقيقة",
      },
    ],
    equipment: [
      { name: "جهاز CAD/CAM الأحدث", status: "جديد", year: "2024" },
      { name: "جهاز طحن ثلاثي الأبعاد", status: "متقدم", year: "2023" },
      { name: "نظام تصميم رقمي متطور", status: "جديد", year: "2024" },
      { name: "فرن حرق متقدم", status: "جديد", year: "2024" },
    ],
    highlights: [
      "دقة عالية جداً",
      "إنتاج سريع",
      "تقنيات حديثة",
      "نتائج مثالية",
      "أسعار منافسة",
      "ضمان الجودة",
    ],
  },
};

const withClinicIdentity = (sourceKey: string, slug: string, overrides: Record<string, any> = {}) => {
  const definition = getClinicBySlug(slug);
  return {
    ...clinicsData[sourceKey],
    id: definition?.id || slug,
    slug,
    name: definition?.nameAr || clinicsData[sourceKey]?.name,
    nameAr: definition?.nameAr,
    nameEn: definition?.nameEn,
    specialty: definition?.nameEn || clinicsData[sourceKey]?.specialty,
    ...overrides,
  };
};

Object.assign(clinicsData, {
  "oral-diagnosis-periodontology": withClinicIdentity("gums", "oral-diagnosis-periodontology", {
    description: "تشخيص أمراض الفم والأسنان مع علاج أمراض اللثة ضمن عيادة واحدة.",
    aboutShort: "تشخيص فموي وعناية متخصصة بصحة اللثة",
    aboutLong: "تقدم عيادة التشخيص وعلاج اللثة تقييمًا سريريًا دقيقًا للحالة، مع خدمات علاج التهابات اللثة ومتابعة صحة الأنسجة الداعمة للأسنان.",
  }),
  "conservative-dentistry": withClinicIdentity("conservative", "conservative-dentistry", {
    description: "علاجات تحفظية للحفاظ على الأسنان الطبيعية والحشوات الجمالية.",
    aboutShort: "حشوات وعلاجات تحفظية للحفاظ على الأسنان",
    aboutLong: "تركز عيادة العلاج التحفظي على حماية الأسنان الطبيعية، وعلاج التسوس، وترميم الأسنان بالحشوات المناسبة حسب حالة المريض.",
  }),
  endodontics: withClinicIdentity("conservative", "endodontics", {
    description: "تشخيص وعلاج أمراض لب الأسنان وقنوات الجذور.",
    aboutShort: "علاج جذور الأسنان وحالات التهاب العصب",
    aboutLong: "تختص عيادة طب وجراحة الجذور بتقييم آلام العصب وحالات التهاب لب السن، وتقديم علاج جذور مناسب للحفاظ على السن كلما أمكن.",
  }),
  "oral-maxillofacial-surgery": withClinicIdentity("surgery", "oral-maxillofacial-surgery", {
    description: "خدمات جراحة الوجه والفكين وفق المعايير الطبية المتخصصة.",
    aboutShort: "جراحات الوجه والفكين المتخصصة",
    aboutLong: "تقدم عيادة جراحة الوجه والفكين خدمات جراحية متخصصة للحالات التي تحتاج تقييمًا وتدخلًا جراحيًا متقدمًا.",
  }),
  "oral-surgery": withClinicIdentity("oral-surgery", "oral-surgery", {
    description: "إجراءات جراحة الفم وخلع الأسنان والحالات الجراحية البسيطة.",
    aboutShort: "جراحة الفم والإجراءات الجراحية الأساسية",
    aboutLong: "تختص عيادة جراحة الفم بتقييم الحالات التي تحتاج إلى خلع أو تدخل جراحي داخل الفم، مع متابعة ما بعد الإجراء.",
  }),
  "removable-prosthodontics": withClinicIdentity("removable", "removable-prosthodontics"),
  "fixed-prosthodontics": withClinicIdentity("fixed", "fixed-prosthodontics"),
  "cosmetic-dentistry": withClinicIdentity("cosmetic", "cosmetic-dentistry"),
  "implant-dentistry": withClinicIdentity("implants", "implant-dentistry", {
    specialty: "Implant Dentistry",
  }),
  orthodontics: withClinicIdentity("orthodontics", "orthodontics"),
  "pediatric-special-care-dentistry": withClinicIdentity("pediatric", "pediatric-special-care-dentistry", {
    description: "رعاية أسنان الأطفال والمرضى ذوي الاحتياجات الخاصة بأسلوب آمن وودود.",
    aboutShort: "رعاية أسنان الأطفال والاحتياجات الخاصة",
    aboutLong: "تقدم عيادة أسنان الأطفال والاحتياجات الخاصة رعاية وقائية وعلاجية مناسبة للأطفال والمرضى الذين يحتاجون إلى عناية خاصة.",
  }),
});

export default function ClinicDetailPage({
  clinicId = "oral-diagnosis-periodontology",
  onNavigate,
}: ClinicDetailProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [, setLocation] = useLocation();
  const shouldRedirectToOverview = shouldRedirectClinicToOverview(clinicId);
  const resolvedClinicSlug = resolveClinicSlug(clinicId);
  const effectiveClinicId = typeof resolvedClinicSlug === "string" ? resolvedClinicSlug : clinicId;

  useEffect(() => {
    if (shouldRedirectToOverview) {
      setLocation(CLINICS_ROUTE);
    }
  }, [setLocation, shouldRedirectToOverview]);

  const { data: response, isLoading, error } = useQuery<any>({
    queryKey: ['clinic', effectiveClinicId],
    queryFn: async () => {
      if (clinicsData[effectiveClinicId]) {
        return { data: clinicsData[effectiveClinicId] };
      }
      return clinicsEndpoints.getById(effectiveClinicId);
    },
    enabled: !!effectiveClinicId && !shouldRedirectToOverview
  });

  const clinicData = response?.data || response;
  
  if (shouldRedirectToOverview || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">جاري تحميل بيانات العيادة...</p>
      </div>
    );
  }

  if (error || !clinicData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
        <AlertCircle className="h-10 w-10 mb-4" />
        <p className="font-semibold">حدث خطأ أثناء تحميل بيانات العيادة</p>
        <Button variant="outline" className="mt-4" onClick={() => onNavigate?.("clinics")}>
          العودة للعيادات
        </Button>
      </div>
    );
  }

  // Construct clinic object mixing DB data with fallback UI defaults
  const clinic = {
    name: clinicData.nameAr || clinicData.name || "عيادة متخصصة",
    specialty: clinicData.name || "تخصص عام",
    description: clinicData.description || "خدمات طبية متخصصة",
    rating: clinicData.rating || 4.8,
    reviews: clinicData.reviews || 0,
    waitTime: clinicData.waitTime || "20 دقيقة",
    minPrice: clinicData.minPrice || 200,
    maxPrice: clinicData.maxPrice || 1000,
    hours: clinicData.hours || "8:00 AM - 7:00 PM",
    phone: clinicData.phone || "+20-100-123-4567",
    email: clinicData.email || "contact@dentodelta.edu.eg",
    location: clinicData.location || "مبنى العيادات",
    imageColor: clinicData.color || "from-blue-600 to-blue-400",
    aboutShort: clinicData.description || "",
    aboutLong: clinicData.description || "نقدم خدمات طبية متخصصة بأعلى جودة.",
    doctors: clinicData.doctors || [],
    services: clinicData.services || [],
    equipment: clinicData.equipment || [],
    highlights: clinicData.highlights || ["خدمة متميزة", "أطباء متخصصون", "تقنيات حديثة"],
    images: clinicData.images || [],
    ...clinicData // Override defaults if DB provides full fields or if it's the mocked fallback
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className={`h-40 bg-gradient-to-r ${clinic.imageColor} rounded-lg relative`}>
        <button
          onClick={() => onNavigate?.("clinics")}
          className="absolute top-4 left-4 p-2 bg-white/90 dark:bg-slate-800/90 rounded-full hover:bg-white dark:hover:bg-slate-700 transition"
          data-testid="button-back-clinics"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/90 dark:bg-slate-800/90"
            onClick={() => setIsFavorite(!isFavorite)}
            data-testid="button-favorite-detail"
          >
            <Heart
              className={`h-4 w-4 ${
                isFavorite ? "fill-red-500 text-red-500" : ""
              }`}
            />
            {isFavorite ? "أضيفت للمفضلة" : "أضف للمفضلة"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/90 dark:bg-slate-800/90"
            data-testid="button-share-clinic"
          >
            <Share2 className="h-4 w-4" />
            مشاركة
          </Button>
        </div>
      </div>

      {/* Title & Basic Info */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">{clinic.name}</h1>
          <p className="text-lg text-muted-foreground">{clinic.specialty}</p>
        </div>

        {/* Rating & Stats */}
        <div className="flex gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg">
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              <span className="font-bold text-lg">{clinic.rating}</span>
              <span className="text-sm text-muted-foreground">
                ({clinic.reviews} تقييم)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">{clinic.doctors.length} أطباء</span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
            <Clock className="h-5 w-5 text-green-600" />
            <span className="font-semibold">وقت الانتظار: {clinic.waitTime}</span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    الموقع
                  </p>
                  <p className="font-semibold">{clinic.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    الهاتف
                  </p>
                  <p className="font-semibold">{clinic.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    ساعات العمل
                  </p>
                  <p className="font-semibold text-sm">{clinic.hours}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full gap-1 grid-cols-4 md:grid-cols-8 bg-blue-100 dark:bg-blue-950/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">نظرة عامة</TabsTrigger>
          <TabsTrigger value="doctors" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">الأطباء</TabsTrigger>
          <TabsTrigger value="services" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">الخدمات</TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">الأجهزة</TabsTrigger>
          <TabsTrigger value="appointments" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">المواعيد</TabsTrigger>
          <TabsTrigger value="booking" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">الحجز</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">السياسات</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">التقييمات</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>عن العيادة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{clinic.aboutLong}</p>
              <div className="grid gap-3 md:grid-cols-3">
                {clinic.highlights.map((highlight: string) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">{highlight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors" className="mt-6 space-y-4">
          {clinic.doctors.map((doctor: any) => (
            <Card key={doctor.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {doctor.image}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{doctor.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {doctor.specialty}
                        </p>
                      </div>
                      <Badge className="ml-2">{doctor.rating}⭐</Badge>
                    </div>
                    <div className="grid gap-2 text-sm mb-3">
                      <p className="text-muted-foreground">{doctor.experience}</p>
                      <p className="text-muted-foreground">
                        {doctor.reviews} تقييم وتقدير
                      </p>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-semibold">
                          {doctor.status}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => onNavigate?.("appointments")}
                      data-testid={`button-book-doctor-${doctor.id}`}
                    >
                      حجز موعد
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {clinic.services.map((service: any) => (
              <Card key={service.name}>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">{service.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">السعر</p>
                        <p className="font-bold text-primary">{service.price}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">المدة</p>
                        <p className="font-semibold">{service.duration}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onNavigate?.("appointments")}
                      data-testid={`button-book-service-${service.name}`}
                    >
                      احجز الآن
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="mt-6 space-y-4">
          {clinic.equipment.map((item: any) => (
            <Card key={item.name}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      أضيف سنة {item.year}
                    </p>
                  </div>
                  <Badge>{item.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="mt-6 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                المواعيد المتاحة الآن
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {[
                { time: "09:00", doctor: "د. " + clinic.doctors[0].name, status: "متاح" },
                { time: "10:30", doctor: "د. " + clinic.doctors[clinic.doctors.length > 1 ? 1 : 0].name, status: "متاح" },
                { time: "02:00 PM", doctor: "د. " + clinic.doctors[0].name, status: "متاح" },
                { time: "04:30 PM", doctor: "د. " + clinic.doctors[clinic.doctors.length > 1 ? 1 : 0].name, status: "متاح" },
              ].map((apt, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover-elevate transition-all bg-slate-50 dark:bg-slate-900/50">
                  <div>
                    <p className="font-bold text-base">{apt.time}</p>
                    <p className="text-sm text-muted-foreground">{apt.doctor}</p>
                  </div>
                  <Button size="sm" onClick={() => onNavigate?.("appointments")} data-testid={`button-book-time-${apt.time}`} className="gap-1">
                    <Calendar className="h-3 w-3" />
                    احجز
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Tab */}
        <TabsContent value="booking" className="mt-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  حجز سريع
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">احجز موعد في دقيقة واحدة فقط من خلال نظام الحجز السريع</p>
                <Button className="w-full gap-2" onClick={() => onNavigate?.("appointments")} data-testid="button-quick-booking">
                  <Calendar className="h-4 w-4" />
                  ابدأ الحجز السريع
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  حجز متكرر
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">احجز مواعيد دورية بانتظام حسب احتياجاتك</p>
                <div className="flex gap-2 flex-wrap">
                  {["أسبوعي", "شهري", "كل شهرين"].map((option) => (
                    <Button key={option} variant="outline" size="sm" data-testid={`button-recurring-${option}`}>
                      {option}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="mt-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  ساعات الطوارئ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-semibold">7:00 PM - 8:00 AM</p>
                <p className="text-sm text-muted-foreground">متاح في جميع أيام الأجازات</p>
                <p className="text-xs bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded mt-3">
                  📞 {clinic.phone}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  سياسة الإلغاء
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-semibold">إلغاء مجاني</p>
                <p className="text-sm text-muted-foreground">24 ساعة قبل الموعد</p>
                <p className="text-xs bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded mt-3">
                  ✓ بدون رسوم إضافية
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Shield className="h-5 w-5" />
                  سياسة الاسترجاع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-semibold">استرجاع 100%</p>
                <p className="text-sm text-muted-foreground">في حالة عدم الحضور</p>
                <p className="text-xs bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded mt-3">
                  🛡️ حماية كاملة للعملاء
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <MapPin className="h-5 w-5" />
                  موقع العيادة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-semibold">{clinic.location}</p>
                <p className="text-xs text-muted-foreground">📧 {clinic.email}</p>
                <p className="text-xs bg-orange-50 dark:bg-orange-950/30 px-3 py-2 rounded mt-3">
                  جامعة الدلتا للعلوم والتكنولوجيا
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Location Map */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                موقع العيادة على الخريطة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className={`h-56 bg-gradient-to-br ${clinic.imageColor} rounded-lg flex items-center justify-center text-white shadow-md`}>
                <div className="text-center space-y-3">
                  <div className="text-6xl animate-bounce">📍</div>
                  <div>
                    <p className="font-bold text-lg">جامعة الدلتا للعلوم والتكنولوجيا</p>
                    <p className="text-sm mt-1 opacity-95">{clinic.location}</p>
                    <p className="text-xs mt-2 opacity-90">مصر - في قلب العاصمة الإدارية</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-sm">{clinic.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm">{clinic.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تقييمات المرضى</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  name: "محمد أحمد",
                  rating: 5,
                  text: "خدمة ممتازة وأطباء محترفون جداً",
                  date: "منذ أسبوع",
                },
                {
                  name: "فاطمة علي",
                  rating: 4,
                  text: "جودة عالية وسرعة في الخدمة",
                  date: "منذ 3 أيام",
                },
              ].map((review, idx) => (
                <div
                  key={idx}
                  className="pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{review.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{review.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {review.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {Array(review.rating)
                        .fill(0)
                        .map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-yellow-500 text-yellow-500"
                          />
                        ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-lg mb-1">جاهز لحجز موعد؟</h3>
              <p className="text-muted-foreground">
                احجز الآن واحصل على أفضل خدمة طبية
              </p>
            </div>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => onNavigate?.("appointments")}
              data-testid="button-book-cta"
            >
              <Calendar className="h-5 w-5" />
              احجز موعداً الآن
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
