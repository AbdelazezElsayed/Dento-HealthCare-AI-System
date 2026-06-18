from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_uc04_manage_appointments.png"

W, H = 2400, 1500

BG = "#F7FAFD"
GRID = "#EAF0F7"
INK = "#172033"
MUTED = "#637083"
WHITE = "#FFFFFF"
BORDER = "#D3DEE9"
BLUE = "#2563EB"
TEAL = "#0F766E"
PURPLE = "#7C3AED"
AMBER = "#D97706"
GREEN = "#16A34A"
RED = "#DC2626"
SLATE = "#334155"


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
COL = font(24, True)
ROW = font(25, True)
HEAD = font(21, True)
BODY = font(17)
SMALL = font(15)
TINY = font(13)
NUM = font(19, True)


def wrap(draw, text, fnt, max_width):
    lines = []
    for part in text.split("\n"):
        words = part.split()
        current = ""
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


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def pill(draw, box, text, fill, outline=None, text_color=WHITE, fnt=SMALL):
    rounded(draw, box, 18, fill, outline, 1 if outline else 0)
    x1, y1, x2, y2 = box
    draw.text(((x1 + x2) / 2, (y1 + y2) / 2 - 1), text, fill=text_color, font=fnt, anchor="mm")


def card(draw, box, num, title, body, accent, tag=None):
    x1, y1, x2, y2 = box
    rounded(draw, (x1 + 8, y1 + 8, x2 + 8, y2 + 8), 18, "#E8EEF6")
    rounded(draw, box, 18, WHITE, BORDER, 2)
    draw.rounded_rectangle((x1, y1, x1 + 16, y2), radius=18, fill=accent)
    draw.ellipse((x1 + 30, y1 + 25, x1 + 75, y1 + 70), fill=accent)
    draw.text((x1 + 52, y1 + 47), str(num), fill=WHITE, font=NUM, anchor="mm")
    draw.text((x1 + 92, y1 + 26), title, fill=INK, font=HEAD)
    draw.multiline_text((x1 + 92, y1 + 62), wrap(draw, body, BODY, x2 - x1 - 118), fill=MUTED, font=BODY, spacing=5)
    if tag:
        tw = draw.textbbox((0, 0), tag, font=TINY)[2] + 28
        pill(draw, (x2 - tw - 18, y1 + 24, x2 - 18, y1 + 52), tag, "#F4F8FF", accent, accent, TINY)


def arrowhead(draw, start, end, color):
    import math

    x1, y1 = start
    x2, y2 = end
    angle = math.atan2(y2 - y1, x2 - x1)
    length = 17
    spread = 0.5
    p1 = (x2 - length * math.cos(angle - spread), y2 - length * math.sin(angle - spread))
    p2 = (x2 - length * math.cos(angle + spread), y2 - length * math.sin(angle + spread))
    draw.polygon([(x2, y2), p1, p2], fill=color)


def arrow(draw, start, end, color=SLATE, width=3):
    draw.line((*start, *end), fill=color, width=width)
    arrowhead(draw, start, end, color)


def card_right(box):
    x1, y1, x2, y2 = box
    return (x2, (y1 + y2) // 2)


def card_left(box):
    x1, y1, x2, y2 = box
    return (x1, (y1 + y2) // 2)


def row_band(draw, y, title, color):
    rounded(draw, (72, y, 315, y + 56), 18, color)
    draw.text((96, y + 14), title, fill=WHITE, font=ROW)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

for x in range(80, W, 80):
    draw.line((x, 0, x, H), fill=GRID, width=1)
for y in range(160, H, 80):
    draw.line((0, y, W, y), fill=GRID, width=1)

draw.rectangle((0, 0, W, 168), fill="#EAF2FF")
draw.text((80, 47), "UC-04: Manage Appointments", fill=INK, font=TITLE)
draw.text(
    (82, 112),
    "Book-ready use-case flow for appointment booking, modification, dentist attendance confirmation, notifications, and payment linkage.",
    fill=MUTED,
    font=SUBTITLE,
)

columns = [
    (360, 225, 750, "Actor Action", BLUE),
    (810, 225, 1200, "Interface / API", TEAL),
    (1260, 225, 1650, "System Rule", AMBER),
    (1710, 225, 2250, "Stored Result", SLATE),
]

for x1, y, x2, title, color in columns:
    rounded(draw, (x1, y, x2, y + 64), 20, color)
    draw.text((x1 + 26, y + 17), title, fill=WHITE, font=COL)

row_y = [360, 665, 970]
row_titles = [("A. Booking", BLUE), ("B. Update", TEAL), ("C. Attendance", PURPLE)]
for y, (title, color) in zip(row_y, row_titles):
    row_band(draw, y + 34, title, color)
    draw.line((340, y - 30, 2250, y - 30), fill="#DCE6F1", width=2)

# Row A: booking.
a1 = (360, 360, 750, 525)
a2 = (810, 360, 1200, 525)
a3 = (1260, 360, 1650, 525)
a4 = (1710, 350, 2250, 535)
card(draw, a1, 1, "Select Appointment Slot", "Patient chooses dentist, date, time, and optional notes.", BLUE)
card(draw, a2, 2, "Submit Booking", "Frontend sends authenticated POST /appointments.", TEAL, "POST")
card(draw, a3, 3, "Check Availability", "Backend validates role, resolves patient profile, and checks dentist/patient time conflicts.", AMBER, "409 if busy")
card(draw, a4, 4, "Scheduled Appointment", "Appointment is saved with scheduled status. Patient and dentist receive notification records and live updates.", SLATE)

# Row B: update.
b1 = (360, 665, 750, 830)
b2 = (810, 665, 1200, 830)
b3 = (1260, 665, 1650, 830)
b4 = (1710, 655, 2250, 840)
card(draw, b1, 5, "Open My Appointments", "Patient reviews upcoming, completed, cancelled, and missed appointments.", BLUE)
card(draw, b2, 6, "Reschedule or Cancel", "Frontend sends PUT /appointments/:id with new time or cancelled status.", TEAL, "PUT")
card(draw, b3, 7, "Authorize and Recheck", "Only the appointment owner or assigned dentist can update. New times are conflict-checked.", AMBER, "RBAC")
card(draw, b4, 8, "Updated Appointment State", "The appointment list refreshes. Status changes are saved and patient notifications are generated.", SLATE)

# Row C: attendance.
c1 = (360, 970, 750, 1135)
c2 = (810, 970, 1200, 1135)
c3 = (1260, 970, 1650, 1135)
c4 = (1710, 960, 2250, 1155)
card(draw, c1, 9, "Dentist Reviews Today", "Dentist opens the date-filtered list of today's appointments.", PURPLE, "GET")
card(draw, c2, 10, "Mark Patient Attended", "Dentist confirms the patient visit through POST /appointments/:id/mark-attended.", TEAL, "POST")
card(draw, c3, 11, "Complete Visit", "Dento creates or reuses the visit session, creates pending payment, and marks appointment completed.", AMBER, "TX")
card(draw, c4, 12, "Completed Visit Record", "Appointment, visit session, pending payment, audit log, and patient completion notification are finalized.", SLATE)

for row, color in [([a1, a2, a3, a4], BLUE), ([b1, b2, b3, b4], TEAL), ([c1, c2, c3, c4], PURPLE)]:
    for left, right in zip(row, row[1:]):
        arrow(draw, (card_right(left)[0] + 12, card_right(left)[1]), (card_left(right)[0] - 12, card_left(right)[1]), color)

# Conflict return loop for booking and update rows.
draw.line([(1475, 525), (1475, 590), (565, 590), (565, 525)], fill=RED, width=3)
arrowhead(draw, (565, 590), (565, 525), RED)
pill(draw, (840, 570, 1090, 612), "Conflict: choose another slot", "#FFF1F2", RED, RED, SMALL)

draw.line([(1475, 830), (1475, 895), (565, 895), (565, 830)], fill=RED, width=3)
arrowhead(draw, (565, 895), (565, 830), RED)
pill(draw, (850, 875, 1098, 917), "Unauthorized or unavailable", "#FFF1F2", RED, RED, SMALL)

# Persistent safeguards and data note.
note = (360, 1225, 2250, 1370)
rounded(draw, (note[0] + 8, note[1] + 8, note[2] + 8, note[3] + 8), 22, "#E8EEF6")
rounded(draw, note, 22, WHITE, BORDER, 2)
draw.rectangle((360, 1225, 378, 1370), fill=GREEN)
draw.text((405, 1255), "UC-04 Control Boundary", fill=INK, font=HEAD)
draw.text(
    (405, 1295),
    wrap(
        draw,
        "Dento manages appointments through authenticated routes, role-based access control, conflict detection, MongoDB appointment indexes, "
        "audit logging, and notification delivery. The final completed appointment can also create a visit session and a pending payment record.",
        BODY,
        1760,
    ),
    fill=MUTED,
    font=BODY,
    spacing=6,
)

legend = [
    (BLUE, "patient-facing action"),
    (TEAL, "API operation"),
    (AMBER, "validation or business rule"),
    (SLATE, "stored data or notification"),
    (PURPLE, "dentist workflow"),
]
x = 360
for color, label in legend:
    draw.ellipse((x, 1417, x + 22, 1439), fill=color)
    draw.text((x + 32, 1414), label, fill=MUTED, font=SMALL)
    x += draw.textbbox((0, 0), label, font=SMALL)[2] + 95

footer = "Main endpoints: GET /appointments | POST /appointments | PUT /appointments/:id | GET /appointments/doctor/today | POST /appointments/:id/mark-attended"
draw.text((80, 1460), footer, fill="#697586", font=SMALL)

img.save(OUT_FILE, quality=96)
print(str(OUT_FILE))
