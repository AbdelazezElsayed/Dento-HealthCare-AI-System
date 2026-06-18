from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_uc06_manage_treatment_plans_use_case.png"

W, H = 2600, 1650
BG = "#101820"
PANEL = "#14232D"
GRID = "#1B2D38"
INK = "#F8FAFC"
MUTED = "#AEBECD"
BOUNDARY = "#67E8F9"
MINT = "#5EEAD4"
CORAL = "#FB7185"
GOLD = "#FBBF24"
LIME = "#A3E635"
SKY = "#38BDF8"
VIOLET = "#C084FC"
SLATE = "#94A3B8"
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


TITLE = font(56, True)
SUBTITLE = font(24)
BOUNDARY_FONT = font(26, True)
ACTOR_FONT = font(20, True)
USECASE_FONT = font(20, True)
MAIN_FONT = font(23, True)
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
    wrapped = wrap(draw, text, fnt, x2 - x1 - 44)
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
    draw.ellipse((cx - 29, cy, cx + 29, cy + 58), outline=color, width=5)
    draw.line((cx, cy + 58, cx, cy + 154), fill=color, width=5)
    draw.line((cx - 64, cy + 95, cx + 64, cy + 95), fill=color, width=5)
    draw.line((cx, cy + 154, cx - 60, cy + 236), fill=color, width=5)
    draw.line((cx, cy + 154, cx + 60, cy + 236), fill=color, width=5)
    bbox = draw.textbbox((0, 0), label, font=ACTOR_FONT)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy + 258), label, fill=INK, font=ACTOR_FONT)


def usecase(draw, box, label, color, fill="#172A36", main=False):
    x1, y1, x2, y2 = box
    draw.ellipse((x1 + 8, y1 + 10, x2 + 8, y2 + 10), fill="#0B1218")
    draw.ellipse(box, fill=fill, outline=color, width=4 if main else 3)
    centered_text(draw, box, label, MAIN_FONT if main else USECASE_FONT)


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


def dashed_arrow(draw, start, end, label, color=SLATE, label_shift=(0, -30)):
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
    draw.rounded_rectangle((x1 + 8, y1 + 8, x2 + 8, y2 + 8), radius=18, fill="#0B1218")
    draw.rounded_rectangle(box, radius=18, fill=PANEL, outline="#284252", width=2)
    draw.rectangle((x1, y1, x1 + 16, y2), fill=BOUNDARY)
    draw.text((x1 + 44, y1 + 25), title, fill=INK, font=ACTOR_FONT)
    draw.multiline_text((x1 + 44, y1 + 64), wrap(draw, body, NOTE_FONT, x2 - x1 - 90), fill=MUTED, font=NOTE_FONT, spacing=6)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

for x in range(80, W, 80):
    draw.line((x, 0, x, H), fill=GRID, width=1)
for y in range(180, H, 80):
    draw.line((0, y, W, y), fill=GRID, width=1)

draw.rectangle((0, 0, W, 178), fill="#152635")
draw.text((80, 48), "UC-06: Manage Treatment Plans", fill=INK, font=TITLE)
draw.text((82, 116), "UML use-case diagram for creating, reviewing, editing, approving, scheduling, and viewing treatment plans.", fill=MUTED, font=SUBTITLE)

boundary = (460, 230, 2140, 1350)
draw.rounded_rectangle((boundary[0] + 10, boundary[1] + 10, boundary[2] + 10, boundary[3] + 10), radius=28, fill="#0B1218")
draw.rounded_rectangle(boundary, radius=28, fill=PANEL, outline=BOUNDARY, width=4)
draw.text((boundary[0] + 38, boundary[1] + 28), "Dento Treatment Plan Module", fill=BOUNDARY, font=BOUNDARY_FONT)

actor(draw, 235, 560, "Dentist / Medical Staff", VIOLET)
actor(draw, 2355, 940, "Patient", SKY)

manage = (1045, 575, 1505, 735)

select_patient = (585, 325, 935, 435)
validate_access = (1075, 320, 1435, 430)
view_plan = (1575, 325, 1945, 435)

create_update = (585, 820, 935, 930)
review_draft = (1075, 860, 1435, 970)
approve_final = (1575, 820, 1945, 930)

schedule_proc = (585, 1110, 935, 1220)
check_conflict = (1075, 1130, 1435, 1240)
notify_patient = (1575, 1090, 1945, 1200)
patient_view = (1575, 1225, 1945, 1335)
audit = (1075, 1215, 1435, 1325)

for box, label, color, fill, main in [
    (manage, "Manage Treatment Plans", VIOLET, "#241A35", True),
    (select_patient, "Select Patient", VIOLET, "#241A35", False),
    (validate_access, "Validate Dentist Access", GOLD, "#302716", False),
    (view_plan, "View Treatment Plan", MINT, "#102E2B", False),
    (create_update, "Create / Update Plan", CORAL, "#341B24", False),
    (review_draft, "Review AI Draft Plan", GOLD, "#302716", False),
    (approve_final, "Approve Final Plan", LIME, "#253413", False),
    (schedule_proc, "Schedule Plan Procedures", CORAL, "#341B24", False),
    (check_conflict, "Check Appointment Conflict", GOLD, "#302716", False),
    (notify_patient, "Notify Patient", SKY, "#102A3A", False),
    (patient_view, "View Approved Plan", SKY, "#102A3A", False),
    (audit, "Record Audit Log", MINT, "#102E2B", False),
]:
    usecase(draw, box, label, color, fill, main)

# Actor associations.
association(draw, (325, 650), point(manage, "left"), VIOLET)
association(draw, (325, 585), point(select_patient, "left"), VIOLET)
association(draw, (325, 720), point(create_update, "left"), VIOLET)
association(draw, (2265, 1018), point(patient_view, "right"), SKY)
association(draw, (2265, 965), point(notify_patient, "right"), SKY)

# Core includes.
dashed_arrow(draw, point(manage, "left"), point(select_patient, "right"), "<<include>>", VIOLET, (-70, -40))
dashed_arrow(draw, point(manage, "top"), point(validate_access, "bottom"), "<<include>>", GOLD, (-65, -10))
dashed_arrow(draw, point(manage, "right"), point(view_plan, "left"), "<<include>>", MINT, (10, -40))
dashed_arrow(draw, point(manage, "left"), point(create_update, "right"), "<<include>>", CORAL, (-90, 28))
dashed_arrow(draw, point(manage, "bottom"), point(review_draft, "top"), "<<extend>>", GOLD, (-65, 12))
dashed_arrow(draw, point(manage, "right"), point(approve_final, "left"), "<<extend>>", LIME, (10, 28))
dashed_arrow(draw, point(manage, "bottom"), point(audit, "top"), "<<include>>", MINT, (44, 55))

# Scheduling and notification details.
dashed_arrow(draw, point(schedule_proc, "top"), point(create_update, "bottom"), "<<extend>>", CORAL, (-88, 6))
dashed_arrow(draw, point(schedule_proc, "right"), point(check_conflict, "left"), "<<include>>", GOLD, (-35, -34))
dashed_arrow(draw, point(create_update, "right"), point(notify_patient, "left"), "<<include>>", SKY, (-10, 60))
dashed_arrow(draw, point(approve_final, "bottom"), point(notify_patient, "top"), "<<include>>", SKY, (14, -10))
dashed_arrow(draw, point(review_draft, "right"), point(create_update, "right"), "<<extend>>", GOLD, (-15, 46))

rule = (1050, 255, 1975, 305)
draw.rounded_rectangle(rule, radius=18, fill="#12202B", outline="#2E4B5E", width=2)
draw.text((1075, 268), "Rule: AI-generated drafts are not final until reviewed, edited if needed, and approved by the dentist.", fill=MUTED, font=SMALL)

note_box(
    draw,
    (460, 1450, 2140, 1585),
    "Diagram Scope",
    "UC-06 covers selecting a patient, viewing an existing treatment plan, creating or updating plan details, reviewing AI draft plans, approving final plans, scheduling procedure appointments, checking appointment conflicts, notifying the patient, and recording audit logs.",
)

draw.line((80, 1608, 185, 1608), fill=SLATE, width=3)
draw.text((200, 1595), "actor association", fill=MUTED, font=SMALL)
dashed_arrow(draw, (440, 1608), (580, 1608), "<<include>>", SLATE, (-44, -40))
draw.text((615, 1595), "include / extend dependency", fill=MUTED, font=SMALL)
draw.text((1845, 1608), "Generated for Dento graduation project documentation", fill=MUTED, font=SMALL)

img.save(OUT_FILE, quality=96)
print(str(OUT_FILE))
