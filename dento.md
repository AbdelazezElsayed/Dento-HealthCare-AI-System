# 🦷 Dento-HealthCare — التوثيق التقني الشامل

> **مشروع:** نظام إدارة عيادة أسنان جامعة الدلتا للعلوم والتكنولوجيا  
> **المسار:** `d:\Ptoject Versions\احتياطي\test for new repo\Dento-HealthCare`  
> **المنفذ على:** `http://localhost:5000`  

---

## 📋 نظرة عامة على المشروع

نظام ويب متكامل لإدارة عيادات الأسنان، يدعم أدواراً متعددة (مريض، طبيب، طالب، إمتياز، مسؤول)، مع تكامل كامل مع الذكاء الاصطناعي (Google Gemini) للتشخيص والدردشة الطبية.

### الميزات الرئيسية
- 🤖 تشخيص ذكي بالذكاء الاصطناعي (Gemini 2.5 Flash)
- 💬 شات بوت طبي متخصص في طب الأسنان
- 🎤 محادثة صوتية (Voice Chat) مع TTS عربي
- 📅 نظام حجز وإدارة مواعيد
- 💳 إدارة مالية ومدفوعات
- 🏥 10 عيادات متخصصة
- 🔔 إشعارات فورية (Real-time WebSocket)
- 🌐 دعم ثنائي اللغة (عربي/إنجليزي)
- 🌙 Dark Mode / Light Mode
- 📱 تصميم متجاوب (RTL + LTR)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                  │
│   React 18 | TypeScript | TailwindCSS | shadcn/ui        │
│   Wouter (Routing) | TanStack Query | Framer Motion      │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────────┐
│                  SERVER (Express.js)                      │
│   Node.js | TypeScript | TSX | Express 4                 │
│   Helmet | CORS | Rate Limiting | Session Auth           │
│   Socket.IO WebSocket | Winston Logger                   │
└───────────────────────┬─────────────────────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
┌──────────▼──────────┐   ┌─────────▼───────────┐
│   MongoDB Atlas      │   │   Google Gemini AI    │
│   Mongoose ODM       │   │   gemini-2.5-flash    │
│   GridFS (X-Ray)     │   │   gemini-2.5-flash-   │
│   MongoStore Session │   │   preview-tts         │
└─────────────────────┘   └─────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| التقنية | الإصدار | الاستخدام |
|---------|---------|----------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.6.3 | Type Safety |
| Vite | 5.4.20 | Build Tool + Dev Server |
| TailwindCSS | 3.4.17 | Styling |
| shadcn/ui (Radix UI) | متعدد | Component Library |
| Wouter | 3.3.5 | Client-side Routing |
| TanStack Query | 5.60.5 | Server State Management |
| Framer Motion | 11.0.0 | Animations |
| Recharts | 2.15.2 | Charts & Analytics |
| Socket.io-client | 4.8.3 | Real-time Updates |
| Lucide React | 0.453.0 | Icons |
| React Hook Form | 7.55.0 | Form Management |
| Zod | 3.25.76 | Validation |
| date-fns | 3.6.0 | Date Utilities |

### Backend
| التقنية | الإصدار | الاستخدام |
|---------|---------|----------|
| Node.js | 20+ | Runtime |
| Express.js | 4.21.2 | Web Framework |
| TypeScript + TSX | 5.6.3 | Type Safety + Runtime |
| Mongoose | 9.1.4 | MongoDB ODM |
| Socket.IO | 4.8.3 | WebSocket Server |
| Express Session | 1.18.1 | Session Management |
| connect-mongo | 6.0.0 | MongoDB Session Store |
| Helmet | 8.1.0 | Security Headers |
| CORS | 2.8.5 | Cross-Origin |
| express-rate-limit | 8.2.1 | Rate Limiting |
| bcrypt | 6.0.0 | Password Hashing |
| multer | 2.0.2 | File Uploads |
| Winston | 3.19.0 | Logging |
| @google/generative-ai | 0.24.1 | Gemini AI |

---

## 📁 Project Structure

```
Dento-HealthCare/
├── client/                          # Frontend (React)
│   ├── index.html
│   └── src/
│       ├── main.tsx                 # Entry point
│       ├── App.tsx                  # Root + Routing (636 lines)
│       ├── index.css                # Global styles + animations
│       ├── contexts/
│       │   ├── AuthContext.tsx      # Auth state management
│       │   └── LanguageContext.tsx  # AR/EN language state
│       ├── hooks/                   # Custom React hooks
│       ├── lib/
│       │   └── queryClient.ts       # TanStack Query config
│       ├── services/
│       │   └── api.ts               # API call helpers (apiGet, apiPost...)
│       ├── components/              # Reusable components (19 files)
│       │   ├── AppSidebar.tsx       # Sidebar with RBAC-based nav
│       │   ├── LoginPage.tsx        # Login form (email OR username)
│       │   ├── PatientList.tsx      # Doctors' patient list + reports
│       │   ├── PatientReportsModal.tsx  # AI Diagnosis + Treatment + History
│       │   ├── ChatbotCore.tsx      # Core chatbot logic
│       │   ├── PatientChatbot.tsx   # Patient-facing chatbot
│       │   ├── FloatingChatbot.tsx  # Floating button for patients
│       │   ├── EditTreatmentPlanDialog.tsx  # Doctor edits treatment
│       │   ├── MedicalStaffDashboard.tsx    # Doctor dashboard
│       │   ├── ProtectedRoute.tsx   # RBAC route guards
│       │   ├── ErrorBoundary.tsx    # Error catching
│       │   ├── TreatmentPlanCard.tsx
│       │   ├── TodayAppointmentsPage.tsx
│       │   ├── PriceManagementPage.tsx
│       │   └── ui/                  # shadcn/ui components
│       └── pages/                   # Page components (33 files)
│           ├── HomePage.tsx
│           ├── AIDiagnosisPage.tsx        # AI diagnosis (55KB)
│           ├── AppointmentBookingPageNew.tsx  # Booking + mock demo
│           ├── MedicalRecordsPage.tsx     # Patient medical history
│           ├── TreatmentPlanDetailPage.tsx
│           ├── ClinicDetailPage.tsx       # 10 clinic pages (61KB)
│           ├── ClinicsOverviewPage.tsx
│           ├── ChatBotPage.tsx
│           ├── VoiceChatPage.tsx          # Voice + TTS
│           ├── PaymentPageNew.tsx
│           ├── AdminPanelPage.tsx
│           ├── DoctorPanelPage.tsx
│           ├── SettingsPage.tsx           # Full settings (57KB)
│           ├── ReportsPage.tsx
│           ├── FinancialManagementPage.tsx
│           ├── SearchPage.tsx
│           ├── NotificationsPage.tsx
│           ├── SignUpPage.tsx
│           ├── MyAppointmentsPage.tsx
│           ├── MedicationsPage.tsx
│           ├── MyReviewsPage.tsx
│           ├── SupportTicketsPage.tsx
│           ├── RatingsPage.tsx
│           ├── DentocadPage.tsx
│           ├── PatientQueuePage.tsx
│           ├── DoctorManagementPage.tsx
│           ├── DoctorSchedulePage.tsx
│           ├── DoctorProfilePage.tsx
│           ├── UpcomingRemindersPage.tsx
│           ├── PatientMedicalHistoryPage.tsx
│           ├── AppointmentsAnalyticsPage.tsx
│           ├── UnauthorizedPage.tsx
│           └── not-found.tsx
├── server/                          # Backend (Express)
│   ├── index.ts                     # Main entry (206 lines)
│   ├── mongodb.ts                   # Backward-compat shim (re-exports models)
│   ├── storage.ts                   # Legacy storage layer (still used by auth middleware)
│   ├── websocket.ts                 # Socket.IO setup
│   ├── vite.ts                      # Vite dev integration
│   ├── db/
│   │   ├── connection.ts            # MongoDB connection + GridFS init
│   │   └── seed.ts                  # Seed admin + clinics + prices
│   ├── models/                      # Mongoose schemas (13 files)
│   │   ├── user.model.ts
│   │   ├── patient.model.ts
│   │   ├── doctor.model.ts
│   │   ├── appointment.model.ts
│   │   ├── clinic.model.ts
│   │   ├── clinic-price.model.ts
│   │   ├── diagnosis-record.model.ts
│   │   ├── treatment-plan.model.ts
│   │   ├── visit-session.model.ts
│   │   ├── payment.model.ts
│   │   ├── notification.model.ts
│   │   ├── rating.model.ts
│   │   └── audit-log.model.ts
│   ├── repositories/                # Data access layer (8 files)
│   │   ├── user.repo.ts
│   │   ├── patient.repo.ts
│   │   ├── doctor.repo.ts
│   │   ├── appointment.repo.ts
│   │   ├── clinic.repo.ts           # + ClinicPriceRepo + TreatmentPlanRepo
│   │   ├── payment.repo.ts          # + VisitSessionRepo
│   │   ├── notification.repo.ts
│   │   └── rating.repo.ts
│   ├── services/
│   │   ├── auth.service.ts          # Password hashing + user lookup
│   │   └── notification.service.ts  # All notification triggers
│   ├── middleware/
│   │   ├── auth.ts                  # requireAuth, requireRole, RBAC helpers
│   │   └── validation.ts            # Zod schemas for request validation
│   ├── routes/                      # API Routes (12 files)
│   │   ├── index.ts                 # Route registration + /health
│   │   ├── auth.routes.ts           # /auth/*
│   │   ├── ai.routes.ts             # /ai/* (28KB - core AI logic)
│   │   ├── appointments.routes.ts   # /appointments/*
│   │   ├── patients.routes.ts       # /patients/* + treatment plans
│   │   ├── doctors.routes.ts        # /doctors/*
│   │   ├── clinics.routes.ts        # /clinics/*
│   │   ├── payments.routes.ts       # /payments, /visit-sessions, /clinic-prices
│   │   ├── dashboard.routes.ts      # /dashboard/*
│   │   ├── admin.routes.ts          # /admin/* (admin only)
│   │   ├── ratings.routes.ts        # /ratings/*
│   │   └── notifications.routes.ts  # /notifications/*
│   ├── utils/
│   │   ├── logger.ts                # Winston logger
│   │   ├── auditLogger.ts           # Audit trail
│   │   ├── errorHandler.ts          # Global error middleware
│   │   └── gridfsStorage.ts         # X-Ray file storage (GridFS)
│   └── scripts/
│       ├── seedClinics.ts           # Seed clinic data
│       └── seedDemo.ts              # Seed demo users/data
├── .env                             # Environment variables
├── .env.example                     # Template for .env
├── package.json
├── vite.config.ts                   # Vite config (without Replit plugins)
├── tailwind.config.ts
├── tsconfig.json
├── Dockerfile                       # Production Docker
├── Dockerfile.dev                   # Development Docker
├── docker-compose.yml               # Docker Compose setup
└── design_guidelines.md             # UI/UX design rules
```

---

## 👥 User Roles & RBAC

| الدور | المعرف | الصلاحيات |
|-------|--------|----------|
| **مريض** | `patient` | حجز مواعيد، عرض سجله، الدفع، التشخيص الذكي، الشات بوت |
| **طالب** | `student` | مثل المريض + عرض بيانات طبية محدودة |
| **طبيب** | `doctor` | كل صلاحيات المريض + إدارة المرضى + الخطط العلاجية + الأسعار + التقارير |
| **إمتياز** | `graduate` | مثل الطبيب بدون صلاحية الأسعار الحصرية |
| **مسؤول** | `admin` | كل الصلاحيات + لوحة الإدارة + الأوديت |

### RBAC Middleware (`server/middleware/auth.ts`)

```typescript
// Guards (server-side)
requireAuth                   // Any logged-in user
requireRole(...roles)         // Specific role(s) — blocks if not matched
requireAdmin                  // admin only
requireDoctor                 // doctor | graduate
requireMedicalStaff           // doctor | graduate | student

// Helpers
getPatientIdFromUserId(userId)               // Returns patientId from session userId
getDoctorIdFromUserId(userId)               // Returns doctorId from session userId
canAccessPatient(userId, userType, patientId) // RBAC check for patient data access
validatePatientAccess(paramName?)           // Middleware version of canAccessPatient

// Constants
USER_TYPES = { PATIENT, DOCTOR, STUDENT, GRADUATE, ADMIN }
```

### Frontend Route Guards (`client/src/components/ProtectedRoute.tsx`)

```typescript
<ProtectedRoute>        // Any logged-in user
<AdminRoute>           // admin only
<DoctorRoute>          // doctor | graduate
<MedicalStaffRoute>    // doctor | graduate | student
<DoctorOnlyRoute>      // doctor ONLY (strict)
<PatientRoute>         // patient | student
```

---

## 🌐 API Endpoints

### Base URL: `http://localhost:5000/api/v1/`
> Backward compatible: `/api/` also works

### 🔐 Auth Routes — `/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | تسجيل مستخدم جديد |
| POST | `/auth/login` | ❌ | تسجيل الدخول (`identifier` = email أو username) |
| POST | `/auth/logout` | ✅ | تسجيل الخروج |
| GET | `/auth/me` | ✅ | بيانات المستخدم الحالي |

**Rate Limit:** 10 requests/15 min على login/register  
**Login Field:** يُرسَل كـ `identifier` (يقبل email أو username)

### 👤 Patients Routes — `/patients`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/patients` | ✅ | قائمة المرضى (filtered by role) |
| GET | `/patients/:id` | ✅ | بيانات مريض بالـ ID |
| GET | `/patients/user/:userId` | ✅ | بيانات مريض بالـ userId |
| POST | `/patients` | Medical Staff | إنشاء سجل مريض جديد |
| PUT | `/patients/:id` | ✅ | تحديث بيانات مريض |
| GET | `/patients/:patientId/treatment-plan` | ✅ | الخطة العلاجية للمريض |
| PUT | `/patients/:patientId/treatment-plan` | Medical Staff | تحديث/إنشاء خطة علاجية |

### 📅 Appointments Routes — `/appointments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/appointments` | ✅ | مواعيدي (filtered by role) |
| GET | `/appointments/:id` | ✅ | موعد محدد |
| GET | `/appointments/patient/:patientId` | ✅ | مواعيد مريض |
| GET | `/appointments/doctor/:doctorId` | Doctor | مواعيد طبيب |
| GET | `/appointments/doctor/today` | Doctor | مواعيد اليوم |
| POST | `/appointments` | ✅ | حجز موعد جديد |
| PUT | `/appointments/:id` | ✅ | تعديل موعد |
| POST | `/appointments/:id/mark-attended` | Doctor | تأكيد حضور → ينشئ جلسة + فاتورة تلقائية |

**Conflict Detection:** يمنع حجز نفس الوقت لنفس الطبيب (409)

### 🤖 AI Routes — `/ai`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ai/chat` | ❌ (optional) | شات بوت طبي |
| POST | `/ai/diagnosis` | ✅ | تشخيص ذكي بالأعراض ± أشعة |
| GET | `/ai/diagnosis/patient/:userId` | Medical Staff | سجلات تشخيص مريض |
| GET | `/ai/xray/:fileId` | ✅ | عرض صورة الأشعة من GridFS |
| POST | `/ai/tts` | ❌ | تحويل النص لصوت (Gemini TTS) |

**Rate Limit:** 20 AI requests/hour

**AI Models Used:**
- Chat + Diagnosis: `gemini-2.5-flash`
- Text-to-Speech: `gemini-2.5-flash-preview-tts`
  - صوت عربي: `Kore` (أنثى طبيعي)
  - صوت إنجليزي: `Aoede` (أنثى طبيعي)

### 💳 Payments & Finance Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/visit-sessions` | Medical Staff | كل الجلسات |
| GET | `/visit-sessions/patient/:patientId` | ✅ | جلسات مريض |
| POST | `/visit-sessions` | Doctor | إنشاء جلسة |
| POST | `/visit-sessions/:id/attend` | Doctor | تسجيل حضور |
| GET | `/payments` | Doctor | كل المدفوعات |
| GET | `/payments/patient/:patientId` | ✅ | مدفوعات مريض |
| POST | `/payments` | Doctor Only | إنشاء فاتورة |
| GET | `/patient/:patientId/balance` | ✅ | رصيد المريض |
| GET | `/clinic-prices` | ✅ | أسعار العيادات |
| GET | `/clinic-prices/:clinicId` | ✅ | سعر عيادة محددة |
| PUT | `/clinic-prices/:clinicId` | Doctor | تعديل سعر عيادة |

**Default Session Price:** 500 EGP

### ⭐ Ratings Routes — `/ratings`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ratings/doctor/:doctorId` | ✅ | تقييمات طبيب |
| POST | `/ratings` | Patient | إضافة تقييم |

### 🔔 Notifications Routes — `/notifications`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | ✅ | إشعاراتي |
| PUT | `/notifications/:id/read` | ✅ | تحديد كمقروء |
| PUT | `/notifications/read-all` | ✅ | تحديد كلها كمقروءة |
| DELETE | `/notifications/:id` | ✅ | حذف إشعار |

### 📊 Dashboard Routes — `/dashboard`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/stats` | ✅ | إحصاءات عامة |
| GET | `/dashboard/doctor` | Doctor | إحصاءات الطبيب |

### 🏥 Clinics Routes — `/clinics`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/clinics` | ✅ | قائمة العيادات |
| GET | `/clinics/:id` | ✅ | تفاصيل عيادة |

### 👨‍⚕️ Doctors Routes — `/doctors`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/doctors` | ✅ | قائمة الأطباء |
| GET | `/doctors/:id` | ✅ | بيانات طبيب |
| GET | `/doctors/clinic/:clinicId` | ✅ | أطباء عيادة |

### 🛡️ Admin Routes — `/admin`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | Admin | كل المستخدمين |
| PUT | `/admin/users/:id` | Admin | تعديل مستخدم |
| DELETE | `/admin/users/:id` | Admin | حذف مستخدم |
| GET | `/admin/audit-logs` | Admin | سجل الأوديت |

### 🏥 Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | حالة السيرفر + DB |

---

## 🗄️ Database Models (MongoDB/Mongoose)

### 1. User Model (`user.model.ts`)
```typescript
{
  username: String (unique)
  password: String (bcrypt hashed)
  fullName: String
  email: String (optional, unique)
  phone: String (optional)
  userType: 'patient' | 'doctor' | 'student' | 'graduate' | 'admin'
  createdAt: Date
}
```

### 2. Patient Model (`patient.model.ts`)
```typescript
{
  assignedToUserId: String (ref User)
  fullName: String
  phone: String
  clinicId: String
  medicalHistory: [String]
  allergies: [String]
  bloodType: String
  createdAt: Date
}
```

### 3. Doctor Model (`doctor.model.ts`)
```typescript
{
  userId: String (ref User)
  fullName: String
  specialization: String
  clinicId: String
  rating: Number (0-5)
  reviewCount: Number
  isAvailable: Boolean
  bio: String
  createdAt: Date
}
```

### 4. Appointment Model (`appointment.model.ts`)
```typescript
{
  patientId: String (ref Patient)
  doctorId: String (ref Doctor)
  date: String (YYYY-MM-DD)
  time: String (HH:MM)
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  notes: String
  clinicId: String
  createdAt: Date
}
```

### 5. Treatment Plan Model (`treatment-plan.model.ts`)
```typescript
{
  patientId: String
  doctorId: String
  doctorName: String
  title: String
  description: String
  status: 'active' | 'completed' | 'paused'
  planStartDate: String
  estimatedDuration: String
  procedures: [{
    name: String
    description: String
    status: 'pending' | 'in-progress' | 'completed'
    date: String
  }]
  appointments: [{
    type: String
    clinic: String
    date: String
    time: String
  }]
  notes: String
  createdAt: Date
  updatedAt: Date
}
```

### 6. Diagnosis Record Model (`diagnosis-record.model.ts`)
```typescript
{
  userId: String (ref User)
  patientId: String (optional)
  answers: Object (symptom answers)
  conditions: [{
    name: String
    nameEn: String
    conditionKey: String
    probability: Number
    description: String
  }]
  recommendations: [String]
  urgency: 'high' | 'medium' | 'low'
  confidence: Number (0-100)
  suggestedClinic: {
    id: String
    name: String
    nameAr: String
    nameEn: String
  }
  estimatedTreatmentTime: String
  xrayFileId: String (GridFS)
  xrayFilename: String
  deletedAt: Date
  createdAt: Date
}
```

### 7. Visit Session Model (`visit-session.model.ts`)
```typescript
{
  appointmentId: String
  patientId: String
  doctorId: String
  clinicId: String
  sessionDate: String
  attendanceStatus: 'pending' | 'attended' | 'absent'
  price: Number
  notes: String
  createdAt: Date
}
```

### 8. Payment Model (`payment.model.ts`)
```typescript
{
  patientId: String
  sessionId: String
  amount: Number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  method: String
  paidAt: Date
  createdAt: Date
}
```

### 9. Notification Model (`notification.model.ts`)
```typescript
{
  userId: String
  title: String
  titleEn: String
  message: String
  messageEn: String
  type: 'appointment' | 'payment' | 'treatment' | 'system' | 'reminder'
  isRead: Boolean
  relatedEntityType: String   // e.g. 'Appointment', 'TreatmentPlan', 'Rating'
  relatedEntityId: String
  createdAt: Date             // TTL: auto-deletes after 30 days
}
```

### 10. Rating Model (`rating.model.ts`)
```typescript
{
  patientId: String
  doctorId: String
  rating: Number (1-5)
  comment: String
  appointmentId: String
  createdAt: Date
}
```

### 11. Clinic Model (`clinic.model.ts`)
```typescript
{
  id: String (unique key, e.g. 'diagnosis', 'conservative')
  nameAr: String
  nameEn: String
  descriptionAr: String
  descriptionEn: String
  icon: String
  isActive: Boolean
}
```

### 12. Clinic Price Model (`clinic-price.model.ts`)
```typescript
{
  clinicId: String
  sessionPrice: Number
  updatedBy: String
  updatedAt: Date
}
```

### 13. Audit Log Model (`audit-log.model.ts`)
```typescript
{
  userId: String
  action: String (e.g. 'LOGIN', 'CREATE_APPOINTMENT')  // SCREAMING_SNAKE_CASE
  entityType: String
  entityId: String
  previousData: Object
  newData: Object
  ipAddress: String
  userAgent: String
  createdAt: Date  // TTL: auto-deletes after 90 days
}
```

---

## 🏥 العيادات المتاحة (10 عيادات)

| المعرف | الاسم العربي | الاسم الإنجليزي |
|--------|-------------|----------------|
| `diagnosis` | التشخيص والأشعة | Diagnosis & Radiology |
| `conservative` | العلاج التحفظي | Conservative Treatment |
| `surgery` | جراحة الفم والفكين | Oral & Maxillofacial Surgery |
| `removable` | التركيبات المتحركة | Removable Prosthetics |
| `fixed` | التركيبات الثابتة | Fixed Prosthetics |
| `gums` | اللثة | Periodontics |
| `cosmetic` | تجميل الأسنان | Cosmetic Dentistry |
| `implants` | زراعة الأسنان | Dental Implants |
| `orthodontics` | تقويم الأسنان | Orthodontics |
| `pediatric` | أسنان الأطفال | Pediatric Dentistry |

---

## 🤖 AI System Details

### 1. شات بوت طبي (`POST /ai/chat`)
- **النموذج:** `gemini-2.5-flash`
- **System Prompt:** متخصص في عيادة الأسنان، يعرف كل العيادات والأسعار وساعات العمل
- **الميزات:**
  - يدعم الصور (X-Ray)
  - يحفظ تاريخ المحادثة (حتى 10 رسائل)
  - يقترح العيادة المناسبة تلقائياً
  - يعمل بدون تسجيل دخول (للزوار)
  - Prompt injection protection

### 2. التشخيص الذكي (`POST /ai/diagnosis`)
- **النموذج:** `gemini-2.5-flash`
- **المدخلات:**
  - `answers`: إجابات استبيان الأعراض
  - `symptomSummary`: وصف نصي
  - `xrayImage`: صورة أشعة (base64) — اختيارية
  - `language`: ar | en
- **المخرجات (JSON):**
  ```json
  {
    "conditions": [{"name", "probability", "description"}],
    "recommendations": [],
    "urgency": "high|medium|low",
    "confidence": 0-100,
    "suggestedClinic": {"id", "name"},
    "estimatedTreatmentTime": "30-45 mins",
    "disclaimer": {...},
    "requiresHumanReview": boolean,
    "diagnosisRecordId": "..."
  }
  ```
- **الأمان:**
  - Max image size: 10MB
  - Allowed MIME: png, jpeg, webp, gif
  - X-Ray stored in GridFS
  - Audit logging لكل تشخيص
  - إذا confidence < 70% أو urgency = high → `requiresHumanReview = true`

### 3. Voice Chat + TTS (`POST /ai/tts`)
- **النموذج:** `gemini-2.5-flash-preview-tts`
- **الصوت العربي:** `Kore` (أنثى، طبيعي)
- **الصوت الإنجليزي:** `Aoede` (أنثى، طبيعي)
- **مخرج:** base64 audio (WAV)
- **الحد الأقصى:** 800 حرف للنص

---

## 🔔 Notification System

### Notification Triggers (`notification.service.ts`)

> **قاعدة أساسية:** NotificationService لا يرمي exceptions أبداً — فشل الإشعار لا يوقف أي عملية تجارية.

| Method | المُشغِّل | المستلمون |
|--------|----------|----------|
| `onAppointmentBooked(appointment)` | `POST /appointments` | المريض + الطبيب |
| `onAppointmentStatusChanged(appointment)` | `PUT /appointments/:id` | المريض |
| `onVisitCompleted(data)` | `POST /appointments/:id/mark-attended` | المريض (مع المبلغ المستحق) |
| `onTreatmentPlanUpdated(data)` | `PUT /patients/:id/treatment-plan` | المريض |
| `onRatingSubmitted(data)` | `POST /ratings` | الطبيب |

**الإشعار يحتوي على:** `title` / `titleEn`, `message` / `messageEn`, `type`, `relatedEntityType`, `relatedEntityId`

### Notification Bell (Frontend)
**Component:** `client/src/components/common/NotificationBell.tsx`
- Polls `/api/v1/notifications` كل 30 ثانية
- يعرض badge بعدد غير المقروء
- يتصل بـ WebSocket room `user:${userId}` للتحديث الفوري

### WebSocket Events (Socket.IO)
```javascript
// Client joins rooms on connect
socket.join(`user:${userId}`)          // Personal notifications
socket.join(`role:${userType}`)        // Role-wide broadcasts
socket.join(`doctor-queue:${doctorId}`) // Doctor's patient queue

// Server → Client events
'notification'           // New notification created
'appointment-update'     // Appointment status changed
'patient-queue-update'   // Patient added to doctor's queue

// Client → Server events
'join-room'   // Client requests to join a room
'leave-room'  // Client leaves a room
```

---

## 🖥️ Frontend Routing (`App.tsx`)

| المسار | الصفحة | الصلاحية |
|--------|--------|---------|
| `/` | HomePage | الكل |
| `/home` | HomePage | الكل |
| `/appointments` | AppointmentBookingPageNew | Patient |
| `/my-appointments` | MyAppointmentsPage | Patient |
| `/my-medications` | MedicationsPage | Patient |
| `/my-reviews` | MyReviewsPage | Patient |
| `/payment` | PaymentPageNew | Patient |
| `/medical-records` | MedicalRecordsPage | Patient |
| `/treatment-plans` | TreatmentPlanCard | الكل |
| `/treatment-plan-detail` | TreatmentPlanDetailPage | الكل |
| `/ai-diagnosis` | AIDiagnosisPage | الكل |
| `/chat` | ChatBotPage | الكل |
| `/voice-chat` | VoiceChatPage | الكل |
| `/clinics` | ClinicsOverviewPage | الكل |
| `/clinic/:id` | ClinicDetailPage | الكل |
| `/doctors` | DoctorManagementPage | الكل |
| `/ratings` | RatingsPage | الكل |
| `/notifications` | NotificationsPage | الكل |
| `/search` | SearchPage | الكل |
| `/settings` | SettingsPage | الكل |
| `/today-appointments` | TodayAppointmentsPage | Medical Staff |
| `/patients` | PatientList | Medical Staff |
| `/price-management` | PriceManagementPage | Doctor Only |
| `/reports` | ReportsPage | الكل |
| `/financial` | FinancialManagementPage | الكل |
| `/support-tickets` | SupportTicketsPage | الكل |
| `/admin-panel` | AdminPanelPage | Admin |
| `/dentocad` | DentocadPage | الكل |
| `/unauthorized` | UnauthorizedPage | الكل |

---

## 🔐 Security Features

### Server Security
- **Helmet:** CSP, X-Frame-Options, HSTS headers
- **CORS:** Configurable allowed origins
- **Rate Limiting:**
  - General API: 100 req/15min
  - Auth: 10 req/15min
  - AI: 20 req/hour
- **Session Security:**
  - HTTP-only cookies
  - Secure flag in production
  - Session regeneration on login (anti-fixation)
  - 7-day session lifetime
  - MongoDB session store (connect-mongo)
- **Password:** bcrypt hashing (10 rounds)
- **Prompt Injection:** Input sanitization للـ AI
- **Image Validation:** MIME type + size check
- **Audit Logging:** كل عملية مهمة مسجلة

### Data Security
- Admin self-registration blocked (403)
- **Admin login bypass:** Admin يمكنه الدخول باختيار أي دور — التحقق من userType يُتجاوز تلقائياً للـ admin
- Patients can only see their own data
- Doctors can only see/edit their own appointments
- X-Ray ownership verified before serving

---

## 🔧 Services Layer

### AuthService (`server/services/auth.service.ts`)

```typescript
AuthService.hashPassword(plain)           // bcrypt hash (10 rounds)
AuthService.verifyPassword(plain, hashed) // bcrypt compare
AuthService.findUserByIdentifier(str)     // email OR username lookup
AuthService.sanitize(user)               // strips password before sending to client
```

**منطق تحديد نوع المعرف:**
- إذا كان `identifier` يحتوي على `@` → يبحث بالـ `email`
- إذا لم يحتوِ على `@` → يبحث بالـ `username`

### NotificationService (`server/services/notification.service.ts`)

موثق بالكامل في قسم **Notification System** أعلاه.

---

## 🗃️ Repositories Layer

**المسار:** `server/repositories/`  
**النمط:** `Routes → Repositories → Mongoose Models → MongoDB`

### UserRepo
```typescript
UserRepo.findById(id)
UserRepo.findByUsername(username)
UserRepo.findByEmail(email)
UserRepo.findByEmailOrUsername(identifier)   // Login lookup
UserRepo.create(data)
```

### PatientRepo
```typescript
PatientRepo.findById(id)
PatientRepo.findByUserId(userId)
PatientRepo.findAll()
PatientRepo.create(data)
PatientRepo.update(id, data)
PatientRepo.getLinkedUserId(patientId)       // Used by NotificationService
```

### DoctorRepo
```typescript
DoctorRepo.findById(id)
DoctorRepo.findByUserId(userId)
DoctorRepo.findAll()
DoctorRepo.findByClinic(clinicId)
DoctorRepo.create(data)
DoctorRepo.getLinkedUserId(doctorId)         // Used by NotificationService
DoctorRepo.updateRatingStats(id, avg, count) // Called after new rating
```

### AppointmentRepo
```typescript
AppointmentRepo.findById(id)
AppointmentRepo.findAll()
AppointmentRepo.findByPatient(patientId)
AppointmentRepo.findByDoctor(doctorId)
AppointmentRepo.findByDoctorAndDate(doctorId, date)
AppointmentRepo.create(data)
AppointmentRepo.update(id, data)
AppointmentRepo.checkConflict(doctorId, date, time, patientId, excludeId?)
```

### ClinicRepo + ClinicPriceRepo + TreatmentPlanRepo (`clinic.repo.ts`)
```typescript
ClinicRepo.findById(id)
ClinicRepo.findAll()
ClinicPriceRepo.findByClinic(clinicId)
ClinicPriceRepo.upsert(clinicId, price, updatedBy)
TreatmentPlanRepo.findByPatient(patientId)
TreatmentPlanRepo.create(data)
TreatmentPlanRepo.update(id, data)
```

### VisitSessionRepo + PaymentRepo (`payment.repo.ts`)
```typescript
VisitSessionRepo.create(data)
VisitSessionRepo.findByPatient(patientId)
PaymentRepo.findByPatient(patientId)
PaymentRepo.createFromSession(session, createdBy)  // Auto-creates pending payment
PaymentRepo.getPatientBalance(patientId)           // Total pending amount
```

### NotificationRepo
```typescript
NotificationRepo.create(data)
NotificationRepo.findByUser(userId)
NotificationRepo.markRead(id)
NotificationRepo.markAllRead(userId)
NotificationRepo.delete(id)
```

### RatingRepo
```typescript
RatingRepo.findAll()
RatingRepo.findByDoctor(doctorId)
RatingRepo.findByPatient(patientId)
RatingRepo.findById(id)
RatingRepo.create(data)
RatingRepo.update(id, data)
RatingRepo.softDelete(id)
RatingRepo.getDoctorStats(doctorId)   // Returns { avgRating, count }
```

---

## 🛡️ Validation Schemas (`server/middleware/validation.ts`)

```typescript
loginSchema              // identifier (email|username, required) + password + userType?
registerSchema           // username + password + fullName + email? + userType + ...
createPatientSchema      // fullName + age? + phone? + email? + clinicId?
createAppointmentSchema  // patientId? + doctorId + date + time + notes?
updateAppointmentSchema  // status? + notes? + date? + time?
createPaymentSchema      // patientId + amount + paymentMethod + notes?
createVisitSessionSchema // appointmentId? + patientId + doctorId + clinicId + sessionDate + ...
aiDiagnosisSchema        // answers + symptomSummary? + xrayImage? + language + patientId?
clinicPriceSchema        // sessionPrice
idParamSchema            // id (min 1)
```

**Password Rules (registerSchema):**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- *(No special character requirement)*

---

## ⚙️ Environment Variables

```env
# Required
MONGODB_URI=mongodb+srv://...         # MongoDB Atlas connection
SESSION_SECRET=<64+ chars>            # Session encryption key
GEMINI_API_KEY=your_key               # Google AI API key

# Server
PORT=5000
NODE_ENV=development|production
ALLOWED_ORIGINS=http://localhost:5000

# Optional
LOG_LEVEL=info
LOG_DIR=logs

# Future (not yet implemented)
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   # Email notifications
STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY    # Payment gateway
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY     # External file storage
```

---

## 📁 File Upload System (GridFS)

**Used for:** X-Ray images from AI Diagnosis

| Detail | Value |
|--------|-------|
| Storage | MongoDB GridFS |
| Allowed MIME types | `image/png`, `image/jpeg`, `image/webp`, `image/gif` |
| Max file size | 10 MB |
| View endpoint | `GET /api/v1/ai/xray/:fileId` |
| Auth required | ✅ (ownership verified) |
| Field in DiagnosisRecord | `xrayFileId` (GridFS ObjectId) |
| Helper file | `server/utils/gridfsStorage.ts` |

**Initialization:** GridFS is initialized automatically after MongoDB connects in `server/db/connection.ts`

---

## 📋 Session Configuration

```typescript
// server/index.ts
session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  },
})
```

---

## 🚀 Running the Project

```powershell
# التشغيل (Development)
npm run dev           # Server + Vite dev server on port 5000

# Build (Production)
npm run build         # Vite build + esbuild

# Seed Data
npm run seed:clinics  # إضافة العيادات
npm run seed:demo     # إضافة بيانات تجريبية

# Seed Admin + Clinics + Prices (fresh database)
npx tsx server/db/seed.ts

# TypeScript Check
npm run check

# Docker
docker-compose up -d
```

**Default Port:** `5000`  
**URL:** `http://localhost:5000`

---

## 🌱 Seed Script (`server/db/seed.ts`)

**التشغيل:** `npx tsx server/db/seed.ts`

| البيانات | التفاصيل |
|---------|---------|
| **Admin User** | username: `Abdelazez`, email: `abdelazezhamoud3@gmail.com`, userType: `admin` |
| **10 Clinics** | بالأسماء العربية والإنجليزية والألوان والأيقونات |
| **10 Clinic Prices** | السعر الافتراضي: 500 EGP لكل عيادة |

- ✅ **آمن للتشغيل المتكرر** — يتجاهل البيانات الموجودة ولا يعيد إنشاءها
- ✅ كلمة مرور الـ Admin مشفرة بـ bcrypt تلقائياً
- ✅ يُغلق الاتصال بـ MongoDB عند الانتهاء

---

## 🐳 Docker Setup

### Dockerfile (Production)
Multi-stage build: Stage 1 بناء Vite frontend → Stage 2 تشغيل Express مع الملفات المبنية

### Dockerfile.dev (Development)
Single stage مع hot reload عبر `tsx watch`

### docker-compose.yml
```yaml
services:
  app:
    build: Dockerfile.dev
    ports: "5000:5000"
    env_file: .env
    volumes: .:/app  # hot reload
# ملاحظة: MongoDB خارجي (Atlas) — غير مُضمَّن في docker-compose
```

---

## 🎨 UI/UX Design System

### Features
- **Dual Language:** عربي (RTL) / English (LTR) — يتغير الاتجاه بالكامل
- **Dark/Light Mode:** يُحفظ في localStorage
- **Breadcrumbs:** تلقائية لكل صفحة
- **Keyboard Shortcuts:** Alt+← (Back), Ctrl+Home (Home), Escape (Back)
- **Loading States:** Skeleton loaders + Spinner
- **Error Boundary:** يصيد الأخطاء ويعرض fallback
- **Floating Chatbot:** يظهر للمريض فقط في كل الصفحات
- **Notification Bell:** Real-time في الهيدر

### Key Components
- **AppSidebar:** يتغير بناءً على الدور (RBAC-aware nav)
- **PatientReportsModal:** يعرض AI Diagnosis + Treatment Plan + Medical History للطبيب
- **EditTreatmentPlanDialog:** الطبيب يعدل الخطة العلاجية
- **FloatingChatbot:** زر شناب للمريض في كل الصفحات

### Frontend Contexts
```typescript
// AuthContext
const { user, isLoading, refetch } = useAuth();
// user = null if not logged in — refetch() re-calls /api/auth/me

// LanguageContext
const { language, setLanguage, isRTL } = useLanguage();
// language = 'ar' | 'en' — stored in localStorage
```

---

## 📝 Mock Data (Demo Mode)

### ما تم تطبيقه مؤقتاً للعرض التوضيحي:

**1. `AppointmentBookingPageNew.tsx`**  
بعد حجز الموعد بنجاح → يظهر Dialog بـ:
- خطة علاجية mock (5 مراحل بتواريخ)
- تاريخ طبي mock (سجلات + أدوية + متابعات)

**2. `MedicalRecordsPage.tsx`**  
تعرض mock data للمريض:
- 4 سجلات طبية
- 3 أدوية
- 3 متابعات

**3. `PatientReportsModal.tsx`** (عند الطبيب)  
Fallback تلقائي إذا لم تجد بيانات في DB:
- Treatment Plan: 5 إجراءات mock
- Medical Records: 3 سجلات + 2 دواء mock
- AI Diagnosis: حقيقي من قاعدة البيانات ✅

---

## 🔄 Workflow: Auth (Login & Register)

### Login Flow
```
1. Frontend sends: POST /api/auth/login
   { identifier: "email@domain.com OR username", password: "...", userType: "patient" }

2. loginSchema validates (Zod) — identifier required, min 1 char

3. AuthService.findUserByIdentifier(identifier)
   └── Contains '@'? → search by email
   └── No '@'?  → search by username

4. Password verified with bcrypt

5. userType check (if provided):
   └── Admin accounts BYPASS this check automatically
   └── Non-admins must match their registered userType

6. Session regenerated (anti-fixation)
7. Session stored in MongoDB (connect-mongo), 7-day lifetime
8. Response: sanitized user object (password stripped)
```

### Registration Flow
```
1. Frontend sends: POST /api/auth/register
   { username, password, fullName, email?, phone?, userType, specialization?, clinicId? }

2. Admin self-registration → BLOCKED (403)

3. Username uniqueness check → UserRepo.findByUsername()
4. Email uniqueness check (if provided) → UserRepo.findByEmail()

5. Password hashed with bcrypt (10 rounds)

6. UserModel created

7. Auto-create linked profile:
   ├── doctor | graduate → DoctorRepo.create()
   └── patient | student → PatientRepo.create()

8. Session started immediately (auto-login after register)
```

---

## 🔄 Workflow: Appointment → Payment

```
1. Patient books appointment (POST /appointments)
   ├── AppointmentRepo.checkConflict() → 409 if double-booking
   └── NotificationService.onAppointmentBooked()
       ├── Notify patient: "تم حجز موعدك"
       └── Notify doctor: "لديك موعد جديد"

2. Doctor confirms attendance (POST /appointments/:id/mark-attended)
   ├── ClinicPriceRepo.findByClinic() → sessionPrice (default 500 EGP)
   ├── VisitSessionRepo.create()
   ├── PaymentRepo.createFromSession() ← AUTO PAYMENT CREATION (status: pending)
   ├── AppointmentRepo.update(status: 'completed')
   └── NotificationService.onVisitCompleted()
       └── Notify patient: "زيارتك مكتملة، المبلغ المستحق: X EGP"

3. Patient pays (POST /payments)
   └── Payment status → 'paid'
```

---

## 🔄 Workflow: AI Diagnosis

```
1. Patient fills symptom questionnaire in AIDiagnosisPage
2. Optional: Upload X-Ray image
3. POST /ai/diagnosis
   ├── Validate image (MIME, size ≤ 10MB)
   ├── Upload X-Ray to GridFS
   ├── Sanitize inputs (anti-injection)
   ├── Call Gemini 2.5 Flash
   ├── Parse + validate JSON response
   ├── Save DiagnosisRecord to MongoDB
   └── Return: conditions, urgency, confidence, suggestedClinic

4. Doctor views via PatientReportsModal
   └── GET /ai/diagnosis/patient/:userId
       └── Only accessible to: doctor | student | graduate | admin
```

---

## 📊 Data Repository Pattern

```
Routes → Repositories → Mongoose Models → MongoDB

UserRepo          → User Model
PatientRepo       → Patient Model
DoctorRepo        → Doctor Model
AppointmentRepo   → Appointment Model
ClinicRepo        → Clinic Model
ClinicPriceRepo   → ClinicPrice Model
TreatmentPlanRepo → TreatmentPlan Model
VisitSessionRepo  → VisitSession Model
PaymentRepo       → Payment Model
NotificationRepo  → Notification Model
RatingRepo        → Rating Model
```

---

## 📌 API Conventions

### Response Format
```typescript
// Success
res.json(data)                 // Direct data object
res.status(201).json(data)     // Created

// Errors
res.status(400).json({ message: "..." })   // Bad request
res.status(401).json({ message: "..." })   // Unauthenticated
res.status(403).json({ message: "..." })   // Forbidden
res.status(404).json({ message: "..." })   // Not found
res.status(409).json({ message: "..." })   // Conflict (double booking)

// Validation Error (from validation middleware)
res.status(400).json({
  success: false,
  message: "Invalid body",
  errors: [{ field: "...", message: "..." }]
})
```

### Audit Logging
```typescript
await logAudit({
  userId,
  action: 'CREATE_APPOINTMENT',   // SCREAMING_SNAKE_CASE
  entityType: 'Appointment',
  entityId: appointment.id,
  previousData: {},
  newData: {},
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
})
```
- **TTL:** سجلات الأوديت تُحذف تلقائياً بعد **90 يوماً**
- **وصول:** Admin فقط عبر `GET /api/v1/admin/audit-logs`
- **Notification TTL:** الإشعارات تُحذف تلقائياً بعد **30 يوماً**

---

## 🔑 Admin Account Notes

- **لا يمكن إنشاء Admin عبر فورم التسجيل** (blocked with 403)
- **Admin login bypass:** يمكن للـ admin الدخول باختيار أي دور في الصفحة — التحقق من userType يُتجاوز تلقائياً
- **Admin يُنشأ حصرياً** عبر seed script: `npx tsx server/db/seed.ts`
- **Admin panel route:** `/admin-panel` — `AdminRoute` guard

---

## 🧪 Testing Credentials (After Seed)

| الحقل | القيمة |
|-------|-------|
| Username | `Abdelazez` |
| Email | `abdelazezhamoud3@gmail.com` |
| Role | `admin` |
| Login Method | Email OR Username (both work) |
| Login Field | `identifier` (not `email`) |

---

## 🐛 Known Issues & Notes

1. **AI Features:** تتطلب `GEMINI_API_KEY` في `.env` — بدونه الخدمة ترجع 503
2. **Mock Data:** الخطة العلاجية والسجل الطبي في الـ PatientReportsModal هم mock data حتى يتم ربطهم بـ DB حقيقي
3. **Treatment Plans في DB:** يحتاج الطبيب يضيف الخطة أولاً عبر `EditTreatmentPlanDialog` حتى تظهر البيانات الحقيقية
4. **Replit Plugins:** تمت إزالتها من `vite.config.ts` لمنع ظهور الـ banner
5. **PowerShell:** عند أول تشغيل على Windows قد تحتاج `Set-ExecutionPolicy RemoteSigned`
6. **storage.ts (Legacy):** لا تزال مستخدمة في `auth.ts` middleware للـ `getPatientByUserId` و `getDoctorByUserId` — لم تُهاجَر بالكامل بعد للـ repositories

---

## 📦 Scripts

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Seed clinics to database
npm run seed:clinics

# Seed demo data (users + appointments)
npm run seed:demo

# Seed admin + clinics + prices (fresh DB setup)
npx tsx server/db/seed.ts

# TypeScript type check
npm run check

# Docker
docker-compose up -d
```

---

*آخر تحديث: 2026-05-31*  
*الإصدار: 1.0.0*
