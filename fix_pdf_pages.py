import fitz
import os

img1_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase1_prototype.jpg'
img3_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase3_product.jpg'
video_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_demo_video.mp4'

pdf_desktop = r'C:\Users\PREDATOR\Desktop\NeuroStride_Investor_Report_1.pdf'

# Read clean bytes from desktop PDF
with open(pdf_desktop, 'rb') as f:
    pdf_bytes = f.read()

def create_3page_doc(embed_video=True):
    doc = fitz.open('pdf', pdf_bytes)
    
    # Insert Page 2 for Hardware Showcase & Video Demo right after Page 1
    page2 = doc.new_page(pno=1, width=612, height=792)

    # Top Header Banners
    shape = page2.new_shape()
    shape.draw_rect(fitz.Rect(38, 37, 400, 95))
    shape.finish(color=(0.10, 0.14, 0.28), fill=(0.10, 0.14, 0.28))

    shape.draw_rect(fitz.Rect(400, 37, 574, 95))
    shape.finish(color=(0.424, 0.388, 1.0), fill=(0.424, 0.388, 1.0))
    shape.commit()

    page2.insert_text(fitz.Point(48, 55), "NEUROSTRIDE", fontsize=9, color=(0.424, 0.388, 1.0), fontname="helv")
    page2.insert_text(fitz.Point(48, 73), "Hardware Evolution & Demo Video", fontsize=15, color=(1, 1, 1), fontname="hebo")
    page2.insert_text(fitz.Point(48, 86), "Phase 1 MVP Prototype vs. Phase 3 Commercial Wearable Hardware", fontsize=8.5, color=(0.8, 0.8, 0.9), fontname="helv")

    page2.insert_text(fitz.Point(450, 58), "SEEKING", fontsize=8, color=(0.9, 0.9, 1.0), fontname="hebo")
    page2.insert_text(fitz.Point(435, 78), "₹1 Cr Seed", fontsize=14, color=(1, 1, 1), fontname="hebo")

    # Section 5: Hardware Evolution
    page2.insert_text(fitz.Point(38, 115), "5. Hardware Evolution — Phase 1 MVP vs. Phase 3 Commercial Target", fontsize=11, color=(0.10, 0.14, 0.28), fontname="hebo")

    shape = page2.new_shape()
    shape.draw_line(fitz.Point(38, 120), fitz.Point(574, 120))
    shape.finish(color=(0.424, 0.388, 1.0), width=1)
    shape.commit()

    # Render BOTH Images side by side prominently on the page canvas!
    # Left: Phase 1 MVP Prototype (Black arm, red finger, ESP32)
    rect_img1 = fitz.Rect(38, 128, 290, 298)
    page2.insert_image(rect_img1, filename=img1_path)

    # Right: Phase 3 Commercial Product (White/blue glove, ADS1299 board)
    rect_img3 = fitz.Rect(322, 128, 574, 298)
    page2.insert_image(rect_img3, filename=img3_path)

    # Image Labels
    page2.insert_text(fitz.Point(38, 310), "Phase 1 MVP Hardware Prototype (Live Engineering Rig)", fontsize=8.5, color=(0.10, 0.14, 0.28), fontname="hebo")
    page2.insert_text(fitz.Point(38, 321), "Black 3D-printed arm, red finger servos, ESP32 board (COGS: ~₹4,500)", fontsize=7.5, color=(0.3, 0.3, 0.3), fontname="helv")

    page2.insert_text(fitz.Point(322, 310), "Phase 3 Commercial Wearable Hardware Target", fontsize=8.5, color=(0.10, 0.14, 0.28), fontname="hebo")
    page2.insert_text(fitz.Point(322, 321), "White/blue PETG glove, ADS1299 24-bit AFE board (COGS: ₹11,200)", fontsize=7.5, color=(0.3, 0.3, 0.3), fontname="helv")

    # BOM Table Box
    shape = page2.new_shape()
    shape.draw_rect(fitz.Rect(38, 332, 574, 435))
    shape.finish(color=(0.85, 0.85, 0.90), fill=(0.97, 0.97, 1.0), width=0.75)
    shape.draw_rect(fitz.Rect(38, 332, 574, 348))
    shape.finish(color=(0.10, 0.14, 0.28), fill=(0.10, 0.14, 0.28))
    shape.commit()

    page2.insert_text(fitz.Point(45, 343), "Specification", fontsize=8, color=(1, 1, 1), fontname="hebo")
    page2.insert_text(fitz.Point(210, 343), "Phase 1 MVP Prototype (Live Test Rig)", fontsize=8, color=(1, 1, 1), fontname="hebo")
    page2.insert_text(fitz.Point(400, 343), "Phase 3 Commercial Product Target", fontsize=8, color=(1, 1, 1), fontname="hebo")

    rows = [
        ("Microcontroller / AFE", "ESP32-WROOM-32D Board", "Custom PCB + ADS1299 24-bit Low-Noise ADC"),
        ("Exoskeleton Frame", "3D-printed forearm sleeve + MG996R Servos", "Industrial White/Blue Mechanical PETG Glove"),
        ("Electrodes & Cabling", "Surface EMG pads + velcro arm straps", "Active dry EEG headband + shielded cables"),
        ("Manufacturing Cost (COGS)", "~₹4,500 (Internal Test Rig)", "₹11,200 (Target COGS limit < ₹12,000)"),
        ("Target Retail Price", "N/A (Engineering Prototype)", "₹25,000 (Full Kit) / ₹16,000 (Board)")
    ]

    y_curr = 360
    for spec, p1_val, p3_val in rows:
        page2.insert_text(fitz.Point(45, y_curr), spec, fontsize=7.5, color=(0.1, 0.1, 0.1), fontname="hebo")
        page2.insert_text(fitz.Point(210, y_curr), p1_val, fontsize=7.5, color=(0.2, 0.2, 0.2), fontname="helv")
        page2.insert_text(fitz.Point(400, y_curr), p3_val, fontsize=7.5, color=(0.2, 0.2, 0.2), fontname="helv")
        y_curr += 16

    # Section 6: Video Demonstration
    page2.insert_text(fitz.Point(38, 452), "6. Working Product Demonstration Video", fontsize=11, color=(0.10, 0.14, 0.28), fontname="hebo")

    shape = page2.new_shape()
    shape.draw_line(fitz.Point(38, 456), fitz.Point(574, 456))
    shape.finish(color=(0.424, 0.388, 1.0), width=1)
    shape.commit()

    # Video Card Box
    shape = page2.new_shape()
    shape.draw_rect(fitz.Rect(38, 465, 574, 720))
    shape.finish(color=(0.424, 0.388, 1.0), fill=(0.95, 0.94, 1.0), width=1.5)
    shape.draw_rect(fitz.Rect(38, 465, 574, 488))
    shape.finish(color=(0.424, 0.388, 1.0), fill=(0.424, 0.388, 1.0))
    shape.commit()

    page2.insert_text(fitz.Point(48, 481), "🎬 LIVE HARDWARE DEMONSTRATION & BIOSIGNAL ACTUATION VIDEO", fontsize=9, color=(1, 1, 1), fontname="hebo")

    page2.insert_text(fitz.Point(50, 503), "A full functional hardware demonstration video has been recorded and attached for investors.", fontsize=8, color=(0.2, 0.2, 0.2), fontname="helv")
    page2.insert_text(fitz.Point(50, 515), "The video demonstrates real-time EMG biosignal acquisition, IIR noise filtering, FFT frequency band analysis,", fontsize=8, color=(0.2, 0.2, 0.2), fontname="helv")
    page2.insert_text(fitz.Point(50, 527), "WebSocket transmission to the Next.js patient dashboard, and intent-triggered servo arm finger flexion.", fontsize=8, color=(0.2, 0.2, 0.2), fontname="helv")

    page2.insert_text(fitz.Point(50, 547), "• Video File Name:", fontsize=8, color=(0.1, 0.1, 0.1), fontname="hebo")
    page2.insert_text(fitz.Point(145, 547), "neurostride_demo_video.mp4 (Original: PXL_20260422_103900416~2 - Trim.mp4)", fontsize=8, color=(0.2, 0.2, 0.2), fontname="helv")

    page2.insert_text(fitz.Point(50, 560), "• File Size & Format:", fontsize=8, color=(0.1, 0.1, 0.1), fontname="hebo")
    page2.insert_text(fitz.Point(145, 560), "124 MB MP4 Video (Embedded directly inside PDF attachment stream)", fontsize=8, color=(0.2, 0.2, 0.2), fontname="helv")

    page2.insert_text(fitz.Point(50, 573), "• Hardware Tested:", fontsize=8, color=(0.1, 0.1, 0.1), fontname="hebo")
    page2.insert_text(fitz.Point(145, 573), "Phase 1 MVP Hardware Rig (ESP32 Board + MG996R Servo Arm)", fontsize=8, color=(0.2, 0.2, 0.2), fontname="helv")

    page2.insert_text(fitz.Point(50, 586), "• Relative Path:", fontsize=8, color=(0.1, 0.1, 0.1), fontname="hebo")
    page2.insert_text(fitz.Point(145, 586), "./documentation/main-documentation/neurostride_demo_video.mp4", fontsize=8, color=(0.2, 0.2, 0.2), fontname="helv")

    # Clickable Play Video Button Banner
    rect_play_btn = fitz.Rect(70, 608, 542, 650)
    shape = page2.new_shape()
    shape.draw_rect(rect_play_btn)
    shape.finish(color=(0.10, 0.14, 0.28), fill=(0.10, 0.14, 0.28), width=1)
    shape.commit()

    page2.insert_text(fitz.Point(100, 628), "▶  CLICK HERE TO PLAY LIVE PRODUCT DEMO VIDEO", fontsize=10.5, color=(1, 1, 1), fontname="hebo")
    page2.insert_text(fitz.Point(160, 642), "(Launches neurostride_demo_video.mp4 file directly)", fontsize=8, color=(0.8, 0.8, 1.0), fontname="helv")

    link_video_uri = "file:///d:/projects/neurostride/documentation/main-documentation/neurostride_demo_video.mp4"
    page2.insert_link({'kind': fitz.LINK_URI, 'from': rect_play_btn, 'uri': link_video_uri})

    page2.insert_text(fitz.Point(225, 755), "NeuroStride — Confidential Investor Overview  |  Page 2 of 3", fontsize=7.5, color=(0.4, 0.4, 0.4), fontname="helv")

    # Clear existing embfiles
    for i in range(doc.embfile_count()-1, -1, -1):
        try:
            doc.embfile_del(i)
        except:
            pass

    if embed_video:
        with open(video_path, 'rb') as f:
            doc.embfile_add('neurostride_demo_video.mp4', f.read(), filename='neurostride_demo_video.mp4', ufilename='neurostride_demo_video.mp4', desc='NeuroStride Working Product Demo Video (MP4)')
    
    with open(img1_path, 'rb') as f:
        doc.embfile_add('neurostride_phase1_prototype.jpg', f.read(), filename='neurostride_phase1_prototype.jpg', ufilename='neurostride_phase1_prototype.jpg', desc='Phase 1 MVP Hardware Prototype')
    with open(img3_path, 'rb') as f:
        doc.embfile_add('neurostride_phase3_product.jpg', f.read(), filename='neurostride_phase3_product.jpg', ufilename='neurostride_phase3_product.jpg', desc='Phase 3 Commercial Wearable Hardware')

    return doc

# 1. Save full PDF on D: drive (770 GB space)
doc_full = create_3page_doc(embed_video=True)
out_full_pdf = r'd:\projects\neurostride\docs\NeuroStride_Investor_Report_1_Full.pdf'
out_main_pdf = r'd:\projects\neurostride\documentation\main-documentation\NeuroStride_Investor_Report_1_Full.pdf'
doc_full.save(out_full_pdf)
doc_full.save(out_main_pdf)
doc_full.close()
print("Saved 3-page full PDF with embedded 124MB video to D: drive!")

# 2. Save desktop PDF directly to C: drive
doc_desk = create_3page_doc(embed_video=False)
doc_desk.save(pdf_desktop)
doc_desk.close()
print("Successfully saved updated 3-page PDF directly to Desktop!")
