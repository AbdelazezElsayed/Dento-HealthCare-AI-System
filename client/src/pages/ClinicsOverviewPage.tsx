import { Link } from "wouter";
import { ArrowLeft, Hospital } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { CLINICS } from "@/constants/clinics";

interface ClinicsOverviewPageProps {
  onNavigate?: (page: string) => void;
}

export default function ClinicsOverviewPage(_props: ClinicsOverviewPageProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {language === "ar" ? "تفاصيل العيادات" : "Clinic Details"}
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {language === "ar"
            ? "اختر العيادة لعرض تفاصيلها والخدمات المتاحة بها."
            : "Choose a clinic to view its details and available services."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CLINICS.map((clinic) => (
          <Link key={clinic.id} href={clinic.path}>
            <Card
              className="group h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              data-testid={`card-clinic-${clinic.id}`}
            >
              <CardContent className="flex h-full items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Hospital className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold leading-6 text-foreground">
                      {language === "ar" ? clinic.nameAr : clinic.nameEn}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {language === "ar" ? clinic.nameEn : clinic.nameAr}
                    </p>
                  </div>
                </div>
                <ArrowLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
