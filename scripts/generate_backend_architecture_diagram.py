from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_backend_architecture_figure_5_2.png"

W, H = 2400, 1880
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
SLATE = "#F1F5F9"


def font(size, bold=False):
    paths = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in paths:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


TITLE = font(54, True)
SUBTITLE = font(28)
LAYER = font(30, True)
HEAD = font(24, True)
BODY = font(17)
SMALL = font(18)


def text_size(draw, text, fnt):
    box = draw.multiline_textbbox((0, 0), text, font=fnt, spacing=7)
    return box[2] - box[0], box[3] - box[1]


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        test = f"{current} {word}".strip()
        if draw.textbbox((0, 0), test, font=fnt)[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def layer(draw, box, title, edge):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=26, fill=WHITE, outline=edge, width=5)
    draw.text((x1 + 28, y1 + 18), title, font=LAYER, fill=INK)
    draw.line((x1 + 24, y1 + 66, x2 - 24, y1 + 66), fill=edge, width=3)


def card(draw, box, title, body, fill, edge):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=18, fill=fill, outline=edge, width=4)
    draw.text((x1 + 24, y1 + 16), title, font=HEAD, fill=INK)
    if body:
        draw.multiline_text((x1 + 24, y1 + 55), wrap(draw, body, BODY, x2 - x1 - 48), font=BODY, fill=MUTED, spacing=7)


def arrow(draw, start, end, color=LINE, width=5):
    import math

    x1, y1 = start
    x2, y2 = end
    draw.line((x1, y1, x2, y2), fill=color, width=width)
    ang = math.atan2(y2 - y1, x2 - x1)
    length = 20
    spread = 0.48
    p1 = (x2 - length * math.cos(ang - spread), y2 - length * math.sin(ang - spread))
    p2 = (x2 - length * math.cos(ang + spread), y2 - length * math.sin(ang + spread))
    draw.polygon([(x2, y2), p1, p2], fill=color)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

draw.text((90, 55), "Figure 5.2: Dento Backend Architecture", font=TITLE, fill=INK)
draw.text(
    (92, 122),
    "Express.js backend design with security middleware, modular routes, services, repositories, MongoDB, AI diagnosis, and realtime notifications.",
    font=SUBTITLE,
    fill=MUTED,
)

# Layer boxes
client = (90, 220, 2310, 430)
security = (90, 505, 2310, 735)
routes = (90, 810, 2310, 1090)
services = (90, 1165, 2310, 1430)
data = (90, 1505, 1125, 1760)
external = (1275, 1505, 2310, 1760)

layer(draw, client, "Request Layer", BLUE_EDGE)
layer(draw, security, "Security and Middleware Layer", GREEN_EDGE)
layer(draw, routes, "API Route Layer", AMBER_EDGE)
layer(draw, services, "Service and Business Logic Layer", VIOLET_EDGE)
layer(draw, data, "Data Access and Storage Layer", BLUE_EDGE)
layer(draw, external, "Realtime and AI Support", ROSE_EDGE)

client_cards = [
    ((135, 310, 680, 405), "React Frontend", "Authenticated REST requests with session credentials"),
    ((755, 310, 1300, 405), "REST API", "Main API mounted under /api/v1"),
    ((1375, 310, 2265, 405), "WebSocket Clients", "Notification and appointment update listeners"),
]
for c in client_cards:
    card(draw, *c, BLUE, BLUE_EDGE)

security_cards = [
    ((135, 595, 560, 700), "Helmet + CORS", "Security headers and controlled cross-origin access"),
    ((610, 595, 1035, 700), "Rate Limiting", "General, authentication, and AI request limits"),
    ((1085, 595, 1510, 700), "Session Auth", "MongoDB-backed sessions with secure cookies"),
    ((1560, 595, 1985, 700), "CSRF Protection", "Token protection for sensitive mutations"),
    ((2035, 595, 2265, 700), "Logging", "Request and error logging"),
]
for c in security_cards:
    card(draw, *c, GREEN, GREEN_EDGE)

route_cards = [
    ((135, 900, 500, 1015), "Auth Routes", "Login, logout, registration, current user"),
    ((535, 900, 900, 1015), "Patient Routes", "Records, treatment plans, patient data access"),
    ((935, 900, 1300, 1015), "Appointment Routes", "Booking, status changes, doctor schedules"),
    ((1335, 900, 1700, 1015), "AI Routes", "Diagnosis, X-ray access, chat, TTS"),
    ((1735, 900, 2265, 1015), "Admin + Other Routes", "Clinics, doctors, payments, ratings, notifications, dashboard"),
]
for c in route_cards:
    card(draw, *c, AMBER, AMBER_EDGE)

service_cards = [
    ((135, 1255, 640, 1375), "Authentication Service", "User lookup and password handling"),
    ((690, 1255, 1195, 1375), "Notification Service", "Appointment, visit, treatment, and rating triggers"),
    ((1245, 1255, 1750, 1375), "AI Diagnosis Logic", "Input validation, preliminary output storage, X-ray handling"),
    ((1800, 1255, 2265, 1375), "Validation + RBAC", "Role checks and patient access validation"),
]
for c in service_cards:
    card(draw, *c, VIOLET, VIOLET_EDGE)

data_cards = [
    ((135, 1600, 590, 1718), "Repositories", "Routes -> repositories -> Mongoose models"),
    ((625, 1600, 1080, 1718), "MongoDB", "Users, patients, dentists, appointments, treatment plans, payments, notifications"),
]
for c in data_cards:
    card(draw, *c, BLUE, BLUE_EDGE)

external_cards = [
    ((1320, 1600, 1665, 1718), "GridFS", "Dental X-ray file storage"),
    ((1700, 1600, 2015, 1718), "Socket.IO", "Realtime user and role rooms"),
    ((2050, 1600, 2265, 1718), "AI Model", "Preliminary diagnosis support"),
]
for c in external_cards:
    card(draw, *c, ROSE, ROSE_EDGE)

# Arrows
arrow(draw, (1200, 430), (1200, 505), BLUE_EDGE)
draw.text((1220, 460), "incoming requests", font=SMALL, fill=MUTED)

arrow(draw, (1200, 735), (1200, 810), GREEN_EDGE)
draw.text((1220, 765), "authorized requests", font=SMALL, fill=MUTED)

arrow(draw, (1200, 1090), (1200, 1165), AMBER_EDGE)
draw.text((1220, 1120), "business operations", font=SMALL, fill=MUTED)

arrow(draw, (830, 1430), (830, 1505), VIOLET_EDGE)
draw.text((850, 1460), "database operations", font=SMALL, fill=MUTED)

arrow(draw, (1760, 1430), (1760, 1505), ROSE_EDGE)
draw.text((1780, 1460), "AI and realtime events", font=SMALL, fill=MUTED)

arrow(draw, (1080, 1660), (1320, 1660), LINE, 4)
draw.text((1135, 1622), "X-ray references and diagnosis records", font=SMALL, fill=MUTED)

# Bottom note
note = (90, 1810, 2310, 1858)
draw.rounded_rectangle(note, radius=16, fill=WHITE, outline="#CBD5E1", width=2)
draw.text((125, 1825), "Backend flow:", font=SMALL, fill=INK)
draw.text(
    (270, 1825),
    "Request -> security middleware -> route module -> service logic -> repository/model -> MongoDB, with AI and WebSocket services connected through backend-controlled workflows.",
    font=SMALL,
    fill=MUTED,
)

img.save(OUT_FILE, quality=95)
print(str(OUT_FILE))
