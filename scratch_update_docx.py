import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import os

img_phase1 = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase1_prototype.jpg'
img_phase3 = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase3_product.jpg'

print("Phase 1 image exists:", os.path.exists(img_phase1))
print("Phase 3 image exists:", os.path.exists(img_phase3))

# =========================================================================
# 1. Update NeuroStride_Business_Plan.docx -> preserves ALL original formatting
# =========================================================================
bp_path = r'd:\projects\neurostride\docs\NeuroStride_Business_Plan.docx'
doc_bp = docx.Document(bp_path)

# Add Phase 1 & Phase 3 images and video callout section to Business Plan
p_h2 = doc_bp.add_paragraph("3.1 Hardware Evolution: Phase 1 MVP vs. Phase 3 Commercial Target", style='Heading 2')

p_desc = doc_bp.add_paragraph(
    "NeuroStride's hardware strategy transitions from a low-cost, 3D-printed validation prototype (Phase 1 MVP) "
    "to a sleek, medical-grade wearable exoskeleton system (Phase 3 Commercial Design). "
    "Below is the visual and functional comparison:"
)

# Phase 1 Image
p_img1_lbl = doc_bp.add_paragraph("Phase 1 MVP Hardware Prototype (Live Engineering Test Rig)", style='Heading 3')
p_img1 = doc_bp.add_paragraph()
p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_img1.add_run().add_picture(img_phase1, width=Inches(4.8))

p_img1_cap = doc_bp.add_paragraph(
    "Figure 3.1: Phase 1 MVP hardware prototype featuring black 3D-printed forearm sleeve, high-torque MG996R servo motor, "
    "ESP32-WROOM-32D microcontroller board, tensioning wires, and adjustable arm straps (COGS: ~₹4,500).",
    style='Normal'
)

# Phase 3 Image
p_img3_lbl = doc_bp.add_paragraph("Phase 3 Commercial Wearable Hardware Target", style='Heading 3')
p_img3 = doc_bp.add_paragraph()
p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_img3.add_run().add_picture(img_phase3, width=Inches(4.8))

p_img3_cap = doc_bp.add_paragraph(
    "Figure 3.2: Phase 3 commercial design concept featuring industrial white/blue PETG mechanical glove, custom 4-layer PCB "
    "housing the ADS1299 24-bit ADC with galvanic isolation, active dry EEG headband, and wireless BLE/Wi-Fi streaming (COGS: ₹11,200).",
    style='Normal'
)

# Working Video Demo Box
p_vid_h2 = doc_bp.add_paragraph("3.2 Live Product Demonstration Video for Investors", style='Heading 2')

table_bp = doc_bp.add_table(rows=1, cols=1)
table_bp.alignment = WD_TABLE_ALIGNMENT.CENTER
cell_bp = table_bp.cell(0, 0)
p_title = cell_bp.paragraphs[0]
p_title.text = "🎬 WORKING PRODUCT DEMONSTRATION VIDEO"
p_title.runs[0].font.bold = True
p_title.runs[0].font.size = Pt(12)
p_title.runs[0].font.color.rgb = RGBColor(108, 99, 255)

p_vid_desc = cell_bp.add_paragraph(
    "A full functional demonstration video of the live hardware prototype has been recorded and attached for investors. "
    "The video demonstrates real-time EMG biosignal acquisition, IIR filtering, FFT frequency analysis, "
    "WebSocket transmission to the Next.js patient dashboard, and intent-triggered servo motor finger actuation."
)

p_vid_details = cell_bp.add_paragraph()
r = p_vid_details.add_run("• Video File Name: ")
r.bold = True
p_vid_details.add_run("neurostride_demo_video.mp4\n")

r = p_vid_details.add_run("• Original Source File: ")
r.bold = True
p_vid_details.add_run("PXL_20260422_103900416~2 - Trim.mp4 (124 MB)\n")

r = p_vid_details.add_run("• Relative Location in Pitch Package: ")
r.bold = True
p_vid_details.add_run("./documentation/main-documentation/neurostride_demo_video.mp4\n")

r = p_vid_details.add_run("• Playback Instructions: ")
r.bold = True
p_vid_details.add_run("Open in any media player (VLC, Windows Media Player, QuickTime) or play directly inside the HTML pitch presentation document.")

# Save Business Plan DOCX
doc_bp.save(r'd:\projects\neurostride\docs\NeuroStride_Business_Plan.docx')
doc_bp.save(r'd:\projects\neurostride\docs\NeuroStride_Business_Plan_v2.docx')
doc_bp.save(r'd:\projects\neurostride\documentation\main-documentation\NeuroStride_Business_Plan.docx')
print("Successfully saved updated NeuroStride_Business_Plan.docx!")

# =========================================================================
# 2. Update neurostride-hardware-costs-wearable-v3.docx -> v4.docx
# =========================================================================
hw_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride-hardware-costs-wearable-v3.docx'
doc_hw = docx.Document(hw_path)

p_hw_vid_h2 = doc_hw.add_paragraph("6.3 Working Demonstration Video for Investors", style='Heading 2')

table_hw = doc_hw.add_table(rows=1, cols=1)
table_hw.alignment = WD_TABLE_ALIGNMENT.CENTER
cell_hw = table_hw.cell(0, 0)
p_hw_title = cell_hw.paragraphs[0]
p_hw_title.text = "🎬 LIVE HARDWARE DEMONSTRATION VIDEO"
p_hw_title.runs[0].font.bold = True
p_hw_title.runs[0].font.size = Pt(12)
p_hw_title.runs[0].font.color.rgb = RGBColor(108, 99, 255)

p_hw_desc = cell_hw.add_paragraph(
    "Watch the physical prototype actuation, EMG sensor bridge, and intent detection algorithm in action. "
    "The video file is included in the project documentation package."
)

p_hw_details = cell_hw.add_paragraph()
r = p_hw_details.add_run("• Video File Name: ")
r.bold = True
p_hw_details.add_run("neurostride_demo_video.mp4 (124 MB)\n")

r = p_hw_details.add_run("• Hardware Tested: ")
r.bold = True
p_hw_details.add_run("Phase 1 MVP ESP32 Board + MG996R Servo Arm + WSS Sensor Bridge\n")

r = p_hw_details.add_run("• Location: ")
r.bold = True
p_hw_details.add_run("documentation/main-documentation/neurostride_demo_video.mp4")

doc_hw.save(r'd:\projects\neurostride\docs\hardware-manufacturing-costs-v4.docx')
doc_hw.save(r'd:\projects\neurostride\docs\neurostride-hardware-costs-wearable-v4.docx')
doc_hw.save(r'd:\projects\neurostride\documentation\main-documentation\neurostride-hardware-costs-wearable-v4.docx')
print("Successfully saved updated hardware-manufacturing-costs-v4.docx!")
