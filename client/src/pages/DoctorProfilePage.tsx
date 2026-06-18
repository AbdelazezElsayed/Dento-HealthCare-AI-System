import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Users, Calendar, Award, Phone, Mail, MapPin, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { getClinicBySlug } from "@/constants/clinics";

interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  clinic: string;
  experience: string;
  rating: number;
  reviews: number;
  totalPatients: number;
  successRate: number;
  email: string;
  phone: string;
  location: string;
  languages: string[];
  certifications: string[];
  about: string;
}

export default function DoctorProfilePage() {
  const [doctor] = useState<DoctorProfile>({
    id: "1",
    name: "د. أحمد محمد",
    specialty: "استشاري التشخيص وعلاج اللثة",
    clinic: getClinicBySlug("oral-diagnosis-periodontology")?.nameAr || "التشخيص وعلاج اللثة",
    experience: "15 سنة خبرة",
    rating: 4.9,
    reviews: 156,
    totalPatients: 2450,
    successRate: 98.5,
    email: "ahmed@dentodelta.edu.eg",
    phone: "+20-100-123-4567",
    location: "الدور الثاني - جناح التشخيص",
    languages: ["العربية", "الإنجليزية", "الفرنسية"],
    certifications: [
      "ماجستير طب الأسنان",
      "دبلومة التشخيص الرقمي",
      "شهادة البورد الأمريكي",
    ],
    about: `أنا متخصص في التشخيص الدقيق والأشعات الحديثة. مع خبرة تزيد عن 15 سنة في هذا المجال، 
    أقدم خدمات تشخيصية متقدمة باستخدام أحدث التقنيات. أهدفي هو تقديم أفضل رعاية طبية لمرضاي.`,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ملف الطبيب</h1>
        <p className="text-muted-foreground">معلومات الملف الشخصي والمؤهلات</p>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-32 w-32">
              <AvatarFallback className="text-2xl">
                {doctor.name.split(" ")[0][0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{doctor.name}</h2>
              <p className="text-lg text-muted-foreground mb-3">
                {doctor.specialty}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{doctor.experience}</Badge>
                <Badge variant="outline">{doctor.clinic}</Badge>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="font-semibold">{doctor.rating}</span>
                  <span className="text-muted-foreground">
                    ({doctor.reviews} تقييم)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{doctor.totalPatients} مريض</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  <span>{doctor.successRate}% نسبة النجاح</span>
                </div>
              </div>
            </div>

            <Button data-testid="button-edit-profile">
              <Edit className="h-4 w-4 mr-2" />
              تحديث الملف
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="about" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="about">نبذة</TabsTrigger>
          <TabsTrigger value="contact">الاتصال</TabsTrigger>
          <TabsTrigger value="credentials">المؤهلات</TabsTrigger>
          <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>نبذة عني</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">{doctor.about}</p>

              <div className="space-y-3">
                <h3 className="font-semibold">اللغات</h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.languages.map((lang, idx) => (
                    <Badge key={idx} variant="outline">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">الهاتف</p>
                  <p className="font-semibold">{doctor.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-semibold">{doctor.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">الموقع</p>
                  <p className="font-semibold">{doctor.location}</p>
                </div>
              </div>

              <Button className="w-full" data-testid="button-contact-doctor">
                التواصل
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>المؤهلات والشهادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doctor.certifications.map((cert, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg"
                  >
                    <Award className="h-5 w-5 text-green-600" />
                    <span className="font-medium">{cert}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  التقييم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-yellow-500 fill-current" />
                  <div>
                    <div className="text-3xl font-bold">{doctor.rating}</div>
                    <p className="text-xs text-muted-foreground">
                      من {doctor.reviews} تقييم
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  عدد المرضى
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  <div>
                    <div className="text-3xl font-bold">{doctor.totalPatients}</div>
                    <p className="text-xs text-muted-foreground">مريض</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  نسبة النجاح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="text-3xl font-bold">
                      {doctor.successRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">معدل النجاح</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
