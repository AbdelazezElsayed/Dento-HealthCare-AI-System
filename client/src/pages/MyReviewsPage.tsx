import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Edit, Trash2, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import { getClinicBySlug } from "@/constants/clinics";

const clinicName = (slug: string) => getClinicBySlug(slug)?.nameAr || "";

interface Review {
  id: string;
  doctor: string;
  clinic: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  helpful: number;
  verified: boolean;
}

export default function MyReviewsPage() {
  const [reviews] = useState<Review[]>([
    {
      id: "1",
      doctor: "د. أحمد محمد",
      clinic: clinicName("oral-diagnosis-periodontology"),
      rating: 5,
      title: "تجربة ممتازة جداً",
      content:
        "الطبيب رائع جداً وشرح لي كل شيء بوضوح. المركز نظيف وحديث. سأعود بكل تأكيد!",
      date: "2025-11-20",
      helpful: 23,
      verified: true,
    },
    {
      id: "2",
      doctor: "د. فاطمة علي",
      clinic: "العلاج التحفظي",
      rating: 4,
      title: "جيد جداً لكن الانتظار طويل",
      content:
        "الطبيبة محترفة جداً والعلاج فعال، لكن كان هناك انتظار طويل. قد تحتاجون لتحسين إدارة الوقت.",
      date: "2025-11-15",
      helpful: 12,
      verified: true,
    },
    {
      id: "3",
      doctor: "د. محمود سالم",
      clinic: "جراحة الفم",
      rating: 5,
      title: "أفضل جراح أسنان",
      content:
        "تجربة رائعة مع الدكتور محمود. متخصص جداً وودود. شعرت بالأمان طول الوقت.",
      date: "2025-11-10",
      helpful: 45,
      verified: true,
    },
  ]);

  const avgRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  ).toFixed(1);

  const getRatingColor = (rating: number) => {
    if (rating === 5) return "text-green-600 dark:text-green-400";
    if (rating === 4) return "text-blue-600 dark:text-blue-400";
    if (rating === 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">تقييماتي</h1>
        <p className="text-muted-foreground">اطلع على التقييمات التي أضفتها</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي التقييمات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">متوسط التقييم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{avgRating}</div>
              <Star className={`h-5 w-5 fill-current ${getRatingColor(Math.round(parseFloat(avgRating)))}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">التقييمات 5 نجوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviews.filter((r) => r.rating === 5).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">الإعجابات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviews.reduce((sum, r) => sum + r.helpful, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {reviews.map((review, idx) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{review.title}</h3>
                      {review.verified && (
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                          ✓ تم التحقق
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {review.doctor} - {review.clinic}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 fill-current ${getRatingColor(review.rating)}`}
                      />
                    ))}
                    <span className="font-semibold ml-2">{review.rating}</span>
                  </div>
                </div>

                <p className="text-sm mb-4 leading-relaxed">{review.content}</p>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{review.date}</span>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      {review.helpful} يجد هذا مفيداً
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-edit-review-${review.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      data-testid={`button-delete-review-${review.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Button className="w-full" size="lg" data-testid="button-write-new-review">
        <MessageCircle className="h-5 w-5 mr-2" />
        كتابة تقييم جديد
      </Button>
    </div>
  );
}
