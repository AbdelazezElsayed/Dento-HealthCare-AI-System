from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "book_assets"
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / "dento_uc05_review_patient_case_use_case.png"

W, H = 2600, 1650
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
    draw.ellipse((cx - 28, cy, cx + 28, cy + 56), outline=color, width=5)
    draw.line((cx, cy + 56, cx, cy + 150), fill=color, width=5)
    draw.line((cx - 62, cy + 92, cx + 62, cy + 92), fill=color, width=5)
    draw.line((cx, cy + 150, cx - 58, cy + 230), fill=color, width=5)
    draw.line((cx, cy + 150, cx + 58, cy + 230), fill=color, width=5)
    bbox = draw.textbbox((0, 0), label, font=ACTOR_FONT)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy + 250), label, fill=INK, font=ACTOR_FONT)


def usecase(draw, box, label, color, fill=WHITE, main=False):
    x1, y1, x2, y2 = box
    draw.ellipse((x1 + 7, y1 + 8, x2 + 7, y2 + 8), fill="#E6EDF5")
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

draw.rectangle((0, 0, W, 178), fill="#EAF2FF")
draw.text((80, 48), "UC-05: Review Patient Case", fill=INK, font=TITLE)
draw.text((82, 116), "UML use-case diagram for patient case review, clinical records, AI diagnosis history, and treatment plan validation.", fill=MUTED, font=SUBTITLE)

boundary = (470, 230, 2130, 1350)
draw.rounded_rectangle((boundary[0] + 10, boundary[1] + 10, boundary[2] + 10, boundary[3] + 10), radius=28, fill="#E4EBF5")
draw.rounded_rectangle(boundary, radius=28, fill="#FDFEFF", outline=BOUNDARY, width=4)
draw.text((boundary[0] + 38, boundary[1] + 28), "Dento Patient Case Review Module", fill=BOUNDARY, font=BOUNDARY_FONT)

actor(draw, 235, 600, "Dentist / Medical Staff", PURPLE)
actor(draw, 2355, 980, "Patient", BLUE)

review = (990, 610, 1440, 760)

select_patient = (585, 320, 925, 430)
validate_access = (1045, 315, 1385, 425)
view_profile = (1510, 320, 1870, 430)

view_medical = (585, 835, 925, 945)
view_ai = (1045, 880, 1385, 990)
view_plan = (1510, 835, 1870, 945)

add_record = (585, 1110, 925, 1220)
prescribe_med = (960, 1110, 1300, 1220)
edit_plan = (1510, 1080, 1870, 1190)
approve_plan = (1510, 1215, 1870, 1325)
notify_patient = (1895, 1080, 2070, 1190)

for box, label, color, fill, main in [
    (review, "Review Patient Case", PURPLE, "#F5F3FF", True),
    (select_patient, "Search / Select Patient", PURPLE, "#F5F3FF", False),
    (validate_access, "Validate Clinical Access", AMBER, "#FFF7ED", False),
    (view_profile, "View Patient Profile", GREEN, "#F0FDF4", False),
    (view_medical, "View Medical Records", GREEN, "#F0FDF4", False),
    (view_ai, "View AI Diagnosis History", GREEN, "#F0FDF4", False),
    (view_plan, "View Treatment Plan", GREEN, "#F0FDF4", False),
    (add_record, "Add Medical Record", TEAL, "#F0FDFA", False),
    (prescribe_med, "Prescribe Medication", TEAL, "#F0FDFA", False),
    (edit_plan, "Edit Treatment Plan", TEAL, "#F0FDFA", False),
    (approve_plan, "Approve Treatment Plan", TEAL, "#F0FDFA", False),
    (notify_patient, "Notify Patient", BLUE, "#EFF6FF", False),
]:
    usecase(draw, box, label, color, fill, main)

# Associations.
association(draw, (325, 688), point(review, "left"), PURPLE)
association(draw, (325, 625), point(select_patient, "left"), PURPLE)
association(draw, (325, 750), point(view_medical, "left"), PURPLE)
association(draw, (2265, 1070), point(notify_patient, "right"), BLUE)

# Required includes around the central review case.
dashed_arrow(draw, point(review, "left"), point(select_patient, "right"), "<<include>>", PURPLE, (-80, -42))
dashed_arrow(draw, point(review, "top"), point(validate_access, "bottom"), "<<include>>", AMBER, (-58, -12))
dashed_arrow(draw, point(review, "right"), point(view_profile, "left"), "<<include>>", GREEN, (10, -42))
dashed_arrow(draw, point(review, "left"), point(view_medical, "right"), "<<include>>", GREEN, (-105, 24))
dashed_arrow(draw, point(review, "bottom"), point(view_ai, "top"), "<<include>>", GREEN, (-65, 10))
dashed_arrow(draw, point(review, "right"), point(view_plan, "left"), "<<include>>", GREEN, (10, 25))

# Optional extensions after reviewing the case.
dashed_arrow(draw, point(add_record, "top"), point(view_medical, "bottom"), "<<extend>>", TEAL, (-88, 6))
dashed_arrow(draw, point(prescribe_med, "left"), point(view_medical, "bottom"), "<<extend>>", TEAL, (-20, 32))
dashed_arrow(draw, point(edit_plan, "top"), point(view_plan, "bottom"), "<<extend>>", TEAL, (-76, 6))
dashed_arrow(draw, point(approve_plan, "top"), point(view_plan, "bottom"), "<<extend>>", TEAL, (14, 24))
dashed_arrow(draw, point(approve_plan, "right"), point(notify_patient, "left"), "<<include>>", BLUE, (-50, -35))

rule = (1040, 255, 1950, 305)
draw.rounded_rectangle(rule, radius=18, fill="#F8FAFC", outline="#CBD5E1", width=2)
draw.text((1064, 268), "Rule: patient case data is available only to authorized clinical users; patient sees approved outputs only.", fill=MUTED, font=SMALL)

note_box(
    draw,
    (470, 1400, 2130, 1535),
    "Diagram Scope",
    "UC-05 covers selecting a patient, opening the case, reviewing profile data, medical records, AI diagnosis history, and treatment plans. Optional updates include adding records, prescribing medication, editing treatment plans, approving treatment plans, and notifying the patient.",
)

draw.line((80, 1590, 185, 1590), fill=SLATE, width=3)
draw.text((200, 1577), "actor association", fill=MUTED, font=SMALL)
dashed_arrow(draw, (440, 1590), (580, 1590), "<<include>>", SLATE, (-44, -40))
draw.text((615, 1577), "include / extend dependency", fill=MUTED, font=SMALL)
draw.text((1850, 1590), "Generated for Dento graduation project documentation", fill=MUTED, font=SMALL)

img.save(OUT_FILE, quality=96)
print(str(OUT_FILE))
