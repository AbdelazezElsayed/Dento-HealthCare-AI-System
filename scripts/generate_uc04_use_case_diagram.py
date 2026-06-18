from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_uc04_use_case_diagram.png"

W, H = 2400, 1500
BG = "#FBFCFE"
GRID = "#EEF3F8"
INK = "#172033"
MUTED = "#607084"
BOUNDARY = "#1E3A8A"
BLUE = "#2563EB"
PURPLE = "#7C3AED"
TEAL = "#0F766E"
AMBER = "#D97706"
GREEN = "#16A34A"
RED = "#DC2626"
SLATE = "#475569"
WHITE = "#FFFFFF"


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


TITLE = font(54, True)
SUBTITLE = font(24)
BOUNDARY_FONT = font(25, True)
ACTOR_FONT = font(20, True)
USECASE_FONT = font(20, True)
REL_FONT = font(15, True)
NOTE_FONT = font(17)
SMALL = font(14)


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


def centered_text(draw, box, text, fnt, fill=INK):
    x1, y1, x2, y2 = box
    wrapped = wrap(draw, text, fnt, x2 - x1 - 42)
    bbox = draw.multiline_textbbox((0, 0), wrapped, font=fnt, spacing=5, align="center")
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.multiline_text(
        ((x1 + x2 - tw) / 2, (y1 + y2 - th) / 2 - 2),
        wrapped,
        font=fnt,
        fill=fill,
        spacing=5,
        align="center",
    )


def actor(draw, cx, cy, label, color):
    draw.ellipse((cx - 28, cy, cx + 28, cy + 56), outline=color, width=5)
    draw.line((cx, cy + 56, cx, cy + 150), fill=color, width=5)
    draw.line((cx - 62, cy + 92, cx + 62, cy + 92), fill=color, width=5)
    draw.line((cx, cy + 150, cx - 58, cy + 230), fill=color, width=5)
    draw.line((cx, cy + 150, cx + 58, cy + 230), fill=color, width=5)
    bbox = draw.textbbox((0, 0), label, font=ACTOR_FONT)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy + 250), label, fill=INK, font=ACTOR_FONT)


def usecase(draw, box, label, color, fill="#FFFFFF"):
    x1, y1, x2, y2 = box
    draw.ellipse((x1 + 7, y1 + 8, x2 + 7, y2 + 8), fill="#E6EDF5")
    draw.ellipse(box, fill=fill, outline=color, width=3)
    centered_text(draw, box, label, USECASE_FONT)


def point(box, side):
    x1, y1, x2, y2 = box
    if side == "left":
        return (x1, (y1 + y2) // 2)
    if side == "right":
        return (x2, (y1 + y2) // 2)
    if side == "top":
        return ((x1 + x2) // 2, y1)
    return ((x1 + x2) // 2, y2)


def arrowhead(draw, start, end, color, open_head=True):
    import math

    x1, y1 = start
    x2, y2 = end
    angle = math.atan2(y2 - y1, x2 - x1)
    length = 18
    spread = 0.48
    p1 = (x2 - length * math.cos(angle - spread), y2 - length * math.sin(angle - spread))
    p2 = (x2 - length * math.cos(angle + spread), y2 - length * math.sin(angle + spread))
    if open_head:
        draw.line((p1[0], p1[1], x2, y2, p2[0], p2[1]), fill=color, width=3)
    else:
        draw.polygon([(x2, y2), p1, p2], fill=color)


def association(draw, start, end, color=SLATE):
    draw.line((*start, *end), fill=color, width=3)


def dashed_arrow(draw, start, end, label, color=SLATE, label_shift=(0, -32)):
    x1, y1 = start
    x2, y2 = end
    segments = 34
    for i in range(segments):
        if i % 2 == 0:
            t1 = i / segments
            t2 = (i + 1) / segments
            p1 = (x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1)
            p2 = (x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2)
            draw.line((*p1, *p2), fill=color, width=3)
    arrowhead(draw, (x1 + (x2 - x1) * 0.92, y1 + (y2 - y1) * 0.92), end, color, True)
    mx = (x1 + x2) / 2 + label_shift[0]
    my = (y1 + y2) / 2 + label_shift[1]
    bbox = draw.textbbox((0, 0), label, font=REL_FONT)
    draw.rounded_rectangle((mx - 8, my - 6, mx + bbox[2] - bbox[0] + 8, my + bbox[3] - bbox[1] + 6), radius=8, fill=BG)
    draw.text((mx, my), label, fill=color, font=REL_FONT)


def note_box(draw, box, title, body):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1 + 8, y1 + 8, x2 + 8, y2 + 8), radius=18, fill="#E6EDF5")
    draw.rounded_rectangle(box, radius=18, fill=WHITE, outline="#CAD5E1", width=2)
    draw.rectangle((x1, y1, x1 + 16, y2), fill=BOUNDARY)
    draw.text((x1 + 44, y1 + 25), title, fill=INK, font=ACTOR_FONT)
    draw.multiline_text((x1 + 44, y1 + 64), wrap(draw, body, NOTE_FONT, x2 - x1 - 90), fill=MUTED, font=NOTE_FONT, spacing=6)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

for x in range(80, W, 80):
    draw.line((x, 0, x, H), fill=GRID, width=1)
for y in range(180, H, 80):
    draw.line((0, y, W, y), fill=GRID, width=1)

draw.rectangle((0, 0, W, 170), fill="#EAF2FF")
draw.text((80, 46), "UC-04: Manage Appointments", fill=INK, font=TITLE)
draw.text((82, 112), "UML use-case diagram with actors, system boundary, use cases, and include/extend relationships.", fill=MUTED, font=SUBTITLE)

# Boundary.
boundary = (460, 230, 1940, 1225)
draw.rounded_rectangle((boundary[0] + 10, boundary[1] + 10, boundary[2] + 10, boundary[3] + 10), radius=28, fill="#E4EBF5")
draw.rounded_rectangle(boundary, radius=28, fill="#FDFEFF", outline=BOUNDARY, width=4)
draw.text((boundary[0] + 38, boundary[1] + 28), "Dento Appointment Management Module", fill=BOUNDARY, font=BOUNDARY_FONT)

# Actors outside the boundary.
actor(draw, 235, 420, "Patient", BLUE)
actor(draw, 2165, 390, "Dentist / Medical Staff", PURPLE)
actor(draw, 2165, 890, "Administrator", TEAL)

# Primary use cases.
book = (610, 330, 970, 445)
view_my = (610, 525, 970, 640)
reschedule = (610, 720, 970, 835)
cancel = (610, 915, 970, 1030)

check = (1045, 430, 1405, 545)
notify = (1045, 760, 1405, 875)

view_today = (1510, 335, 1835, 450)
attended = (1510, 545, 1835, 660)
session = (1510, 750, 1835, 865)
payment = (1510, 945, 1835, 1060)
view_all = (1510, 1085, 1835, 1200)

for box, label, color, fill in [
    (book, "Book Appointment", BLUE, "#EFF6FF"),
    (view_my, "View My Appointments", BLUE, "#FFFFFF"),
    (reschedule, "Reschedule Appointment", BLUE, "#FFFFFF"),
    (cancel, "Cancel Appointment", BLUE, "#FFFFFF"),
    (check, "Check Slot Availability", AMBER, "#FFF7ED"),
    (notify, "Send Appointment Notification", GREEN, "#F0FDF4"),
    (view_today, "View Today's Appointments", PURPLE, "#F5F3FF"),
    (attended, "Mark Patient Attended", PURPLE, "#F5F3FF"),
    (session, "Create Visit Session", TEAL, "#F0FDFA"),
    (payment, "Create Pending Payment", TEAL, "#F0FDFA"),
    (view_all, "View All Appointments", TEAL, "#F0FDFA"),
]:
    usecase(draw, box, label, color, fill)

# Actor associations.
association(draw, (320, 492), point(book, "left"), BLUE)
association(draw, (320, 560), point(view_my, "left"), BLUE)
association(draw, (320, 632), point(reschedule, "left"), BLUE)
association(draw, (320, 704), point(cancel, "left"), BLUE)
association(draw, (2075, 465), point(view_today, "right"), PURPLE)
association(draw, (2075, 555), point(attended, "right"), PURPLE)
association(draw, (2075, 970), point(view_all, "right"), TEAL)

# Include relationships, kept minimal for readability.
dashed_arrow(draw, point(book, "right"), point(check, "left"), "<<include>>", AMBER, (-8, -34))
dashed_arrow(draw, point(reschedule, "right"), point(check, "left"), "<<include>>", AMBER, (-10, 22))
dashed_arrow(draw, point(book, "right"), point(notify, "left"), "<<include>>", GREEN, (-10, 26))
dashed_arrow(draw, point(cancel, "right"), point(notify, "left"), "<<include>>", GREEN, (-8, -30))
dashed_arrow(draw, point(attended, "bottom"), point(session, "top"), "<<include>>", TEAL, (8, -10))
dashed_arrow(draw, point(session, "bottom"), point(payment, "top"), "<<include>>", TEAL, (8, -10))
dashed_arrow(draw, point(attended, "left"), point(notify, "right"), "<<include>>", GREEN, (-70, -28))

# Optional behaviours from the appointment list.
dashed_arrow(draw, point(reschedule, "top"), point(view_my, "bottom"), "<<extend>>", RED, (-120, 0))
dashed_arrow(draw, point(cancel, "top"), point(view_my, "bottom"), "<<extend>>", RED, (25, 30))

# Compact rule note inside the boundary.
rule = (1045, 255, 1835, 305)
draw.rounded_rectangle(rule, radius=18, fill="#F8FAFC", outline="#CBD5E1", width=2)
draw.text((1068, 268), "Rule: authenticated access and role permissions apply to all appointment use cases.", fill=MUTED, font=SMALL)

note_box(
    draw,
    (460, 1275, 1940, 1410),
    "Diagram Scope",
    "UC-04 covers booking, viewing, rescheduling, cancellation, dentist attendance confirmation, notification delivery, and creation of visit/payment records after attendance.",
)

# Legend.
draw.line((80, 1460, 185, 1460), fill=SLATE, width=3)
draw.text((200, 1447), "actor association", fill=MUTED, font=SMALL)
dashed_arrow(draw, (440, 1460), (580, 1460), "<<include>>", SLATE, (-44, -40))
draw.text((615, 1447), "include / extend dependency", fill=MUTED, font=SMALL)
draw.text((1710, 1460), "Generated for Dento graduation project documentation", fill=MUTED, font=SMALL)

img.save(OUT_FILE, quality=96)
print(str(OUT_FILE))
