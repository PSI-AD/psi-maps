from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path("/Users/admin/PSI Projects/psi-maps")
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_PATH = OUTPUT_DIR / "psi-maps-app-summary.pdf"


TITLE = "PSI Maps Pro"
SUBTITLE = "One-page repository summary"

WHAT_IT_IS = (
    "PSI Maps Pro is a Vite/React spatial real-estate app for exploring UAE property projects on an "
    "interactive Mapbox map. The repo connects live Firebase data, nearby-amenity lookups, project "
    "analysis tools, and AI-generated insights in one interface."
)

WHO_ITS_FOR = (
    "Primary persona: investor-facing UAE real-estate sales teams and advisors. Repo docs also name "
    "international investors, wealth managers, developers, and property sales teams."
)

FEATURES = [
    "Interactive Mapbox map with project and landmark browsing.",
    "Client-side filters for city, community, developer, status, and property type.",
    "Rich project view with galleries, route/tour actions, favorites, compare, and PDF export.",
    "AI investment summaries via Google Gemini.",
    "Nearby amenities and landmark-to-project reverse search.",
    "Admin dashboard for project, landmark, and presentation management.",
    "PWA and native-shell hooks: install prompt, service worker, background sync, push, Capacitor wrappers.",
]

ARCHITECTURE = [
    "UI: index.tsx mounts App.tsx, which composes MainLayout, MapCanvas, project panels, admin tools, and AI chat.",
    "Data: useProjectData.ts subscribes to Firestore projects and landmarks, normalizes records, and applies client-side filters.",
    "Map + interaction: useMapState.ts manages Mapbox view state; the client supports drawing, tours, route/nearby panels, and overlays.",
    "External services: the frontend calls local proxy routes for CRM properties and Google Places, and geminiService.ts requests Gemini summaries.",
    "Platform services: Firebase Functions handle lead/status notifications, scheduled reports, and a small HTTPS API; cache/background sync support resilience.",
]

RUN_STEPS = [
    "Run npm install.",
    "Create .env.local and set GEMINI_API_KEY (README).",
    "Run npm run dev.",
    "Optional local proxy found in repo: cd crm-proxy-server && npm install && npm run dev.",
]

RUN_NOTES = [
    "End-to-end local startup for proxy/functions together: Not found in repo.",
    "Definitive local env requirements beyond Gemini/.env.example: Not found in repo.",
]


def wrap_text(text: str, font_name: str, font_size: int, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if stringWidth(trial, font_name, font_size) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font_name: str,
    font_size: int,
    color=colors.HexColor("#203047"),
    leading: float | None = None,
) -> float:
    leading = leading or (font_size + 3)
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    lines = wrap_text(text, font_name, font_size, width)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(
    c: canvas.Canvas,
    items: list[str],
    x: float,
    y: float,
    width: float,
    font_name: str = "Helvetica",
    font_size: int = 9,
    bullet_gap: float = 10,
    leading: float = 11,
) -> float:
    c.setFont(font_name, font_size)
    c.setFillColor(colors.HexColor("#203047"))
    text_width = width - bullet_gap
    for item in items:
        lines = wrap_text(item, font_name, font_size, text_width)
        c.setFont("Helvetica-Bold", font_size)
        c.drawString(x, y, "-")
        c.setFont(font_name, font_size)
        c.drawString(x + bullet_gap, y, lines[0])
        y -= leading
        for line in lines[1:]:
            c.drawString(x + bullet_gap, y, line)
            y -= leading
        y -= 2
    return y


def section_label(c: canvas.Canvas, label: str, x: float, y: float) -> float:
    c.setFillColor(colors.HexColor("#0F5C7A"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, label.upper())
    c.setStrokeColor(colors.HexColor("#C9D7E2"))
    c.setLineWidth(0.8)
    c.line(x, y - 4, x + 248, y - 4)
    return y - 14


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    width, height = A4
    c = canvas.Canvas(str(OUTPUT_PATH), pagesize=A4)
    c.setTitle("PSI Maps Pro app summary")

    margin_x = 34
    top = height - 34

    c.setFillColor(colors.HexColor("#0B1F33"))
    c.rect(0, height - 92, width, 92, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#63B6D7"))
    c.rect(0, height - 98, width, 6, stroke=0, fill=1)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(margin_x, top - 18, TITLE)
    c.setFont("Helvetica", 11)
    c.drawString(margin_x, top - 38, SUBTITLE)
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#D9E7EF"))
    c.drawRightString(
        width - margin_x,
        top - 38,
        "Based only on repository evidence in this workspace",
    )

    col_gap = 18
    col_w = (width - (margin_x * 2) - col_gap) / 2
    left_x = margin_x
    right_x = margin_x + col_w + col_gap
    y = height - 114

    y_left = section_label(c, "What It Is", left_x, y)
    y_left = draw_wrapped(c, WHAT_IT_IS, left_x, y_left, col_w, "Helvetica", 9, leading=11)

    y_right = section_label(c, "Who It's For", right_x, y)
    y_right = draw_wrapped(c, WHO_ITS_FOR, right_x, y_right, col_w, "Helvetica", 9, leading=11)

    y = min(y_left, y_right) - 4

    y = section_label(c, "What It Does", left_x, y)
    y = draw_bullets(c, FEATURES, left_x, y, width - (margin_x * 2), font_size=9, leading=10.5)

    y -= 2
    y = section_label(c, "How It Works", left_x, y)
    y = draw_bullets(c, ARCHITECTURE, left_x, y, width - (margin_x * 2), font_size=8.5, leading=10)

    y -= 2
    y = section_label(c, "How To Run", left_x, y)
    y = draw_bullets(c, RUN_STEPS, left_x, y, width - (margin_x * 2), font_size=9, leading=10.5)
    y = draw_bullets(c, RUN_NOTES, left_x, y, width - (margin_x * 2), font_size=8.5, leading=10)

    c.setStrokeColor(colors.HexColor("#D5E2EA"))
    c.line(margin_x, 26, width - margin_x, 26)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#5C6E7E"))
    footer = "Evidence used: README.md, PROJECT_MASTER.md, App.tsx, index.tsx, hooks/useProjectData.ts, utils/firebase.ts, crm-proxy-server/server.js, functions/src/index.ts"
    c.drawString(margin_x, 15, footer)

    c.showPage()
    c.save()


if __name__ == "__main__":
    main()
