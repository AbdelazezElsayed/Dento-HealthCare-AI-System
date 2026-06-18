export interface ClinicDefinition {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  path: string;
}

export const CLINICS_ROUTE = "/clinics";

export const CLINICS: ClinicDefinition[] = [
  {
    id: "oral-diagnosis-periodontology",
    slug: "oral-diagnosis-periodontology",
    nameAr: "التشخيص وعلاج اللثة",
    nameEn: "Oral Diagnosis and Periodontology",
    path: "/clinic/oral-diagnosis-periodontology",
  },
  {
    id: "conservative-dentistry",
    slug: "conservative-dentistry",
    nameAr: "العلاج التحفظي",
    nameEn: "Conservative Dentistry",
    path: "/clinic/conservative-dentistry",
  },
  {
    id: "endodontics",
    slug: "endodontics",
    nameAr: "طب وجراحة الجذور",
    nameEn: "Endodontics",
    path: "/clinic/endodontics",
  },
  {
    id: "oral-maxillofacial-surgery",
    slug: "oral-maxillofacial-surgery",
    nameAr: "جراحة الوجه والفكين",
    nameEn: "Oral and Maxillofacial Surgery",
    path: "/clinic/oral-maxillofacial-surgery",
  },
  {
    id: "oral-surgery",
    slug: "oral-surgery",
    nameAr: "جراحة الفم",
    nameEn: "Oral Surgery",
    path: "/clinic/oral-surgery",
  },
  {
    id: "removable-prosthodontics",
    slug: "removable-prosthodontics",
    nameAr: "التركيبات المتحركة",
    nameEn: "Removable Prosthodontics",
    path: "/clinic/removable-prosthodontics",
  },
  {
    id: "fixed-prosthodontics",
    slug: "fixed-prosthodontics",
    nameAr: "التركيبات الثابتة",
    nameEn: "Fixed Prosthodontics",
    path: "/clinic/fixed-prosthodontics",
  },
  {
    id: "cosmetic-dentistry",
    slug: "cosmetic-dentistry",
    nameAr: "تجميل الأسنان",
    nameEn: "Cosmetic Dentistry",
    path: "/clinic/cosmetic-dentistry",
  },
  {
    id: "implant-dentistry",
    slug: "implant-dentistry",
    nameAr: "زراعة الأسنان",
    nameEn: "Implant Dentistry",
    path: "/clinic/implant-dentistry",
  },
  {
    id: "orthodontics",
    slug: "orthodontics",
    nameAr: "تقويم الأسنان",
    nameEn: "Orthodontics",
    path: "/clinic/orthodontics",
  },
  {
    id: "pediatric-special-care-dentistry",
    slug: "pediatric-special-care-dentistry",
    nameAr: "أسنان الأطفال والاحتياجات الخاصة",
    nameEn: "Pediatric and Special Care Dentistry",
    path: "/clinic/pediatric-special-care-dentistry",
  },
];

export const LEGACY_CLINIC_SLUG_REDIRECTS: Record<string, string | null> = {
  diagnosis: "oral-diagnosis-periodontology",
  gums: "oral-diagnosis-periodontology",
  conservative: null,
  surgery: "oral-maxillofacial-surgery",
  removable: "removable-prosthodontics",
  fixed: "fixed-prosthodontics",
  cosmetic: "cosmetic-dentistry",
  implants: "implant-dentistry",
  pediatric: "pediatric-special-care-dentistry",
};

const CLINIC_NAME_ALIASES: Record<string, string | null> = {
  "التشخيص والأشعة": "oral-diagnosis-periodontology",
  "Diagnosis & Radiology": "oral-diagnosis-periodontology",
  "Diagnosis and Radiology": "oral-diagnosis-periodontology",
  "اللثة": "oral-diagnosis-periodontology",
  Periodontics: "oral-diagnosis-periodontology",
  "علاج اللثة": "oral-diagnosis-periodontology",
  "Gum Treatment": "oral-diagnosis-periodontology",
  "العلاج التحفظي وطب وجراحة الجذور": null,
  "Conservative & Endodontics": null,
  "Conservative and Endodontics": null,
  "جراحة الفم والفكين": "oral-maxillofacial-surgery",
  "Oral & Maxillofacial Surgery": "oral-maxillofacial-surgery",
  "الجراحة": null,
  Surgery: null,
  "أسنان الأطفال": "pediatric-special-care-dentistry",
  "Pediatric Dentistry": "pediatric-special-care-dentistry",
  "Dental Implants": "implant-dentistry",
};

const normalizeClinicKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[&]/g, "and")
    .replace(/[^\w\u0600-\u06FF-]+/g, "");

const aliasEntries = Object.entries(CLINIC_NAME_ALIASES).map(([alias, slug]) => ({
  key: normalizeClinicKey(alias),
  slug,
}));

export function resolveClinicSlug(value: string | null | undefined): string | null | undefined {
  if (!value) return undefined;

  const key = normalizeClinicKey(value);
  const directClinic = CLINICS.find((clinic) =>
    [clinic.id, clinic.slug, clinic.nameAr, clinic.nameEn].some(
      (candidate) => normalizeClinicKey(candidate) === key,
    ),
  );
  if (directClinic) return directClinic.slug;

  if (Object.prototype.hasOwnProperty.call(LEGACY_CLINIC_SLUG_REDIRECTS, key)) {
    return LEGACY_CLINIC_SLUG_REDIRECTS[key];
  }

  const alias = aliasEntries.find((entry) => entry.key === key);
  return alias ? alias.slug : undefined;
}

export function getClinicBySlug(value: string | null | undefined) {
  const slug = resolveClinicSlug(value);
  if (!slug) return undefined;
  return CLINICS.find((clinic) => clinic.slug === slug);
}

export function getClinicDisplayName(
  value: string | ClinicDefinition | null | undefined,
  language: "ar" | "en",
) {
  const clinic = typeof value === "string" ? getClinicBySlug(value) : value;
  if (!clinic) return "";
  return language === "ar" ? clinic.nameAr : clinic.nameEn;
}

export function getClinicEquivalentIds(value: string | null | undefined): string[] {
  const slug = resolveClinicSlug(value);
  if (!slug) return value ? [value] : [];

  const legacySlugs = Object.entries(LEGACY_CLINIC_SLUG_REDIRECTS)
    .filter(([, canonicalSlug]) => canonicalSlug === slug)
    .map(([legacySlug]) => legacySlug);

  return Array.from(new Set([slug, ...legacySlugs]));
}

export function shouldRedirectClinicToOverview(value: string | null | undefined) {
  if (!value) return false;
  return resolveClinicSlug(value) === null;
}
