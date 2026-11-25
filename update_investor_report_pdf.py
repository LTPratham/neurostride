import fitz
import shutil
import os

pdf_in = r'C:\Users\PREDATOR\Desktop\NeuroStride_Investor_Report_1.pdf'
pdf_out_desktop = r'C:\Users\PREDATOR\Desktop\NeuroStride_Investor_Report_1.pdf'
pdf_out_docs_full = r'd:\projects\neurostride\docs\NeuroStride_Investor_Report_1_Full.pdf'
pdf_out_main_full = r'd:\projects\neurostride\documentation\main-documentation\NeuroStride_Investor_Report_1_Full.pdf'

video_in = r'd:\projects\neurostride\documentation\main-documentation\neurostride_demo_video.mp4'
img1_in = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase1_prototype.jpg'
img3_in = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase3_product.jpg'

doc = fitz.open(pdf_in)

# Clear existing embfiles if present
for i in range(doc.embfile_count()-1, -1, -1):
    try:
        doc.embfile_del(i)
    except Exception as e:
        print("Del embfile err:", e)

# 1. Build D: drive version with full 124MB video attached
with open(video_in, 'rb') as f:
    doc.embfile_add('neurostride_demo_video.mp4', f.read(), filename='neurostride_demo_video.mp4', ufilename='neurostride_demo_video.mp4', desc='NeuroStride Working Product Demo Video (MP4)')

with open(img1_in, 'rb') as f:
    doc.embfile_add('neurostride_phase1_prototype.jpg', f.read(), filename='neurostride_phase1_prototype.jpg', ufilename='neurostride_phase1_prototype.jpg', desc='Phase 1 MVP Hardware Prototype')

with open(img3_in, 'rb') as f:
    doc.embfile_add('neurostride_phase3_product.jpg', f.read(), filename='neurostride_phase3_product.jpg', ufilename='neurostride_phase3_product.jpg', desc='Phase 3 Commercial Wearable Hardware')

doc.save(pdf_out_docs_full)
doc.save(pdf_out_main_full)
doc.close()
print("Saved full PDF with embedded 124MB video file to D: drive!")

# 2. Build Desktop PDF without huge 124MB payload so it fits on C: drive space
doc_d = fitz.open(pdf_in)
for i in range(doc_d.embfile_count()-1, -1, -1):
    try:
        doc_d.embfile_del(i)
    except Exception as e:
        pass

with open(img1_in, 'rb') as f:
    doc_d.embfile_add('neurostride_phase1_prototype.jpg', f.read(), filename='neurostride_phase1_prototype.jpg', ufilename='neurostride_phase1_prototype.jpg', desc='Phase 1 MVP Hardware Prototype')

with open(img3_in, 'rb') as f:
    doc_d.embfile_add('neurostride_phase3_product.jpg', f.read(), filename='neurostride_phase3_product.jpg', ufilename='neurostride_phase3_product.jpg', desc='Phase 3 Commercial Wearable Hardware')

tmp_desktop = r'C:\Users\PREDATOR\Desktop\NeuroStride_Investor_Report_1_tmp.pdf'
doc_d.save(tmp_desktop)
doc_d.close()

shutil.move(tmp_desktop, pdf_out_desktop)
print("Updated Desktop PDF successfully!")
