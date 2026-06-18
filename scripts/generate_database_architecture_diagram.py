from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_database_architecture_figure_5_3.png"

W, H = 2500, 1850
BG = "#F8FAFC"
INK = "#172033"
MUTED = "#5B6472"
LINE = "#64748B"
WHITE = "#FFFFFF"
BLUE = "#DBEAFE"
BLUE_EDGE = "#2563EB"
GREEN = "#DCFCE7"
GREEN_EDGE = "#16A34A"
AMBER = "#FEF3C7"
AMBER_EDGE = "#D97706"
VIOLET = "#EDE9FE"
VIOLET_EDGE = "#7C3AED"
ROSE = "#FFE4E6"
ROSE_EDGE = "#E11D48"
CYAN = "#CFFAFE"
CYAN_EDGE = "#0891B2"
SLATE = "#F1F5F9"


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


TITLE = font(54, True)
SUBTITLE = font(27)
GROUP = font(30, True)
HEAD = font(23, True)
BODY = font(17)
SMALL = font(17)


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def group_box(draw, box, title, edge):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=26, fill=WHITE, outline=edge, width=5)
    draw.text((x1 + 28, y1 + 18), title, font=GROUP, fill=INK)
    draw.line((x1 + 24, y1 + 66, x2 - 24, y1 + 66), fill=edge, width=3)


def collection(draw, box, title, body, fill, edge):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=18, fill=fill, outline=edge, width=4)
    draw.text((x1 + 22, y1 + 16), title, font=HEAD, fill=INK)
    if body:
        draw.multiline_text(
            (x1 + 22, y1 + 53),
            wrap(draw, body, BODY, x2 - x1 - 44),
            font=BODY,
            fill=MUTED,
            spacing=6,
        )


def center(box):
    x1, y1, x2, y2 = box
    return ((x1 + x2) // 2, (y1 + y2) // 2)


def arrow(draw, start, end, color=LINE, width=4):
    import math

    x1, y1 = start
    x2, y2 = end
    draw.line((x1, y1, x2, y2), fill=color, width=width)
    ang = math.atan2(y2 - y1, x2 - x1)
    length = 18
    spread = 0.48
    p1 = (x2 - length * math.cos(ang - spread), y2 - length * math.sin(ang - spread))
    p2 = (x2 - length * math.cos(ang + spread), y2 - length * math.sin(ang + spread))
    draw.polygon([(x2, y2), p1, p2], fill=color)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

draw.text((90, 55), "Figure 5.3: Dento Database Architecture", font=TITLE, fill=INK)
draw.text(
    (92, 122),
    "MongoDB document design with Mongoose models for users, clinical workflows, appointments, billing, notifications, GridFS files, and sessions.",
    font=SUBTITLE,
    fill=MUTED,
)

access_group = (90, 215, 2410, 430)
identity_group = (90, 510, 800, 900)
clinical_group = (890, 510, 1600, 900)
operations_group = (1690, 510, 2410, 1045)
support_group = (90, 1125, 1170, 1420)
storage_group = (1260, 1125, 2410, 1420)
relationships_group = (90, 1485, 2410, 1715)

group_box(draw, access_group, "Database Access Pattern", ROSE_EDGE)
group_box(draw, identity_group, "Identity and Profiles", BLUE_EDGE)
group_box(draw, clinical_group, "Clinical Data", VIOLET_EDGE)
group_box(draw, operations_group, "Appointments and Billing", AMBER_EDGE)
group_box(draw, support_group, "Communication and Audit", GREEN_EDGE)
group_box(draw, storage_group, "Storage and Persistence Support", CYAN_EDGE)
group_box(draw, relationships_group, "Key Database Relationships", LINE)

route = (140, 310, 500, 390)
repo_access = (560, 310, 920, 390)
mongoose = (980, 310, 1340, 390)
mongo_main = (1400, 310, 1760, 390)
gridfs_access = (1820, 310, 2130, 390)
session_access = (2180, 310, 2360, 390)

collection(draw, route, "Backend Routes", "API modules request data operations", ROSE, ROSE_EDGE)
collection(draw, repo_access, "Repositories", "centralized data access functions", ROSE, ROSE_EDGE)
collection(draw, mongoose, "Mongoose Models", "schemas, indexes, validation", ROSE, ROSE_EDGE)
collection(draw, mongo_main, "MongoDB", "primary document database", ROSE, ROSE_EDGE)
collection(draw, gridfs_access, "GridFS", "X-ray file storage", ROSE, ROSE_EDGE)
collection(draw, session_access, "Sessions", "MongoStore session data", ROSE, ROSE_EDGE)
arrow(draw, (500, 350), (560, 350), ROSE_EDGE)
arrow(draw, (920, 350), (980, 350), ROSE_EDGE)
arrow(draw, (1340, 350), (1400, 350), ROSE_EDGE)
arrow(draw, (1760, 350), (1820, 350), ROSE_EDGE)
arrow(draw, (2130, 350), (2180, 350), ROSE_EDGE)

user = (130, 620, 370, 745)
patient = (420, 620, 760, 745)
doctor = (420, 770, 760, 875)

collection(draw, user, "User", "username, password, fullName, userType, status", BLUE, BLUE_EDGE)
collection(draw, patient, "Patient", "profile, medicalHistory, clinicId, assignedToUserId", BLUE, BLUE_EDGE)
collection(draw, doctor, "Doctor", "specialization, clinicId, userId, rating, availability", BLUE, BLUE_EDGE)

diagnosis = (930, 620, 1235, 745)
treatment = (1265, 620, 1570, 745)
medical = (930, 770, 1235, 875)
medication = (1265, 770, 1570, 875)

collection(draw, diagnosis, "DiagnosisRecord", "symptom answers, preliminary findings, urgency, confidence, xrayFileId", VIOLET, VIOLET_EDGE)
collection(draw, treatment, "TreatmentPlan", "procedures, appointments, reviewStatus, approval data", VIOLET, VIOLET_EDGE)
collection(draw, medical, "MedicalRecord", "patient history and clinical record data", VIOLET, VIOLET_EDGE)
collection(draw, medication, "Medication", "patient medication and follow-up support", VIOLET, VIOLET_EDGE)

clinic = (1730, 620, 2035, 745)
clinic_price = (2075, 620, 2370, 745)
appointment = (1730, 770, 2035, 875)
visit = (2075, 770, 2370, 875)
payment = (1730, 910, 2035, 1015)
rating = (2075, 910, 2370, 1015)

collection(draw, clinic, "Clinic", "clinic identity and specialization data", AMBER, AMBER_EDGE)
collection(draw, clinic_price, "ClinicPrice", "clinic service pricing and updates", AMBER, AMBER_EDGE)
collection(draw, appointment, "Appointment", "patientId, doctorId, clinicId, date, time, status", AMBER, AMBER_EDGE)
collection(draw, visit, "VisitSession", "completed visit data linked to patient and billing", AMBER, AMBER_EDGE)
collection(draw, payment, "Payment", "patientId, sessionId, amount, method, status", AMBER, AMBER_EDGE)
collection(draw, rating, "Rating", "patient feedback and doctor rating statistics", AMBER, AMBER_EDGE)

notification = (140, 1225, 500, 1340)
audit = (550, 1225, 910, 1340)
soft_delete = (140, 1360, 910, 1398)

collection(draw, notification, "Notification", "userId, message, type, related entity, read status", GREEN, GREEN_EDGE)
collection(draw, audit, "AuditLog", "administrative and security-related activity records", GREEN, GREEN_EDGE)
collection(draw, soft_delete, "Traceability Fields: createdAt, updatedAt, deletedAt, approval, read status, audit records", "", GREEN, GREEN_EDGE)

gridfs = (1310, 1225, 1640, 1340)
sessions = (1685, 1225, 2015, 1340)
indexes = (2060, 1225, 2370, 1340)
mongo_indexes = (1310, 1360, 2370, 1398)

collection(draw, gridfs, "GridFS Files", "large dental X-ray images linked from diagnosis records", CYAN, CYAN_EDGE)
collection(draw, sessions, "Session Store", "connect-mongo session documents for authenticated users", CYAN, CYAN_EDGE)
collection(draw, indexes, "Schema Indexes", "optimized lookup and filtering", CYAN, CYAN_EDGE)
collection(draw, mongo_indexes, "Indexed Access: userId, patientId, doctorId, clinicId, date, status, read state, deletedAt", "", SLATE, LINE)

# Simple intra-group connectors
arrow(draw, (370, 682), (420, 682), BLUE_EDGE)
arrow(draw, (370, 720), (420, 810), BLUE_EDGE)
arrow(draw, (1235, 682), (1265, 682), VIOLET_EDGE)
arrow(draw, (2035, 682), (2075, 682), AMBER_EDGE)
arrow(draw, (2035, 832), (2075, 832), AMBER_EDGE)
arrow(draw, (2035, 962), (2075, 962), AMBER_EDGE)
arrow(draw, (1640, 1282), (1685, 1282), CYAN_EDGE)
arrow(draw, (2015, 1282), (2060, 1282), CYAN_EDGE)

# Relationship summary cards
rel1 = (140, 1580, 610, 1680)
rel2 = (650, 1580, 1120, 1680)
rel3 = (1160, 1580, 1630, 1680)
rel4 = (1670, 1580, 2370, 1680)
collection(draw, rel1, "User Links", "User -> Patient.assignedToUserId and Doctor.userId", SLATE, LINE)
collection(draw, rel2, "Clinical Links", "DiagnosisRecord -> TreatmentPlan through diagnosisRecordId", SLATE, LINE)
collection(draw, rel3, "Operational Links", "Appointment links patientId, doctorId, clinicId", SLATE, LINE)
collection(draw, rel4, "Support Links", "Notification targets userId; X-ray files are linked through DiagnosisRecord.xrayFileId", SLATE, LINE)

note = (90, 1750, 2410, 1810)
draw.rounded_rectangle(note, radius=16, fill=WHITE, outline="#CBD5E1", width=2)
draw.text((125, 1768), "Database flow:", font=SMALL, fill=INK)
draw.text(
    (275, 1768),
    "Backend repositories use Mongoose schemas to store domain documents in MongoDB. Large X-ray files are stored in GridFS and linked to diagnosis records.",
    font=SMALL,
    fill=MUTED,
)

img.save(OUT_FILE, quality=95)
print(str(OUT_FILE))
