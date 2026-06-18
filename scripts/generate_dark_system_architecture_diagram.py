from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_system_architecture_dark.png"

W, H = 2600, 1650
BG = "#111111"
PANEL = "#1A1A1A"
NODE = "#2A2A2A"
NODE_2 = "#242424"
TEXT = "#F3F4F6"
MUTED = "#B7BDC6"
LINE = "#8A8F98"
CYAN = "#7DD3FC"
GREEN = "#86EFAC"
AMBER = "#FCD34D"
PINK = "#FDA4AF"
VIOLET = "#C4B5FD"


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
GROUP = font(20, True)
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
    draw.rounded_rectangle(box, radius=8, fill=PANEL, outline="#242424", width=2)
    draw.text((x1 + 18, y1 + 14), title, fill=TEXT, font=GROUP)
    draw.line((x1 + 18, y1 + 44, x1 + 220, y1 + 44), fill=accent, width=2)


def node(draw, box, title, body="", accent=LINE):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=6, fill=NODE, outline=accent, width=2)
    draw.text((x1 + 14, y1 + 11), title, fill=TEXT, font=HEAD)
    if body:
        draw.multiline_text(
            (x1 + 14, y1 + 38),
            wrap(draw, body, BODY, x2 - x1 - 28),
            fill=MUTED,
            font=BODY,
            spacing=4,
        )


def center(box):
    x1, y1, x2, y2 = box
    return ((x1 + x2) // 2, (y1 + y2) // 2)


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
    length = 14
    spread = 0.48
    p1 = (x2 - length * math.cos(ang - spread), y2 - length * math.sin(ang - spread))
    p2 = (x2 - length * math.cos(ang + spread), y2 - length * math.sin(ang + spread))
    draw.polygon([(x2, y2), p1, p2], fill=color)


def line_arrow(draw, start, end, color=LINE, width=2):
    draw.line((*start, *end), fill=color, width=width)
    arrowhead(draw, start, end, color)


def curve_arrow(draw, start, control, end, color=LINE, width=2):
    points = []
    for i in range(31):
        t = i / 30
        x = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t**2 * end[0]
        y = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t**2 * end[1]
        points.append((x, y))
    draw.line(points, fill=color, width=width)
    arrowhead(draw, points[-2], points[-1], color)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# Subtle background grid
for x in range(0, W, 80):
    draw.line((x, 0, x, H), fill="#151515", width=1)
for y in range(0, H, 80):
    draw.line((0, y, W, y), fill="#151515", width=1)

draw.text((90, 55), "Dento System Architecture", fill=TEXT, font=TITLE)
draw.text(
    (92, 112),
    "Dark technical map of the current React, Express.js, MongoDB, AI-assisted diagnosis, and notification architecture.",
    fill=MUTED,
    font=SUBTITLE,
)

user_panel = (1580, 185, 2360, 360)
frontend_panel = (1435, 420, 2490, 790)
backend_panel = (655, 360, 1340, 1095)
ai_panel = (95, 870, 610, 1220)
data_panel = (655, 1140, 1340, 1495)

panel(draw, user_panel, "User Layer", CYAN)
panel(draw, frontend_panel, "Frontend Layer - React Web Application", GREEN)
panel(draw, backend_panel, "Backend Layer - Express.js API Server", AMBER)
panel(draw, ai_panel, "AI-Assisted Layer", PINK)
panel(draw, data_panel, "Data Layer - MongoDB", VIOLET)

patient = (1645, 255, 1810, 315)
dentist = (1900, 255, 2065, 315)
admin = (2155, 255, 2320, 315)
for box, label in [(patient, "Patient"), (dentist, "Dentist"), (admin, "Administrator")]:
    node(draw, box, label, accent="#3A3A3A")

web = (1770, 435, 2070, 505)
protected = (1770, 555, 2070, 635)
patient_services = (1515, 685, 1725, 755)
dentist_dash = (1810, 685, 2020, 755)
admin_panel = (2105, 685, 2315, 755)
notify_bell = (2345, 1110, 2525, 1185)

node(draw, web, "Frontend Web App", "React + TypeScript + Vite", GREEN)
node(draw, protected, "User Interface Pages", "protected routes and role-aware navigation", GREEN)
node(draw, patient_services, "Patient Services", "diagnosis, booking, records", GREEN)
node(draw, dentist_dash, "Dentist Dashboard", "review, treatment plans, patients", GREEN)
node(draw, admin_panel, "Admin Panel", "users, clinics, reports", GREEN)
node(draw, notify_bell, "Notification Bell", "updates and unread alerts", GREEN)

api = (875, 390, 1125, 460)
auth = (785, 535, 1235, 615)
rbac = (730, 705, 960, 775)
routes = (1030, 705, 1260, 775)
services = (875, 850, 1110, 920)
notification_service = (715, 960, 945, 1035)
ai_service = (1065, 960, 1295, 1035)
socket = (875, 1035, 1110, 1105)

node(draw, api, "REST API Gateway", "/api/v1", AMBER)
node(draw, auth, "Authentication and Session Management", "session auth, cookies, MongoStore", AMBER)
node(draw, rbac, "RBAC Middleware", "patient, dentist, admin", AMBER)
node(draw, routes, "Route Modules", "auth, patients, appointments, AI", AMBER)
node(draw, services, "Business Services", "appointments, payments, notifications", AMBER)
node(draw, notification_service, "Notification Service", "event-based records", AMBER)
node(draw, ai_service, "AI Diagnosis Service", "validated diagnosis workflow", AMBER)
node(draw, socket, "WebSocket Server", "real-time updates", AMBER)

smart = (145, 960, 365, 1035)
xray = (380, 960, 565, 1035)
prelim = (210, 1095, 495, 1175)
node(draw, smart, "Smart Diagnosis Model", "symptoms + case data", PINK)
node(draw, xray, "Dental X-ray Analysis", "optional image input", PINK)
node(draw, prelim, "Preliminary Output", "findings for patient viewing and dentist review", PINK)

models = (715, 1235, 960, 1310)
gridfs = (1045, 1235, 1290, 1310)
records = (700, 1380, 985, 1460)
operations = (1030, 1380, 1305, 1460)
node(draw, models, "Mongoose Models", "repository data access", VIOLET)
node(draw, gridfs, "GridFS X-ray Storage", "linked to diagnosis records", VIOLET)
node(draw, records, "Clinical Records", "diagnosis, medical records, treatment plans", VIOLET)
node(draw, operations, "Operational Records", "appointments, payments, ratings, notifications", VIOLET)

# User to frontend
curve_arrow(draw, edge_point(patient, "bottom"), (1715, 385), edge_point(web, "top"), CYAN, 2)
line_arrow(draw, edge_point(dentist, "bottom"), edge_point(web, "top"), CYAN, 2)
curve_arrow(draw, edge_point(admin, "bottom"), (2240, 385), edge_point(web, "top"), CYAN, 2)

line_arrow(draw, edge_point(web, "bottom"), edge_point(protected, "top"), GREEN, 2)
curve_arrow(draw, edge_point(protected, "bottom"), (1630, 645), edge_point(patient_services, "top"), GREEN, 2)
line_arrow(draw, edge_point(protected, "bottom"), edge_point(dentist_dash, "top"), GREEN, 2)
curve_arrow(draw, edge_point(protected, "bottom"), (2210, 645), edge_point(admin_panel, "top"), GREEN, 2)

# Frontend to backend
curve_arrow(draw, edge_point(web, "left"), (1450, 430), edge_point(api, "right"), LINE, 2)
curve_arrow(draw, edge_point(protected, "left"), (1400, 590), edge_point(api, "right"), LINE, 2)

# Backend internal flow
line_arrow(draw, edge_point(api, "bottom"), edge_point(auth, "top"), AMBER, 2)
line_arrow(draw, edge_point(auth, "bottom"), edge_point(rbac, "top"), AMBER, 2)
line_arrow(draw, edge_point(auth, "bottom"), edge_point(routes, "top"), AMBER, 2)
curve_arrow(draw, edge_point(rbac, "bottom"), (820, 740), edge_point(services, "top"), AMBER, 2)
curve_arrow(draw, edge_point(routes, "bottom"), (1060, 740), edge_point(services, "top"), AMBER, 2)
curve_arrow(draw, edge_point(services, "bottom"), (785, 855), edge_point(notification_service, "top"), AMBER, 2)
curve_arrow(draw, edge_point(services, "bottom"), (1120, 855), edge_point(ai_service, "top"), AMBER, 2)
line_arrow(draw, edge_point(notification_service, "bottom"), edge_point(socket, "top"), AMBER, 2)

# Backend to AI and data
curve_arrow(draw, edge_point(ai_service, "left"), (720, 860), edge_point(smart, "right"), PINK, 2)
line_arrow(draw, edge_point(smart, "right"), edge_point(xray, "left"), PINK, 2)
curve_arrow(draw, edge_point(smart, "bottom"), (245, 1000), edge_point(prelim, "top"), PINK, 2)
curve_arrow(draw, edge_point(xray, "bottom"), (445, 1000), edge_point(prelim, "top"), PINK, 2)
curve_arrow(draw, edge_point(prelim, "right"), (590, 1110), edge_point(records, "left"), PINK, 2)

curve_arrow(draw, edge_point(services, "bottom"), (900, 950), edge_point(models, "top"), VIOLET, 2)
line_arrow(draw, edge_point(models, "right"), edge_point(gridfs, "left"), VIOLET, 2)
line_arrow(draw, edge_point(models, "bottom"), edge_point(records, "top"), VIOLET, 2)
line_arrow(draw, edge_point(gridfs, "bottom"), edge_point(operations, "top"), VIOLET, 2)

# Notifications to frontend
curve_arrow(draw, edge_point(socket, "right"), (1570, 1010), edge_point(notify_bell, "left"), LINE, 2)
curve_arrow(draw, edge_point(notification_service, "right"), (1600, 1000), edge_point(notify_bell, "left"), LINE, 2)

# Clinical safety note
note = (1435, 835, 2490, 950)
draw.rounded_rectangle(note, radius=8, fill=NODE_2, outline="#3A3A3A", width=2)
draw.text((1458, 855), "Clinical Safety Boundary", font=GROUP, fill=TEXT)
draw.text(
    (1458, 892),
    "AI output remains preliminary. The dentist validates diagnosis, notes, treatment approval, and final clinical decisions.",
    font=BODY,
    fill=MUTED,
)

legend = (95, 1535, 2490, 1605)
draw.rounded_rectangle(legend, radius=8, fill="#171717", outline="#2C2C2C", width=2)
draw.text((120, 1560), "Primary flow:", fill=TEXT, font=SMALL)
draw.text(
    (235, 1560),
    "Users -> React frontend -> Express REST API -> services -> MongoDB/GridFS. AI diagnosis is routed through backend validation and stored for dentist review.",
    fill=MUTED,
    font=SMALL,
)

img.save(OUT_FILE, quality=96)
print(str(OUT_FILE))
