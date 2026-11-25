import fitz
import os
import shutil

src_pdf = r'd:\projects\neurostride\docs\NeuroStride_Investor_Report_1_Full.pdf'
pdf_desktop = r'C:\Users\PREDATOR\Desktop\NeuroStride_Investor_Report_1.pdf'

img1_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase1_prototype.jpg'
img3_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_phase3_product.jpg'
video_path = r'd:\projects\neurostride\documentation\main-documentation\neurostride_demo_video.mp4'

# Open full PDF from D: drive
doc_src = fitz.open(src_pdf)
print("Source PDF page count:", len(doc_src))

# Build 3-page PDF without embedding 124MB video in body (so it's ~1.5 MB)
doc = fitz.open()
doc.insert_pdf(doc_src, from_page=0, to_page=2)

# Clear existing embfiles in doc
for i in range(doc.embfile_count()-1, -1, -1):
    try:
        doc.embfile_del(i)
    except Exception as e:
        print("Del err:", e)

# Embed images into PDF attachment stream
with open(img1_path, 'rb') as f:
    doc.embfile_add('neurostride_phase1_prototype.jpg', f.read(), filename='neurostride_phase1_prototype.jpg', ufilename='neurostride_phase1_prototype.jpg', desc='Phase 1 MVP Hardware Prototype')
with open(img3_path, 'rb') as f:
    doc.embfile_add('neurostride_phase3_product.jpg', f.read(), filename='neurostride_phase3_product.jpg', ufilename='neurostride_phase3_product.jpg', desc='Phase 3 Commercial Wearable Hardware')

doc.save(pdf_desktop)
doc.close()
doc_src.close()

print("Successfully saved 3-page PDF to Desktop (size:", os.path.getsize(pdf_desktop), "bytes)!")
