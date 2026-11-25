import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

doc = docx.Document()

# Set professional margins
sections = doc.sections
for section in sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

# Title
p_title = doc.add_paragraph()
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_title = p_title.add_run("🧠 NeuroStride — Seed Investment Overview")
r_title.font.name = 'Calibri'
r_title.font.size = Pt(24)
r_title.font.bold = True
r_title.font.color.rgb = RGBColor(108, 99, 255)

# Subtitle
p_sub = doc.add_paragraph()
p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_sub = p_sub.add_run("AI-Powered Neurorehabilitation — Restoring Movement, Restoring Life")
r_sub.font.name = 'Calibri'
r_sub.font.size = Pt(14)
r_sub.font.italic = True

# Metadata Callout
p_meta = doc.add_paragraph()
p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_meta = p_meta.add_run("Seeking: ₹1 Cr Seed | Founder: Prathmesh (LTPratham) | LPU Ideathon 2026 | Patent Published")
r_meta.font.size = Pt(10)
r_meta.font.bold = True
r_meta.font.color.rgb = RGBColor(100, 100, 100)

doc.add_paragraph().paragraph_format.space_after = Pt(12)

# --- 1. Working Product Video Callout Box ---
h1 = doc.add_heading("1. Live Product Demonstration Video", level=1)
h1.runs[0].font.color.rgb = RGBColor(108, 99, 255)

table_v = doc.add_table(rows=1, cols=1)
table_v.alignment = WD_TABLE_ALIGNMENT.CENTER
cell_v = table_v.cell(0, 0)
p_vt = cell_v.paragraphs[0]
p_vt.text = "🎬 WORKING HARDWARE ACTUATION & SENSOR DEMO"
p_vt.runs[0].font.bold = True
p_vt.runs[0].font.size = Pt(12)
p_vt.runs[0].font.color.rgb = RGBColor(108, 99, 255)

p_vd = cell_v.add_paragraph(
    "A working physical hardware video demonstration has been captured and attached to this pitch package. "
    "The video illustrates real-time EMG biosignal acquisition, IIR noise filtering, FFT frequency analysis, "
    "WebSocket telemetry streaming to the Next.js patient dashboard, and intent-triggered servo arm finger actuation."
)

p_vi = cell_v.add_paragraph()
r = p_vi.add_run("• Video File Name: ")
r.bold = True
p_vi.add_run("neurostride_demo_video.mp4\n")

r = p_vi.add_run("• Original Recording: ")
r.bold = True
p_vi.add_run("PXL_20260422_103900416~2 - Trim.mp4 (124 MB)\n")

r = p_vi.add_run("• File Location: ")
r.bold = True
p_vi.add_run("documentation/main-documentation/neurostride_demo_video.mp4\n")

r = p_vi.add_run("• Playback Instructions: ")
r.bold = True
p_vi.add_run("Double click or open neurostride_demo_video.mp4 in any standard media player (VLC, Windows Media Player, QuickTime).")

# --- 2. Hardware Evolution: Phase 1 vs Phase 3 ---
h2 = doc.add_heading("2. Hardware Evolution — Phase 1 MVP vs. Phase 3 Production", level=1)
h2.runs[0].font.color.rgb = RGBColor(108, 99, 255)

doc.add_paragraph(
    "NeuroStride bridges the gap between clinical hardware cost and home accessibility. "
    "Below is the hardware progression from our working engineering prototype (Phase 1 MVP) "
    "to our commercial product design (Phase 3 Scale Target):"
)

# Images Side by Side / Stacked
img1_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase1_prototype.jpg'
img3_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase3_product.jpg'

p_lbl1 = doc.add_heading("Phase 1 MVP Prototype (Live Engineering Test Rig)", level=2)
p_img1 = doc.add_paragraph()
p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_img1.add_run().add_picture(img1_path, width=Inches(4.5))

p_cap1 = doc.add_paragraph("Figure 2.1: Phase 1 MVP prototype featuring 3D-printed arm, MG996R servos, ESP32 board, and WSS sensor bridge (COGS: ~₹4,500).")
p_cap1.runs[0].font.italic = True
p_cap1.runs[0].font.size = Pt(9.5)

p_lbl3 = doc.add_heading("Phase 3 Commercial Wearable Hardware Target", level=2)
p_img3 = doc.add_paragraph()
p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_img3.add_run().add_picture(img3_path, width=Inches(4.5))

p_cap3 = doc.add_paragraph("Figure 2.2: Phase 3 commercial product concept featuring white/blue PETG mechanical glove, custom 4-layer ADS1299 board, and EEG headband (COGS: ₹11,200).")
p_cap3.runs[0].font.italic = True
p_cap3.runs[0].font.size = Pt(9.5)

# --- 3. BOM Comparison Table ---
h3 = doc.add_heading("3. Hardware Specifications & BOM Breakdown", level=1)
h3.runs[0].font.color.rgb = RGBColor(108, 99, 255)

table_bom = doc.add_table(rows=6, cols=3)
table_bom.alignment = WD_TABLE_ALIGNMENT.CENTER

headers = ["Specification", "Phase 1 MVP Prototype (Live)", "Phase 3 Commercial Product"]
for j, text in enumerate(headers):
    cell = table_bom.cell(0, j)
    cell.paragraphs[0].text = text
    cell.paragraphs[0].runs[0].font.bold = True

rows_data = [
    ("Microcontroller & AFE", "ESP32-WROOM-32D Board", "Custom PCB + ADS1299 24-bit AFE"),
    ("Exoskeleton Actuation", "3D-Printed Arm + MG996R Servos", "Ergonomic White/Blue PETG Glove"),
    ("Electrodes & Cables", "Surface EMG pads + velcro straps", "Active dry EEG headband + shielded cables"),
    ("Manufacturing Cost (COGS)", "~₹4,500", "₹11,200 (Target limit < ₹12,000)"),
    ("Target Retail Price", "N/A (Internal Rig)", "₹25,000 (Full Kit) / ₹16,000 (Board)")
]

for i, row in enumerate(rows_data):
    for j, val in enumerate(row):
        table_bom.cell(i+1, j).paragraphs[0].text = val

# --- 4. Market & Financial Ask ---
h4 = doc.add_heading("4. Market Opportunity & The ₹1 Cr Seed Ask", level=1)
h4.runs[0].font.color.rgb = RGBColor(108, 99, 255)

doc.add_paragraph("• TAM (Total Addressable Market): ₹66,700 Cr ($8.0B) — India's medical rehab market.")
doc.add_paragraph("• SAM (Serviceable Addressable Market): ₹4,800 Cr — Stroke, cerebral palsy, and TBI rehab.")
doc.add_paragraph("• SOM (Years 1-3 Target): ₹12 Cr — 3 pilot hospitals, 500 active patients, 50 doctors, 20 pharmacies.")

doc.add_heading("Use of ₹1 Cr Seed Funds (18-Month Runway):", level=2)
doc.add_paragraph("1. Hardware & Clinical Pilots (35%): ₹35 Lakhs — 3 hospital pilots & kit manufacturing.")
doc.add_paragraph("2. Product & Engineering (25%): ₹25 Lakhs — Web app, AI chatbot, mobile app, firmware.")
doc.add_paragraph("3. Regulatory & Compliance (15%): ₹15 Lakhs — CDSCO SaMD compliance, ISO 13485 audit.")
doc.add_paragraph("4. Sales & Hospital Partnerships (15%): ₹15 Lakhs — Hospital onboarding & clinician training.")
doc.add_paragraph("5. Core Team Hiring (10%): ₹10 Lakhs — Engineering & clinical ops hires.")

# Save docx files
doc.save(r'd:\projects\neurostride\docs\NeuroStride_Investor_Pitch_Deck_v1.docx')
doc.save(r'd:\projects\neurostride\documentation\main-documentation\NeuroStride_Investor_Pitch_Deck_v1.docx')
print("Successfully created NeuroStride_Investor_Pitch_Deck_v1.docx!")
