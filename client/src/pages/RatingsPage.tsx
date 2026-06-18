import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Send } from "lucide-react";
import { getClinicBySlug } from "@/constants/clinics";

const clinicName = (slug: string) => getClinicBySlug(slug)?.nameAr || "";

interface Rating {
  id: string;
  doctorName: string;
  clinic: string;
  patientName: string;
  rating: number;
  comment: string;
  date: string;
}

export default function RatingsPage() {
  const [sortBy, setSortBy] = useState("newest");
  const [ratings, setRatings] = useState<Rating[]>([
    {
      id: "1",
      doctorName: "د. محمد أحمد",
      clinic: clinicName("oral-diagnosis-periodontology"),
      patientName: "أحمد علي",
      rating: 5,
      comment: "طبيب ممتاز جداً، شرح لي الحالة بشكل واضح جداً. الخدمة ممتازة والمركز نظيف ومرتب.",
      date: "2025-10-20"
    },
    {
      id: "2",
      doctorName: "د. فاطمة علي",
      clinic: "العلاج التحفظي",
      patientName: "فاطمة محمد",
      rating: 4,
      comment: "طبيبة محترفة وودية جداً. الجلسة كانت سريعة وخالية من الألم. سأعود إليها بالتأكيد.",
      date: "2025-10-18"
    },
    {
      id: "3",
      doctorName: "د. سارة حسن",
      clinic: clinicName("cosmetic-dentistry"),
      patientName: "سارة حسن",
      rating: 5,
      comment: "الخدمة ممتازة جداً! نتائج التبييض رائعة وظهرت مباشرة. أنصح بشدة.",
      date: "2025-10-15"
    },
  ]);

  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [userRating, setUserRating] = useState(5);
  const [comment, setComment] = useState("");

  const doctors = ["د. محمد أحمد", "د. فاطمة علي", "د. سارة حسن", "د. علي محمود"];

  const handleSubmitRating = () => {
    if (!selectedDoctor || !comment.trim()) {
      alert("الرجاء ملء جميع الحقول");
      return;
    }

    const newRating: Rating = {
      id: Date.now().toString(),
      doctorName: selectedDoctor,
      clinic: "عيادة عامة",
      patientName: "أنت",
      rating: userRating,
      comment,
      date: new Date().toISOString().split('T')[0]
    };

    setRatings([newRating, ...ratings]);
    setSelectedDoctor("");
    setUserRating(5);
    setComment("");
  };

  const avgRating = (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1);

  const sortedRatings = [...ratings].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === "highest") {
      return b.rating - a.rating;
    } else {
      return a.rating - b.rating;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">⭐ التقييمات والتقييم</h1>
        <p className="text-muted-foreground text-lg">قيّم تجربتك مع الأطباء والخدمات الطبية</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-600 mb-2">⭐ {avgRating}</p>
            <p className="text-sm text-muted-foreground">متوسط التقييم</p>
            <p className="text-xs text-muted-foreground mt-2">من {ratings.length} تقييم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map(stars => {
                const count = ratings.filter(r => r.rating === stars).length;
                const percent = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-8">{stars}⭐</span>
                    <div className="h-2 bg-muted rounded-full flex-1">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <span className="w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Rating Form */}
      <Card>
        <CardHeader>
          <CardTitle>أضف تقييماً</CardTitle>
          <CardDescription>شارك تجربتك مع الأطباء والخدمات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">الطبيب</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full p-2 border rounded-lg bg-background"
              data-testid="select-doctor-rating"
            >
              <option value="">-- اختر طبيب --</option>
              {doctors.map(doc => (
                <option key={doc} value={doc}>{doc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">التقييم</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  className="text-2xl transition-transform hover:scale-110"
                  data-testid={`button-star-${star}`}
                >
                  {star <= userRating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">تعليقك</label>
            <Textarea
              placeholder="شارك تجربتك مع هذا الطبيب..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full min-h-24"
              data-testid="textarea-rating-comment"
            />
          </div>

          <Button
            onClick={handleSubmitRating}
            className="w-full gap-2"
            data-testid="button-submit-rating"
          >
            <Send className="h-4 w-4" />
            إرسال التقييم
          </Button>
        </CardContent>
      </Card>

      {/* Ratings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">التقييمات الأخيرة</h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2 border rounded-lg bg-background text-sm"
          >
            <option value="newest">الأحدث</option>
            <option value="highest">الأعلى تقييماً</option>
            <option value="lowest">الأقل تقييماً</option>
          </select>
        </div>
        {sortedRatings.map(rating => (
          <Card key={rating.id}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {rating.patientName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{rating.patientName}</p>
                      <p className="text-xs text-muted-foreground">{rating.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1 justify-end">
                      {Array.from({ length: rating.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-1">{rating.doctorName}</p>
                  <Badge variant="secondary" className="text-xs">{rating.clinic}</Badge>
                </div>

                <p className="text-sm">{rating.comment}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
