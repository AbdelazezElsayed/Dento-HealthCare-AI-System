from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_architecture_figure_5_1.png"

W, H = 2400, 1950
BG = "#F8FAFC"
INK = "#172033"
MUTED = "#5B6472"
LINE = "#64748B"
BLUE = "#DCEBFF"
BLUE_EDGE = "#2F6FED"
GREEN = "#DCFCE7"
GREEN_EDGE = "#16A34A"
AMBER = "#FEF3C7"
AMBER_EDGE = "#D97706"
ROSE = "#FFE4E6"
ROSE_EDGE = "#E11D48"
VIOLET = "#EDE9FE"
VIOLET_EDGE = "#7C3AED"
WHITE = "#FFFFFF"


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
SUBTITLE = font(28)
LAYER = font(30, True)
HEAD = font(25, True)
BODY = font(18)
SMALL = font(18)


def text_size(draw, text, fnt):
    box = draw.multiline_textbbox((0, 0), text, font=fnt, spacing=8)
    return box[2] - box[0], box[3] - box[1]


def wrapped_text(draw, text, fnt, max_width):
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


def card(draw, box, title, body, fill, edge, title_fill=None):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=24, fill=fill, outline=edge, width=4)
    if body:
        tx = x1 + 28
        ty = y1 + 22
        draw.text((tx, ty), title, font=HEAD, fill=title_fill or INK)
        wrapped = wrapped_text(draw, body, BODY, x2 - x1 - 56)
        draw.multiline_text((tx, ty + 44), wrapped, font=BODY, fill=MUTED, spacing=7)
    else:
        tx = x1 + 28
        th = text_size(draw, title, HEAD)[1]
        ty = y1 + ((y2 - y1 - th) // 2) - 2
        draw.text((tx, ty), title, font=HEAD, fill=title_fill or INK)


def layer_box(draw, box, title, fill, edge):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=30, fill=fill, outline=edge, width=5)
    draw.text((x1 + 28, y1 + 20), title, font=LAYER, fill=INK)
    draw.line((x1 + 24, y1 + 68, x2 - 24, y1 + 68), fill=edge, width=3)


def center(box):
    x1, y1, x2, y2 = box
    return ((x1 + x2) // 2, (y1 + y2) // 2)


def arrow(draw, start, end, color=LINE, width=5):
    x1, y1 = start
    x2, y2 = end
    draw.line((x1, y1, x2, y2), fill=color, width=width)
    import math

    ang = math.atan2(y2 - y1, x2 - x1)
    length = 20
    spread = 0.48
    p1 = (x2 - length * math.cos(ang - spread), y2 - length * math.sin(ang - spread))
    p2 = (x2 - length * math.cos(ang + spread), y2 - length * math.sin(ang + spread))
    draw.polygon([(x2, y2), p1, p2], fill=color)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

draw.text((90, 55), "Figure 5.1: Dento System Architecture", font=TITLE, fill=INK)
draw.text(
    (92, 122),
    "Client-server architecture with REST APIs, WebSocket notifications, MongoDB persistence, and AI-assisted diagnosis.",
    font=SUBTITLE,
    fill=MUTED,
)

user_layer = (90, 210, 2310, 465)
front_layer = (90, 540, 1125, 910)
back_layer = (1275, 540, 2310, 1135)
data_layer = (90, 1215, 1125, 1630)
ai_layer = (1275, 1215, 2310, 1630)
control_layer = (90, 1700, 2310, 1835)

layer_box(draw, user_layer, "User Layer", WHITE, BLUE_EDGE)
layer_box(draw, front_layer, "Frontend Layer", WHITE, GREEN_EDGE)
layer_box(draw, back_layer, "Backend Layer", WHITE, AMBER_EDGE)
layer_box(draw, data_layer, "Data Layer", WHITE, VIOLET_EDGE)
layer_box(draw, ai_layer, "AI-Assisted Layer", WHITE, ROSE_EDGE)
layer_box(draw, control_layer, "Security and Realtime", WHITE, LINE)

user_cards = [
    ((140, 305, 780, 425), "Patient", "Registration, symptoms, X-ray upload, booking, records"),
    ((880, 305, 1520, 425), "Dentist", "Clinical review, notes, diagnosis validation, treatment approval"),
    ((1620, 305, 2260, 425), "Administrator", "Users, clinics, reports, and platform management"),
]
for box, title, body in user_cards:
    card(draw, box, title, body, BLUE, BLUE_EDGE)

frontend_cards = [
    ((135, 645, 1080, 760), "React Web Application", "TypeScript, Vite, TailwindCSS, shadcn/ui"),
    ((135, 785, 1080, 880), "Role-Based Pages", "Patient services, dentist dashboard, administration panel"),
]
for box, title, body in frontend_cards:
    card(draw, box, title, body, GREEN, GREEN_EDGE)

backend_cards = [
    ((1320, 645, 2265, 760), "Express.js API Server", "Versioned REST APIs under /api/v1"),
    ((1320, 785, 2265, 900), "Route Modules", "Authentication, patients, dentists, clinics, appointments, payments, AI, admin"),
    ((1320, 925, 2265, 1040), "Business Services", "Appointments, notifications, diagnosis records, treatment plans"),
    ((1320, 1065, 2265, 1125), "Repository Flow: routes -> repositories -> models -> MongoDB", ""),
]
for box, title, body in backend_cards:
    card(draw, box, title, body, AMBER, AMBER_EDGE)

data_cards = [
    ((135, 1320, 1080, 1425), "MongoDB + Mongoose", "Users, patients, dentists, clinics, appointments, payments, ratings"),
    ((135, 1455, 590, 1595), "Clinical Records", "Diagnosis records, medical records, treatment plans"),
    ((625, 1455, 1080, 1595), "GridFS + Sessions", "X-ray storage and MongoDB-backed session store"),
]
for box, title, body in data_cards:
    card(draw, box, title, body, VIOLET, VIOLET_EDGE)

ai_cards = [
    ((1320, 1320, 2265, 1425), "Smart Diagnosis Model", "Processes patient symptoms and dental X-ray data"),
    ((1320, 1455, 1765, 1595), "Preliminary Output", "Findings, severity, clinic recommendation, next steps"),
    ((1810, 1455, 2265, 1595), "Dentist Review", "Clinical validation, notes, treatment approval, final decision"),
]
for box, title, body in ai_cards:
    card(draw, box, title, body, ROSE, ROSE_EDGE)

control_cards = [
    ((135, 1770, 620, 1815), "Authentication", ""),
    ((665, 1770, 1150, 1815), "RBAC", ""),
    ((1195, 1770, 1680, 1815), "WebSocket Events", ""),
    ((1725, 1770, 2265, 1815), "Logging", ""),
]
for box, title, body in control_cards:
    card(draw, box, title, body, "#F1F5F9", LINE)

# Main architecture arrows
arrow(draw, (1200, 465), (660, 540), BLUE_EDGE)
draw.text((785, 492), "user requests", font=SMALL, fill=MUTED)

arrow(draw, (1125, 720), (1275, 720), GREEN_EDGE)
draw.text((1150, 680), "HTTP REST", font=SMALL, fill=MUTED)

arrow(draw, (1500, 1135), (875, 1215), AMBER_EDGE)
draw.text((1050, 1152), "data access", font=SMALL, fill=MUTED)

arrow(draw, (1785, 1135), (1785, 1215), ROSE_EDGE)
draw.text((1808, 1170), "AI request", font=SMALL, fill=MUTED)

arrow(draw, (1505, 1595), (1030, 1595), ROSE_EDGE)
draw.text((1160, 1558), "store preliminary result", font=SMALL, fill=MUTED)

arrow(draw, (1200, 1700), (1200, 1630), LINE, 4)
draw.text((1225, 1658), "security and realtime services support all layers", font=SMALL, fill=MUTED)

# Legend
legend = (90, 1885, 2310, 1920)
draw.rounded_rectangle(legend, radius=18, fill=WHITE, outline="#CBD5E1", width=2)
draw.text((125, 1893), "Data flow:", font=SMALL, fill=INK)
draw.text(
    (250, 1893),
    "Users -> React frontend -> Express API -> services/repositories -> MongoDB. AI outputs are stored as preliminary records for dentist review.",
    font=SMALL,
    fill=MUTED,
)

img.save(OUT_FILE, quality=95)
print(str(OUT_FILE))
