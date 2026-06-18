import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Save, Hospital } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CLINICS, getClinicEquivalentIds } from "@/constants/clinics";

interface ClinicPrice {
  id: string;
  clinicId: string;
  sessionPrice: string;
  clinicName?: string;
}

interface PriceManagementPageProps {
  language?: "ar" | "en";
}

export default function PriceManagementPage({ language = "ar" }: PriceManagementPageProps) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const translations = {
    ar: {
      title: "إدارة أسعار الجلسات",
      subtitle: "حدد سعر الجلسة لكل عيادة",
      sessionPrice: "سعر الجلسة (جنيه)",
      save: "حفظ",
      saved: "تم الحفظ",
      error: "حدث خطأ",
      currency: "جنيه",
    },
    en: {
      title: "Session Price Management",
      subtitle: "Set session price for each clinic",
      sessionPrice: "Session Price (EGP)",
      save: "Save",
      saved: "Saved",
      error: "An error occurred",
      currency: "EGP",
    },
  };

  const t = translations[language];

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/clinic-prices");
      if (response.ok) {
        const data = await response.json();
        const priceMap: Record<string, string> = {};
        data.forEach((p: ClinicPrice) => {
          priceMap[p.clinicId] = p.sessionPrice;
        });
        CLINICS.forEach(clinic => {
          const existingPrice = getClinicEquivalentIds(clinic.id)
            .map((clinicId) => priceMap[clinicId])
            .find(Boolean);
          priceMap[clinic.id] = existingPrice || "500";
        });
        setPrices(priceMap);
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrice = async (clinicId: string) => {
    try {
      setSaving(clinicId);
      const response = await fetch(`/api/clinic-prices/${clinicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionPrice: prices[clinicId] }),
      });

      if (response.ok) {
        toast({
          title: t.saved,
          description: language === "ar" ? "تم حفظ السعر بنجاح" : "Price saved successfully",
        });
      }
    } catch (error) {
      toast({
        title: t.error,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handlePriceChange = (clinicId: string, value: string) => {
    setPrices(prev => ({ ...prev, [clinicId]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
          <DollarSign className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CLINICS.map((clinic) => (
          <Card key={clinic.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hospital className="h-5 w-5 text-teal-600" />
                {language === "ar" ? clinic.nameAr : clinic.nameEn}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label htmlFor={`price-${clinic.id}`} className="text-sm text-slate-500">
                    {t.sessionPrice}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id={`price-${clinic.id}`}
                      type="number"
                      value={prices[clinic.id] || "500"}
                      onChange={(e) => handlePriceChange(clinic.id, e.target.value)}
                      className="pl-12"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      {t.currency}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => handleSavePrice(clinic.id)}
                  disabled={saving === clinic.id}
                  className="mt-6 bg-teal-600 hover:bg-teal-700"
                >
                  {saving === clinic.id ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-2" />
                      {t.save}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
