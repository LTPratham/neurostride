import fitz
import os

pdf_orig_path = r'C:\Users\PREDATOR\Desktop\PXL_20260422_103900416~2 - Trim.mp4' # check video
pdf_orig = r'd:\projects\neurostride\docs\NeuroStride_Business_Plan.pdf'

img1_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase1_prototype.jpg'
img3_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase3_product.jpg'
video_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_demo_video.mp4'

# Load original 2-page PDF
doc_orig = fitz.open(r'C:\Users\PREDATOR\Desktop\NeuroStride_Investor_Report_1.pdf')

# Create new 3-page PDF document
doc_new = fitz.open()

# Page 1: Original Page 1
doc_new.insert_pdf(doc_orig, from_page=0, to_page=0)

# Page 2: Create new blank page for Hardware Evolution & Video Showcase
page2 = doc_new.new_page(width=612, height=792)

# --- Draw Header Banner on Page 2 ---
shape = page2.new_shape()
# Top navy header
shape.draw_rect(fitz.Rect(38, 37, 400, 95))
shape.finish(color=(0.10, 0.14, 0.28), fill=(0.10, 0.14, 0.28))

# Top purple header box
shape.draw_rect(fitz.Rect(400, 37, 574, 95))
shape.finish(color=(0.424, 0.388, 1.0), fill=(0.424, 0.388, 1.0))

shape.commit()

# Header text
page2.insert_text(fitz.Point(48, 55), "NEUROSTRIDE", fontsize=9, color=(0.424, 0.388, 1.0), fontname="helv")
page2.insert_text(fitz.Point(48, 73), "Hardware Evolution & Demo Video", fontsize=16, color=(1, 1, 1), fontname="helv-bold")
page2.insert_text(fitz.Point(48, 86), "Phase 1 MVP Prototype vs. Phase 3 Commercial Wearable Hardware", fontsize=8.5, color=(0.8, 0.8, 0.9), fontname="helv")

page2.insert_text(fitz.Point(450, 58), "SEEKING", fontsize=8, color=(0.9, 0.9, 1.0), fontname="helv-bold")
page2.insert_text(fitz.Point(435, 78), "₹1 Cr Seed", fontsize=14, color=(1, 1, 1), fontname="helv-bold")

# Footer page number text
page2.insert_text(fitz.Point(225, 755), "NeuroStride — Confidential Investor Overview  |  Page 2 of 3", fontsize=7.5, color=(0.4, 0.4, 0.4), fontname="helv")

# --- Section Title 1: Hardware Evolution ---
page2.insert_text(fitz.Point(38, 115), "5. Hardware Evolution — Phase 1 MVP vs. Phase 3 Commercial Target", fontsize=12, color=(0.10, 0.14, 0.28), fontname="helv-bold")

# Draw Line under heading
shape = page2.new_shape()
shape.draw_line(fitz.Point(38, 120), fitz.Point(574, 120))
shape.finish(color=(0.424, 0.388, 1.0), width=1)
shape.commit()

# --- Insert Phase 1 & Phase 3 Images Side by Side ---
# Image 1 (Phase 1 MVP) Rect: left half x=[38, 290], y=[130, 310]
rect_img1 = fitz.Rect(38, 130, 290, 310)
page2.insert_image(rect_img1, filename=img1_path)

# Image 3 (Phase 3 Product) Rect: right half x=[322, 574], y=[130, 310]
rect_img3 = fitz.Rect(322, 130, 574, 310)
page2.insert_image(rect_img3, filename=img3_path)

# Image Labels & Captions
page2.insert_text(fitz.Point(38, 322), "Phase 1 MVP Hardware Prototype (Live Rig)", fontsize=9, color=(0.10, 0.14, 0.28), fontname="helv-bold")
page2.insert_text(fitz.Point(38, 333), "3D-printed arm, MG996R servos, ESP32 board (COGS: ~₹4,500)", fontsize=7.5, color=(0.3, 0.3, 0.3), fontname="helv")

page2.insert_text(fitz.Point(322, 322), "Phase 3 Commercial Wearable Hardware Target", fontsize=9, color=(0.10, 0.14, 0.28), fontname="helv-bold")
page2.insert_text(fitz.Point(322, 333), "Ergonomic glove, ADS1299 24-bit AFE board (COGS: ₹11,200)", fontsize=7.5, color=(0.3, 0.3, 0.3), fontname="helv")


# --- BOM Specs Table ---
shape = page2.new_shape()
shape.draw_rect(fitz.Rect(38, 350, 574, 460))
shape.finish(color=(0.85, 0.85, 0.90), fill=(0.97, 0.97, 1.0), width=0.75)

# Table Header fill
shape.draw_rect(fitz.Rect(38, 350, 574, 368))
shape.finish(color=(0.10, 0.14, 0.28), fill=(0.10, 0.14, 0.28))
shape.commit()

page2.insert_text(fitz.Point(45, 362), "Specification", fontsize=8, color=(1, 1, 1), fontname="helv-bold")
page2.insert_text(fitz.Point(210, 362), "Phase 1 MVP Prototype (Live Test Rig)", fontsize=8, color=(1, 1, 1), fontname="helv-bold")
page2.insert_text(fitz.Point(400, 362), "Phase 3 Commercial Product Target", fontsize=8, color=(1, 1, 1), fontname="helv-bold")

rows = [
    ("Microcontroller / AFE", "ESP32-WROOM-32D Board", "Custom PCB + ADS1299 24-bit Low-Noise ADC"),
    ("Exoskeleton Frame", "3D-printed forearm sleeve + MG996R Servos", "Industrial White/Blue Mechanical PETG Glove"),
    ("Electrodes & Cabling", "Surface EMG pads + velcro arm straps", "Active dry EEG headband + shielded cables"),
    ("Manufacturing Cost (COGS)", "~₹4,500 (Internal Test Rig)", "₹11,200 (Target COGS limit < ₹12,000)"),
    ("Target Retail Price", "N/A (Engineering Prototype)", "₹25,000 (Full Kit) / ₹16,000 (Board)")
]

y_curr = 382
for spec, p1_val, p3_val in rows:
    page2.insert_text(fitz.Point(45, y_curr), spec, fontsize=7.5, color=(0.1, 0.1, 0.1), fontname="helv-bold")
    page2.insert_text(fitz.Point(210, y_curr), p1_val, fontsize=7.5, color=(0.2, 0.2, 0.2), fontname="helv")
    page2.insert_text(fitz.Point(400, y_curr), p3_val, fontsize=7.5, color=(0.2, 0.2, 0.2), fontname="helv")
    y_curr += 18


# --- Section Title 2: Live Video Demonstration ---
page2.insert_text(fitz.Point(38, 485), "6. Working Product Demonstration Video", fontsize=12, color=(0.10, 0.14, 0.28), fontname="helv-bold")

shape = page2.new_shape()
shape.draw_line(fitz.Point(38, 490), fitz.Point(574, 490))
shape.finish(color=(0.424, 0.388, 1.0), width=1)
shape.commit()

# --- Video Showcase Card Box ---
shape = page2.new_shape()
shape.draw_rect(fitz.Rect(38, 500, 574, 730))
shape.finish(color=(0.424, 0.388, 1.0), fill=(0.95, 0.94, 1.0), width=1.5)

# Video Card Header
shape.draw_rect(fitz.Rect(38, 500, 574, 525))
shape.finish(color=(0.424, 0.388, 1.0), fill=(0.424, 0.388, 1.0))
shape.commit()

page2.insert_text(fitz.Point(48, 517), "🎬 LIVE HARDWARE DEMONSTRATION & BIOSIGNAL ACTUATION VIDEO", fontsize=9.5, color=(1, 1, 1), fontname="helv-bold")

page2.insert_text(fitz.Point(50, 542), "A full functional hardware demonstration video has been recorded and attached for investors.", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
page2.insert_text(fitz.Point(50, 555), "The video demonstrates real-time EMG biosignal acquisition, IIR noise filtering, FFT frequency band analysis,", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
page2.insert_text(fitz.Point(50, 568), "WebSocket transmission to the Next.js patient dashboard, and intent-triggered servo arm finger flexion.", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")

# Video Meta Details
page2.insert_text(fitz.Point(50, 592), "• Video File Name:", fontsize=8.5, color=(0.1, 0.1, 0.1), fontname="helv-bold")
page2.insert_text(fitz.Point(145, 592), "neurostride_demo_video.mp4 (Original: PXL_20260422_103900416~2 - Trim.mp4)", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")

page2.insert_text(fitz.Point(50, 607), "• File Size & Format:", fontsize=8.5, color=(0.1, 0.1, 0.1), fontname="helv-bold")
page2.insert_text(fitz.Point(145, 607), "124 MB MP4 Video (Embedded directly inside PDF attachment stream)", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")

page2.insert_text(fitz.Point(50, 622), "• Hardware Tested:", fontsize=8.5, color=(0.1, 0.1, 0.1), fontname="helv-bold")
page2.insert_text(fitz.Point(145, 622), "Phase 1 MVP Hardware Rig (ESP32 Board + MG996R Servo Arm)", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")

page2.insert_text(fitz.Point(50, 637), "• Relative Path:", fontsize=8.5, color=(0.1, 0.1, 0.1), fontname="helv-bold")
page2.insert_text(fitz.Point(145, 637), "./documentation/main-documentation/neurostride_demo_video.mp4", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")

# Large Clickable Play Video Button Banner inside Video Card
rect_play_btn = fitz.Rect(70, 660, 542, 705)
shape = page2.new_shape()
shape.draw_rect(rect_play_btn)
shape.finish(color=(0.10, 0.14, 0.28), fill=(0.10, 0.14, 0.28), width=1)
shape.commit()

page2.insert_text(fitz.Point(100, 680), "▶  CLICK HERE TO PLAY LIVE PRODUCT DEMO VIDEO", fontsize=11, color=(1, 1, 1), fontname="helv-bold")
page2.insert_text(fitz.Point(160, 695), "(Launches neurostride_demo_video.mp4 file directly)", fontsize=8.5, color=(0.8, 0.8, 1.0), fontname="helv")

link_video_uri = "file:///d:/projects/neurostride/documentation/main-documentation/neurostride_demo_video.mp4"
page2.insert_link({'kind': fitz.LINK_URI, 'from': rect_play_btn, 'uri': link_video_uri})


# Page 3: Original Page 2
doc_new.insert_pdf(doc_orig, from_page=1, to_page=1)

# Embed File Attachments
with open(video_path, 'rb') as f:
    doc_new.embfile_add('neurostride_demo_video.mp4', f.read(), filename='neurostride_demo_video.mp4', ufilename='neurostride_demo_video.mp4', desc='NeuroStride Working Product Demo Video (MP4)')
with open(img1_path, 'rb') as f:
    doc_new.embfile_add('neurostride_phase1_prototype.jpg', f.read(), filename='neurostride_phase1_prototype.jpg', ufilename='neurostride_phase1_prototype.jpg', desc='Phase 1 MVP Hardware Prototype')
with open(img3_path, 'rb') as f:
    doc_new.embfile_add('neurostride_phase3_product.jpg', f.read(), filename='neurostride_phase3_product.jpg', ufilename='neurostride_phase3_product.jpg', desc='Phase 3 Commercial Wearable Hardware')


# Save full PDF on D: drive
out_full_pdf = r'd:\projects\neurostride\docs\NeuroStride_Investor_Report_1_Full.pdf'
out_main_pdf = r'd:\projects\neurostride\documentation\main-documentation\NeuroStride_Investor_Report_1_Full.pdf'
doc_new.save(out_full_pdf)
doc_new.save(out_main_pdf)
print("Saved 3-page full PDF to D: drive!")

# Create desktop version without heavy 124MB video payload inside pdf body (so it fits C: drive space)
doc_desk = fitz.open()
doc_desk.insert_pdf(doc_new, from_page=0, to_page=2)
for i in range(doc_desk.embfile_count()-1, -1, -1):
    try:
        doc_desk.embfile_del(i)
    except:
        pass

with open(img1_path, 'rb') as f:
    doc_desk.embfile_add('neurostride_phase1_prototype.jpg', f.read(), filename='neurostride_phase1_prototype.jpg', ufilename='neurostride_phase1_prototype.jpg', desc='Phase 1 MVP Hardware Prototype')
with open(img3_path, 'rb') as f:
    doc_desk.embfile_add('neurostride_phase3_product.jpg', f.read(), filename='neurostride_phase3_product.jpg', ufilename='neurostride_phase3_product.jpg', desc='Phase 3 Commercial Wearable Hardware')

tmp_desktop_pdf = r'C:\Users\PREDATOR\Desktop\NeuroStride_Investor_Report_1_tmp.pdf'
doc_desk.save(tmp_desktop_pdf)
doc_desk.close()

import shutil
shutil.move(tmp_desktop_pdf, r'C:\Users\PREDATOR\Desktop\NeuroStride_Investor_Report_1.pdf')
print("Successfully updated Desktop PDF!")
