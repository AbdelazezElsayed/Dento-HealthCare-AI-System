import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Phone, Mail, Award, Calendar, Users, Loader2, AlertCircle } from "lucide-react";
import { doctorsEndpoints, clinicsEndpoints } from "@/services/api";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  clinic: string;
  phone: string;
  email: string;
  experience: number;
  rating: number;
  totalPatients: number;
  availability: string;
  isAvailable: boolean;
}

export default function DoctorManagementPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);

  const handleBooking = (doctorId: string) => {
    // Navigate to appointments page (booking flow will prefill with this doctor)
    setLocation("/appointments");
  };

  // Fetch clinics to map clinic names
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await clinicsEndpoints.list();
      return res.data || []; // Unwrap the data property
    }
  });

  // Fetch doctors
  const { data: doctorsData = [], isLoading, error } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await doctorsEndpoints.list();
      return res.data || []; // Unwrap the data property from ApiResponse
    }
  });

  // Map backend data to frontend Doctor interface (ensure it's an array)
  const doctors: Doctor[] = Array.isArray(doctorsData) ? doctorsData.map((doc: any) => {
    const clinic = clinics.find((c: any) => c.id === doc.clinicId);
    return {
      id: doc.id,
      name: doc.fullName || "Unknown Doctor", // Fallback to prevent search crash
      specialization: doc.specialization || "General Dentist",
      clinic: clinic?.name || "Main Clinic",
      phone: doc.phone || "+20 100 XXX XXXX",
      email: doc.email || "contact@hospital.com",
      experience: doc.experience || 5,
      rating: doc.rating || 0,
      totalPatients: doc.totalPatients || 0,
      availability: doc.isAvailable ? "السبت - الخميس" : "غير متاح",
      isAvailable: !!doc.isAvailable // Ensure boolean
    };
  }) : [];

  const filteredDoctors = doctors.filter(doc =>
    (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.clinic.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (specializationFilter === "all" || doc.specialization === specializationFilter) &&
    doc.rating >= ratingFilter
  );

  const toggleFavorite = (doctorId: string) => {
    setFavorites(fav =>
      fav.includes(doctorId)
        ? fav.filter(id => id !== doctorId)
        : [...fav, doctorId]
    );
  };

  const uniqueSpecializations = Array.from(new Set(doctors.map(d => d.specialization)));

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">جاري تحميل بيانات الأطباء...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
        <AlertCircle className="h-10 w-10 mb-4" />
        <p className="font-semibold">حدث خطأ أثناء تحميل البيانات</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">👨‍⚕️ إدارة الأطباء</h1>
        <p className="text-muted-foreground text-lg">تصفح وابحث عن أفضل الأطباء المتخصصين</p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <Input
          placeholder="ابحث عن طبيب أو تخصص أو عيادة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-doctor"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold mb-2 block">التخصص</label>
            <select
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="w-full p-2 border rounded-lg bg-background"
              data-testid="select-specialization"
            >
              <option value="all">جميع التخصصات</option>
              {uniqueSpecializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">أقل تقييم</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              className="w-full p-2 border rounded-lg bg-background"
              data-testid="select-rating-filter"
            >
              <option value="0">جميع التقييمات</option>
              <option value="4">⭐ 4+ فما فوق</option>
              <option value="4.5">⭐ 4.5+ فما فوق</option>
              <option value="4.8">⭐ 4.8+ فما فوق</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">إجمالي الأطباء</p>
            <p className="text-3xl font-bold text-primary">{doctors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">أعلى تقييم</p>
            <p className="text-3xl font-bold text-yellow-600">
              {doctors.length > 0 ? Math.max(...doctors.map(d => d.rating)).toFixed(1) : "0.0"} ⭐
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">متوسط الخبرة</p>
            <p className="text-3xl font-bold text-blue-600">
              {doctors.length > 0
                ? Math.round(doctors.reduce((acc, curr) => acc + curr.experience, 0) / doctors.length)
                : 0} سنة
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">إجمالي المرضى</p>
            <p className="text-3xl font-bold text-green-600">
              {doctors.reduce((acc, curr) => acc + curr.totalPatients, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Doctors List */}
      <div className="space-y-4">
        {filteredDoctors.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            لا توجد نتائج تطابق بحثك
          </div>
        ) : (
          filteredDoctors.map(doctor => (
            <Card key={doctor.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center gap-4 p-6">
                  {/* Avatar */}
                  <Avatar className="h-16 w-16 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                      {doctor.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{doctor.name}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{doctor.rating}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{doctor.specialization}</Badge>
                      <Badge variant="outline">{doctor.clinic}</Badge>
                      {doctor.isAvailable ? (
                        <Badge variant="default" className="bg-green-600">متاح</Badge>
                      ) : (
                        <Badge variant="destructive">مشغول</Badge>
                      )}
                    </div>

                    <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        خبرة: {doctor.experience} سنة
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        مرضى: {doctor.totalPatients}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {doctor.availability}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        {doctor.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        {doctor.email}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={favorites.includes(doctor.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFavorite(doctor.id)}
                      className="gap-2"
                      data-testid={`button-favorite-doctor-${doctor.id}`}
                    >
                      {favorites.includes(doctor.id) ? "★" : "☆"}
                    </Button>
                    <Button className="gap-2" onClick={() => handleBooking(doctor.id)} data-testid={`button-book-doctor-${doctor.id}`}>
                      احجز موعد
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
