from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_ai_integration_design_dark.png"

W, H = 2600, 1500
BG = "#111111"
GRID = "#171717"
PANEL = "#1A1A1A"
NODE = "#282828"
TEXT = "#F3F4F6"
MUTED = "#B8BEC7"
LINE = "#8A8F98"
CYAN = "#7DD3FC"
GREEN = "#86EFAC"
AMBER = "#FCD34D"
PINK = "#FDA4AF"
VIOLET = "#C4B5FD"
RED = "#F87171"


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


TITLE = font(48, True)
SUBTITLE = font(22)
GROUP = font(21, True)
HEAD = font(18, True)
BODY = font(14)
SMALL = font(13)


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def panel(draw, box, title, accent):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=10, fill=PANEL, outline="#2B2B2B", width=2)
    draw.text((x1 + 18, y1 + 15), title, fill=TEXT, font=GROUP)
    draw.line((x1 + 18, y1 + 47, x1 + 270, y1 + 47), fill=accent, width=2)


def node(draw, box, title, body="", accent=LINE, fill=NODE):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=7, fill=fill, outline=accent, width=2)
    draw.text((x1 + 14, y1 + 11), title, fill=TEXT, font=HEAD)
    if body:
        draw.multiline_text(
            (x1 + 14, y1 + 38),
            wrap(draw, body, BODY, x2 - x1 - 28),
            fill=MUTED,
            font=BODY,
            spacing=4,
        )


def edge_point(box, side):
    x1, y1, x2, y2 = box
    if side == "top":
        return ((x1 + x2) // 2, y1)
    if side == "bottom":
        return ((x1 + x2) // 2, y2)
    if side == "left":
        return (x1, (y1 + y2) // 2)
    return (x2, (y1 + y2) // 2)


def arrowhead(draw, p_from, p_to, color):
    import math

    x1, y1 = p_from
    x2, y2 = p_to
    ang = math.atan2(y2 - y1, x2 - x1)
    length = 15
    spread = 0.48
    p1 = (x2 - length * math.cos(ang - spread), y2 - length * math.sin(ang - spread))
    p2 = (x2 - length * math.cos(ang + spread), y2 - length * math.sin(ang + spread))
    draw.polygon([(x2, y2), p1, p2], fill=color)


def line_arrow(draw, start, end, color=LINE, width=2):
    draw.line((*start, *end), fill=color, width=width)
    arrowhead(draw, start, end, color)


def curve_arrow(draw, start, control, end, color=LINE, width=2):
    points = []
    for i in range(36):
        t = i / 35
        x = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t**2 * end[0]
        y = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t**2 * end[1]
        points.append((x, y))
    draw.line(points, fill=color, width=width)
    arrowhead(draw, points[-2], points[-1], color)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

for x in range(0, W, 80):
    draw.line((x, 0, x, H), fill=GRID, width=1)
for y in range(0, H, 80):
    draw.line((0, y, W, y), fill=GRID, width=1)

draw.text((90, 55), "Dento AI Integration Design", fill=TEXT, font=TITLE)
draw.text(
    (92, 112),
    "Backend-controlled AI workflow for symptom analysis, X-ray storage, preliminary diagnosis, dentist review, and treatment-plan approval.",
    fill=MUTED,
    font=SUBTITLE,
)

patient_panel = (95, 210, 600, 520)
frontend_panel = (720, 185, 1260, 545)
backend_panel = (1380, 185, 1975, 720)
ai_panel = (720, 675, 1260, 1035)
data_panel = (1380, 790, 1975, 1240)
doctor_panel = (2090, 305, 2510, 900)

panel(draw, patient_panel, "Patient Input", CYAN)
panel(draw, frontend_panel, "Frontend Interface", GREEN)
panel(draw, backend_panel, "Backend AI Route", AMBER)
panel(draw, ai_panel, "AI-Assisted Processing", PINK)
panel(draw, data_panel, "Storage and Records", VIOLET)
panel(draw, doctor_panel, "Dentist Review Loop", GREEN)

symptoms = (145, 300, 360, 370)
xray_upload = (145, 405, 360, 475)
case_submit = (390, 352, 555, 430)
node(draw, symptoms, "Symptoms", "answers and symptom summary", CYAN)
node(draw, xray_upload, "Dental X-ray", "optional image upload", CYAN)
node(draw, case_submit, "Case Submission", "patient case package", CYAN)

ai_page = (780, 270, 1045, 345)
form_validation = (780, 390, 1045, 465)
patient_result = (1070, 330, 1220, 420)
node(draw, ai_page, "AI Diagnosis Page", "collects symptoms, X-ray, language", GREEN)
node(draw, form_validation, "Client Checks", "required fields and image preview", GREEN)
node(draw, patient_result, "Patient View", "clear preliminary result", GREEN)

api_endpoint = (1445, 275, 1720, 350)
server_validation = (1445, 400, 1720, 475)
image_validation = (1445, 525, 1720, 600)
response_validation = (1725, 400, 1945, 505)
audit = (1725, 555, 1945, 640)
node(draw, api_endpoint, "POST /ai/diagnosis", "authenticated backend endpoint", AMBER)
node(draw, server_validation, "Request Validation", "symptoms, language, patient link", AMBER)
node(draw, image_validation, "Image Validation", "MIME type and size restrictions", AMBER)
node(draw, response_validation, "Response Validation", "schema check and content cleaning", AMBER)
node(draw, audit, "Audit Logging", "request and completion metadata", AMBER)

smart_model = (800, 770, 1040, 845)
xray_analysis = (800, 880, 1040, 955)
prelim = (1070, 825, 1215, 925)
node(draw, smart_model, "Smart Diagnosis Model", "symptoms and case context", PINK)
node(draw, xray_analysis, "X-ray Analysis", "optional image evidence", PINK)
node(draw, prelim, "Preliminary Findings", "conditions, urgency, clinic suggestion", PINK)

gridfs = (1435, 880, 1680, 955)
diagnosis_record = (1435, 1015, 1680, 1100)
treatment_draft = (1710, 945, 1930, 1030)
notification = (1710, 1085, 1930, 1160)
node(draw, gridfs, "GridFS X-ray Storage", "stores uploaded X-ray file", VIOLET)
node(draw, diagnosis_record, "DiagnosisRecord", "findings, confidence, urgency, xrayFileId", VIOLET)
node(draw, treatment_draft, "AI Draft Treatment Plan", "pending dentist review", VIOLET)
node(draw, notification, "Notification Record", "review required for dentist", VIOLET)

pending_queue = (2140, 410, 2440, 485)
edit_plan = (2140, 555, 2440, 630)
approve_plan = (2140, 700, 2440, 775)
final_plan = (2140, 820, 2440, 890)
node(draw, pending_queue, "Pending Review Queue", "dentist receives draft for review", GREEN)
node(draw, edit_plan, "Dentist Edits", "clinical notes and plan changes", GREEN)
node(draw, approve_plan, "Approval Step", "dentist-approved plan only", GREEN)
node(draw, final_plan, "Final Treatment Plan", "approved clinical output", GREEN)

safety = (95, 1125, 1260, 1275)
draw.rounded_rectangle(safety, radius=10, fill=PANEL, outline=RED, width=2)
draw.text((120, 1150), "Clinical Safety Boundary", font=GROUP, fill=TEXT)
draw.text(
    (120, 1188),
    "AI output is preliminary. The dentist remains responsible for clinical validation, treatment approval, notes, and final decision-making.",
    font=BODY,
    fill=MUTED,
)

metrics = (1380, 1295, 2510, 1390)
draw.rounded_rectangle(metrics, radius=10, fill=PANEL, outline="#333333", width=2)
draw.text((1405, 1318), "Evaluation Context", font=GROUP, fill=TEXT)
draw.text(
    (1405, 1354),
    "Smart diagnosis model accuracy: 96.3%. Dental segmentation pipeline: YOLOv11 + SAM 3 on AlphaDent, mIoU = 0.80 and mAP@50 = 0.71.",
    font=BODY,
    fill=MUTED,
)

# Flow arrows
line_arrow(draw, edge_point(symptoms, "right"), edge_point(case_submit, "left"), CYAN)
line_arrow(draw, edge_point(xray_upload, "right"), edge_point(case_submit, "left"), CYAN)
curve_arrow(draw, edge_point(case_submit, "right"), (660, 360), edge_point(ai_page, "left"), CYAN)
line_arrow(draw, edge_point(ai_page, "bottom"), edge_point(form_validation, "top"), GREEN)
curve_arrow(draw, edge_point(form_validation, "right"), (1320, 425), edge_point(api_endpoint, "left"), LINE)
line_arrow(draw, edge_point(api_endpoint, "bottom"), edge_point(server_validation, "top"), AMBER)
line_arrow(draw, edge_point(server_validation, "bottom"), edge_point(image_validation, "top"), AMBER)
curve_arrow(draw, edge_point(image_validation, "left"), (1290, 640), edge_point(smart_model, "right"), PINK)
curve_arrow(draw, edge_point(image_validation, "bottom"), (1500, 740), edge_point(gridfs, "top"), VIOLET)
line_arrow(draw, edge_point(smart_model, "bottom"), edge_point(xray_analysis, "top"), PINK)
line_arrow(draw, edge_point(smart_model, "right"), edge_point(prelim, "left"), PINK)
line_arrow(draw, edge_point(xray_analysis, "right"), edge_point(prelim, "left"), PINK)
curve_arrow(draw, edge_point(prelim, "right"), (1340, 840), edge_point(response_validation, "left"), PINK)
curve_arrow(draw, edge_point(response_validation, "bottom"), (1695, 780), edge_point(diagnosis_record, "top"), VIOLET)
line_arrow(draw, edge_point(gridfs, "bottom"), edge_point(diagnosis_record, "top"), VIOLET)
line_arrow(draw, edge_point(diagnosis_record, "right"), edge_point(treatment_draft, "left"), VIOLET)
line_arrow(draw, edge_point(treatment_draft, "bottom"), edge_point(notification, "top"), VIOLET)
curve_arrow(draw, edge_point(notification, "right"), (2055, 1005), edge_point(pending_queue, "left"), GREEN)
line_arrow(draw, edge_point(pending_queue, "bottom"), edge_point(edit_plan, "top"), GREEN)
line_arrow(draw, edge_point(edit_plan, "bottom"), edge_point(approve_plan, "top"), GREEN)
line_arrow(draw, edge_point(approve_plan, "bottom"), edge_point(final_plan, "top"), GREEN)
curve_arrow(draw, edge_point(diagnosis_record, "left"), (1270, 1080), edge_point(patient_result, "bottom"), GREEN)
line_arrow(draw, edge_point(audit, "bottom"), edge_point(notification, "top"), LINE)

legend = (95, 1420, 2510, 1475)
draw.rounded_rectangle(legend, radius=8, fill="#171717", outline="#2C2C2C", width=2)
draw.text((120, 1438), "AI integration flow:", fill=TEXT, font=SMALL)
draw.text(
    (265, 1438),
    "Patient case -> frontend submission -> backend validation -> AI-assisted processing -> diagnosis record/GridFS -> dentist-reviewed treatment plan.",
    fill=MUTED,
    font=SMALL,
)

img.save(OUT_FILE, quality=96)
print(str(OUT_FILE))
