"""
NeuroStride — Comprehensive Medicine Database
120+ medicines covering:
- Stroke & anticoagulation
- Paralysis & spasticity
- Neurology & neuropathy
- Rehabilitation supplements
- Cardiac & hypertension
- Diabetes & metabolic
- Pain management
- Antibiotics & infections
- Vitamins & supplements
- GI & antacids
- Mental health & sleep

Run: python seed_medicines2.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from routers.pharmacy import Medicine2, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neurostride:neurostride@localhost:5432/neurostride")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)

def seed():
    db = Session()
    existing = db.query(Medicine2).count()
    if existing >= 100:
        print(f"Already have {existing} medicines. Skipping.")
        db.close()
        return

    # Format: (name, generic_name, brand, category, price, stock, threshold, rx_required,
    #           dosage_form, strength, manufacturer, description, side_effects, interactions)

    medicines = [

        # ════════════════════════════════════════════
        # STROKE PREVENTION & TREATMENT
        # ════════════════════════════════════════════
        ("Aspirin",          "Acetylsalicylic Acid",  "Ecosprin",    "Stroke / Antiplatelet", 2.50,  580, 60, False, "tablet",  "75mg",      "USV",         "Antiplatelet for stroke and heart attack prevention", "GI upset, bleeding", ["warfarin","clopidogrel","ibuprofen"]),
        ("Aspirin HD",       "Acetylsalicylic Acid",  "Disprin",     "Stroke / Antiplatelet", 4.00,  320, 40, False, "tablet",  "150mg",     "Bayer",       "Higher dose antiplatelet for acute stroke", "GI bleeding, ulcer", ["warfarin","NSAIDs"]),
        ("Clopidogrel",      "Clopidogrel Bisulfate", "Plavix",      "Stroke / Antiplatelet", 18.00, 240, 35, True,  "tablet",  "75mg",      "Sanofi",      "Antiplatelet agent for stroke and ACS prevention", "Bleeding, bruising", ["aspirin","omeprazole","warfarin"]),
        ("Warfarin",         "Warfarin Sodium",       "Coumadin",    "Anticoagulant",         8.00,  180, 30, True,  "tablet",  "5mg",       "Bristol-Myers","Oral anticoagulant for AF and DVT", "Bleeding risk — monitor INR", ["aspirin","NSAIDs","antibiotics"]),
        ("Rivaroxaban",      "Rivaroxaban",           "Xarelto",     "Anticoagulant",         85.00, 120, 20, True,  "tablet",  "20mg",      "Bayer",       "Novel oral anticoagulant for AF stroke prevention", "Bleeding", ["azole antifungals","rifampicin"]),
        ("Apixaban",         "Apixaban",              "Eliquis",     "Anticoagulant",         95.00, 90,  15, True,  "tablet",  "5mg",       "Bristol-Myers","NOAC for non-valvular AF", "Bleeding, bruising", ["rifampicin","carbamazepine"]),
        ("Dabigatran",       "Dabigatran Etexilate",  "Pradaxa",     "Anticoagulant",         88.00, 75,  15, True,  "capsule", "150mg",     "Boehringer",  "Thrombin inhibitor for stroke prevention in AF", "Dyspepsia, bleeding", ["P-gp inhibitors"]),
        ("Alteplase",        "Alteplase (tPA)",       "Actilyse",    "Stroke / Thrombolytic", 4500.0, 5,  2,  True,  "injection","50mg vial", "Boehringer",  "IV thrombolytic for acute ischaemic stroke (within 4.5h)", "Haemorrhage", ["anticoagulants"]),
        ("Heparin",          "Unfractionated Heparin","Heparin Inj", "Anticoagulant",         45.00, 60,  10, True,  "injection","5000 IU/mL","Noven",       "IV anticoagulant for acute DVT and PE", "Bleeding, HIT", ["warfarin","aspirin"]),
        ("Enoxaparin",       "Enoxaparin Sodium",     "Clexane",     "Anticoagulant",         65.00, 80,  15, True,  "injection","40mg/0.4mL","Sanofi",      "LMWH for DVT prophylaxis post-stroke", "Injection site bruising", ["NSAIDs","aspirin"]),

        # ════════════════════════════════════════════
        # SPASTICITY & PARALYSIS REHABILITATION
        # ════════════════════════════════════════════
        ("Baclofen",         "Baclofen",              "Lioresal",    "Spasticity",            12.00, 220, 40, True,  "tablet",  "10mg",      "Novartis",    "Muscle relaxant for post-stroke/SCI spasticity", "Drowsiness, weakness", ["CNS depressants","alcohol"]),
        ("Baclofen 25mg",    "Baclofen",              "Lioresal-25", "Spasticity",            18.00, 140, 30, True,  "tablet",  "25mg",      "Novartis",    "Higher dose baclofen for severe spasticity", "Sedation, hypotension", ["CNS depressants"]),
        ("Tizanidine",       "Tizanidine HCl",        "Sirdalud",    "Spasticity",            22.00, 165, 30, True,  "tablet",  "4mg",       "Novartis",    "Central alpha-2 agonist for spasticity", "Hypotension, sedation", ["CYP1A2 inhibitors","antihypertensives"]),
        ("Dantrolene",       "Dantrolene Sodium",     "Dantrium",    "Spasticity",            38.00, 85,  20, True,  "capsule", "25mg",      "Par Pharma",  "Peripheral muscle relaxant for chronic spasticity", "Hepatotoxicity, weakness", ["CCBs"]),
        ("Botulinum Toxin A","OnabotulinumtoxinA",    "Botox",       "Spasticity",            2800.0, 12, 5,  True,  "injection","100 units", "Allergan",    "Focal spasticity treatment by muscle injection", "Injection site pain, weakness", ["aminoglycosides"]),
        ("Clonazepam",       "Clonazepam",            "Rivotril",    "Spasticity",            9.00,  130, 25, True,  "tablet",  "0.5mg",     "Roche",       "Benzodiazepine for spasm and anxiety in rehab", "Dependence, sedation", ["CNS depressants","opioids"]),
        ("Diazepam",         "Diazepam",              "Valium",      "Spasticity",            5.00,  90,  20, True,  "tablet",  "5mg",       "Roche",       "Acute muscle spasm relief", "Dependence, drowsiness", ["CNS depressants","opioids"]),

        # ════════════════════════════════════════════
        # NEUROPATHY & NERVE PAIN
        # ════════════════════════════════════════════
        ("Gabapentin 300",   "Gabapentin",            "Neurontin",   "Neuropathy",            15.00, 195, 30, True,  "capsule", "300mg",     "Pfizer",      "Neuropathic pain and partial seizures", "Dizziness, fatigue, weight gain", ["opioids","CNS depressants"]),
        ("Gabapentin 100",   "Gabapentin",            "Gabapin",     "Neuropathy",            8.00,  210, 40, True,  "capsule", "100mg",     "Intas",       "Starting dose gabapentin for neuropathy", "Dizziness", ["opioids"]),
        ("Pregabalin",       "Pregabalin",            "Lyrica",      "Neuropathy",            28.00, 175, 30, True,  "capsule", "75mg",      "Pfizer",      "Neuropathic pain, fibromyalgia", "Weight gain, dizziness", ["CNS depressants","thiazolidinediones"]),
        ("Pregabalin 150",   "Pregabalin",            "Lyrica-150",  "Neuropathy",            42.00, 110, 20, True,  "capsule", "150mg",     "Pfizer",      "Moderate to severe neuropathic pain", "Oedema, dizziness", ["CNS depressants"]),
        ("Amitriptyline",    "Amitriptyline HCl",     "Tryptomer",   "Neuropathy",            9.00,  160, 30, True,  "tablet",  "10mg",      "Sun Pharma",  "Neuropathic pain, sleep disturbance", "Sedation, dry mouth, constipation", ["MAOIs","SSRIs"]),
        ("Amitriptyline 25", "Amitriptyline HCl",     "Tryptomer-25","Neuropathy",            14.00, 95,  20, True,  "tablet",  "25mg",      "Sun Pharma",  "Depression and chronic neuropathic pain", "Cardiotoxicity, anticholinergic effects", ["MAOIs"]),
        ("Duloxetine",       "Duloxetine HCl",        "Cymbalta",    "Neuropathy",            35.00, 130, 25, True,  "capsule", "30mg",      "Eli Lilly",   "SNRI for diabetic neuropathy and depression", "Nausea, sweating, insomnia", ["MAOIs","NSAIDs"]),
        ("Duloxetine 60",    "Duloxetine HCl",        "Cymbalta-60", "Neuropathy",            55.00, 90,  20, True,  "capsule", "60mg",      "Eli Lilly",   "Full dose SNRI for neuropathic pain", "Hypertension, sexual dysfunction", ["MAOIs"]),
        ("Methylcobalamin",  "Methylcobalamin",       "Mecobalamin", "Neuropathy",            6.50,  460, 80, False, "tablet",  "500mcg",    "Sun Pharma",  "Active B12 for peripheral neuropathy", "None significant", []),
        ("Methylcobal Inj",  "Methylcobalamin",       "Methycobal",  "Neuropathy",            35.00, 80,  20, True,  "injection","500mcg/mL", "Eisai",       "IM/IV B12 for severe neuropathy", "Injection site pain", []),
        ("Alpha Lipoic Acid","Alpha Lipoic Acid",     "Thioctacid",  "Neuropathy",            45.00, 95,  20, False, "tablet",  "600mg",     "MEDA",        "Antioxidant for diabetic neuropathy", "Nausea", []),

        # ════════════════════════════════════════════
        # ANTICONVULSANTS (POST-STROKE SEIZURES)
        # ════════════════════════════════════════════
        ("Levetiracetam",    "Levetiracetam",         "Keppra",      "Anticonvulsant",        22.00, 145, 25, True,  "tablet",  "500mg",     "UCB",         "Post-stroke seizure prevention", "Behavioral changes, somnolence", ["methotrexate"]),
        ("Levetiracetam 1g", "Levetiracetam",         "Keppra-1000", "Anticonvulsant",        38.00, 80,  15, True,  "tablet",  "1000mg",    "UCB",         "Higher dose levetiracetam for seizure control", "Irritability, dizziness", []),
        ("Phenytoin",        "Phenytoin Sodium",      "Eptoin",      "Anticonvulsant",        8.00,  115, 20, True,  "tablet",  "100mg",     "Abbott",      "Classic antiepileptic for seizure management", "Gingival hyperplasia, ataxia", ["warfarin","carbamazepine"]),
        ("Valproic Acid",    "Sodium Valproate",      "Depakote",    "Anticonvulsant",        12.00, 130, 25, True,  "tablet",  "500mg",     "Abbott",      "Broad spectrum antiepileptic", "Hepatotoxicity, weight gain", ["aspirin","carbamazepine"]),
        ("Carbamazepine",    "Carbamazepine",         "Tegretol",    "Anticonvulsant",        10.00, 120, 25, True,  "tablet",  "200mg",     "Novartis",    "Trigeminal neuralgia and partial seizures", "Blood dyscrasias, hyponatraemia", ["warfarin","valproate"]),
        ("Lamotrigine",      "Lamotrigine",           "Lamictal",    "Anticonvulsant",        32.00, 95,  20, True,  "tablet",  "50mg",      "GSK",         "Adjunct antiepileptic and mood stabiliser", "Stevens-Johnson rash", ["valproate","phenytoin"]),
        ("Oxcarbazepine",    "Oxcarbazepine",         "Trileptal",   "Anticonvulsant",        28.00, 85,  18, True,  "tablet",  "300mg",     "Novartis",    "Partial seizures with better tolerability than CBZ", "Hyponatraemia, dizziness", ["warfarin","hormonal contraceptives"]),

        # ════════════════════════════════════════════
        # CARDIOVASCULAR (STROKE RISK FACTORS)
        # ════════════════════════════════════════════
        ("Atorvastatin 20",  "Atorvastatin Calcium",  "Lipitor",     "Statin",                8.00,  340, 50, True,  "tablet",  "20mg",      "Pfizer",      "Cholesterol management for stroke prevention", "Myopathy, liver enzyme elevation", ["gemfibrozil","cyclosporine"]),
        ("Atorvastatin 40",  "Atorvastatin Calcium",  "Lipitor-40",  "Statin",                14.00, 220, 35, True,  "tablet",  "40mg",      "Pfizer",      "High-intensity statin post-stroke", "Rhabdomyolysis (rare)", ["gemfibrozil"]),
        ("Rosuvastatin",     "Rosuvastatin Calcium",  "Crestor",     "Statin",                22.00, 185, 30, True,  "tablet",  "10mg",      "AstraZeneca", "High potency statin for CV risk", "Myalgia, proteinuria", ["gemfibrozil","niacin"]),
        ("Amlodipine",       "Amlodipine Besylate",   "Norvasc",     "Antihypertensive",      7.00,  310, 50, True,  "tablet",  "5mg",       "Pfizer",      "CCB for hypertension and angina", "Ankle swelling, flushing", ["simvastatin"]),
        ("Amlodipine 10",    "Amlodipine Besylate",   "Norvasc-10",  "Antihypertensive",      10.00, 195, 30, True,  "tablet",  "10mg",      "Pfizer",      "Higher dose CCB for uncontrolled BP", "Oedema, reflex tachycardia", ["simvastatin"]),
        ("Telmisartan",      "Telmisartan",           "Telma",       "Antihypertensive",      9.00,  255, 40, True,  "tablet",  "40mg",      "Glenmark",    "ARB for hypertension, renal protection", "Dizziness, hyperkalemia", ["potassium supplements","NSAIDs"]),
        ("Telmisartan 80",   "Telmisartan",           "Telma-80",    "Antihypertensive",      14.00, 165, 25, True,  "tablet",  "80mg",      "Glenmark",    "Full dose ARB for stroke and CV protection", "Hypotension", ["lithium","potassium"]),
        ("Ramipril",         "Ramipril",              "Altace",      "Antihypertensive",      8.00,  230, 40, True,  "tablet",  "5mg",       "Sanofi",      "ACE inhibitor post-MI and stroke prevention", "Dry cough, angioedema", ["potassium","NSAIDs"]),
        ("Metoprolol",       "Metoprolol Succinate",  "Toprol XL",   "Beta Blocker",          12.00, 210, 35, True,  "tablet",  "50mg",      "AstraZeneca", "Beta blocker for AF and post-MI", "Bradycardia, fatigue", ["verapamil","digoxin"]),
        ("Bisoprolol",       "Bisoprolol Fumarate",   "Concor",      "Beta Blocker",          10.00, 175, 30, True,  "tablet",  "5mg",       "Merck",       "Cardioselective beta blocker for heart failure", "Bradycardia, cold extremities", ["verapamil","amiodarone"]),
        ("Digoxin",          "Digoxin",               "Lanoxin",     "Cardiac",               15.00, 95,  20, True,  "tablet",  "0.25mg",    "GSK",         "Rate control in AF, heart failure", "Toxicity — narrow therapeutic index", ["amiodarone","quinidine","diuretics"]),
        ("Furosemide",       "Furosemide",            "Lasix",       "Diuretic",              4.50,  270, 45, True,  "tablet",  "40mg",      "Sanofi",      "Loop diuretic for oedema and heart failure", "Hypokalemia, dehydration", ["aminoglycosides","digoxin"]),
        ("Spironolactone",   "Spironolactone",        "Aldactone",   "Diuretic",              12.00, 145, 25, True,  "tablet",  "25mg",      "Pfizer",      "K-sparing diuretic for heart failure", "Hyperkalemia, gynaecomastia", ["ACE inhibitors","potassium"]),
        ("Nitroglycerin",    "Glyceryl Trinitrate",   "Nitrolingual","Cardiac",               28.00, 75,  15, True,  "tablet",  "0.5mg SL",  "Pohl-Boskamp","Acute angina relief", "Headache, hypotension", ["sildenafil","antihypertensives"]),
        ("Isosorbide Mono",  "Isosorbide Mononitrate","Imdur",       "Cardiac",               14.00, 120, 20, True,  "tablet",  "30mg",      "AstraZeneca", "Prophylaxis of angina", "Headache, hypotension", ["sildenafil"]),

        # ════════════════════════════════════════════
        # DIABETES (MAJOR STROKE RISK FACTOR)
        # ════════════════════════════════════════════
        ("Metformin",        "Metformin HCl",         "Glucophage",  "Antidiabetic",          4.00,  390, 60, True,  "tablet",  "500mg",     "USV",         "First-line type 2 diabetes", "GI upset, lactic acidosis (rare)", ["contrast dye","alcohol"]),
        ("Metformin 1g",     "Metformin HCl",         "Glycomet-1g", "Antidiabetic",          7.00,  250, 40, True,  "tablet",  "1000mg",    "USV",         "Full dose metformin for T2DM", "Diarrhoea, nausea", ["contrast dye"]),
        ("Glibenclamide",    "Glibenclamide",         "Daonil",      "Antidiabetic",          5.00,  180, 30, True,  "tablet",  "5mg",       "Sanofi",      "Sulphonylurea for T2DM", "Hypoglycaemia, weight gain", ["aspirin","warfarin","fluconazole"]),
        ("Glimepiride",      "Glimepiride",           "Amaryl",      "Antidiabetic",          8.00,  195, 30, True,  "tablet",  "2mg",       "Sanofi",      "Second-generation sulphonylurea", "Hypoglycaemia", ["fluconazole","warfarin"]),
        ("Sitagliptin",      "Sitagliptin Phosphate", "Januvia",     "Antidiabetic",          65.00, 110, 20, True,  "tablet",  "100mg",     "MSD",         "DPP-4 inhibitor for T2DM", "Nasopharyngitis, pancreatitis", ["digoxin"]),
        ("Empagliflozin",    "Empagliflozin",         "Jardiance",   "Antidiabetic",          92.00, 80,  15, True,  "tablet",  "10mg",      "Boehringer",  "SGLT2 inhibitor with CV and renal benefits", "UTI, DKA (rare)", ["diuretics"]),
        ("Insulin Glargine", "Insulin Glargine",      "Lantus",      "Antidiabetic",          485.00, 35, 8,  True,  "injection","100 units/mL","Sanofi",    "Basal insulin for T1/T2 diabetes", "Hypoglycaemia, lipodystrophy", ["thiazolidinediones","beta blockers"]),
        ("Insulin Actrapid", "Soluble Human Insulin", "Actrapid",    "Antidiabetic",          285.00, 40, 8,  True,  "injection","100 units/mL","Novo Nordisk","Short-acting insulin", "Hypoglycaemia", ["beta blockers"]),

        # ════════════════════════════════════════════
        # PAIN MANAGEMENT
        # ════════════════════════════════════════════
        ("Paracetamol",      "Acetaminophen",         "Crocin",      "Analgesic",             3.50,  680, 100, False,"tablet",  "500mg",     "GSK",         "Mild to moderate pain and fever", "Hepatotoxicity in overdose", ["warfarin","alcohol"]),
        ("Paracetamol 650",  "Acetaminophen",         "Calpol-650",  "Analgesic",             4.50,  520, 80, False, "tablet",  "650mg",     "GSK",         "Extended release paracetamol for sustained relief", "Hepatotoxicity", ["alcohol","warfarin"]),
        ("Ibuprofen",        "Ibuprofen",             "Brufen",      "NSAID",                 5.00,  420, 60, False, "tablet",  "400mg",     "Abbott",      "Inflammation, pain, fever", "GI ulcer, renal impairment", ["warfarin","aspirin","ACE inhibitors"]),
        ("Naproxen",         "Naproxen Sodium",       "Naprosyn",    "NSAID",                 8.00,  280, 40, False, "tablet",  "500mg",     "Roche",       "Longer-acting NSAID for arthritis pain", "GI bleeding, CV risk", ["warfarin","lithium","methotrexate"]),
        ("Diclofenac",       "Diclofenac Sodium",     "Voveran",     "NSAID",                 6.00,  310, 50, False, "tablet",  "50mg",      "Novartis",    "Anti-inflammatory for musculoskeletal pain", "GI upset, hepatotoxicity", ["warfarin","methotrexate"]),
        ("Diclofenac Gel",   "Diclofenac Sodium",     "Voveran Gel", "Topical NSAID",         35.00, 145, 25, False, "gel",     "1% 30g",    "Novartis",    "Topical NSAID for joint and muscle pain", "Skin irritation", []),
        ("Tramadol",         "Tramadol HCl",          "Ultram",      "Opioid Analgesic",      18.00, 95,  15, True,  "capsule", "50mg",      "Janssen",     "Moderate to severe pain in rehab", "Nausea, dependence, seizures", ["MAOIs","SSRIs","opioids"]),
        ("Pregabalin 75",    "Pregabalin",            "Lyrica-75",   "Analgesic",             28.00, 175, 30, True,  "capsule", "75mg",      "Pfizer",      "Neuropathic pain and fibromyalgia", "Dizziness, weight gain", ["CNS depressants"]),
        ("Tapentadol",       "Tapentadol HCl",        "Nucynta",     "Opioid Analgesic",      45.00, 60,  12, True,  "tablet",  "50mg",      "Janssen",     "Moderate to severe chronic pain", "Nausea, constipation, dependence", ["MAOIs","SSRIs"]),

        # ════════════════════════════════════════════
        # VITAMINS & REHABILITATION SUPPLEMENTS
        # ════════════════════════════════════════════
        ("Vitamin B12",      "Cyanocobalamin",        "B12",         "Vitamin",               4.50,  580, 100, False,"tablet",  "1000mcg",   "Sun Pharma",  "B12 deficiency, neuropathy support", "None significant", []),
        ("Methylcobalamin",  "Methylcobalamin",       "Mecobalamin", "Vitamin",               6.50,  490, 80, False, "tablet",  "500mcg",    "Eisai",       "Active B12 for nerve regeneration", "None known", []),
        ("Vitamin D3",       "Cholecalciferol",       "Calcirol",    "Vitamin",               8.00,  320, 50, False, "capsule", "60000 IU",  "Cadila",      "Weekly vitamin D for deficiency", "Hypercalcaemia in excess", []),
        ("Vitamin D3 1000",  "Cholecalciferol",       "Uprise D3",   "Vitamin",               5.00,  440, 70, False, "capsule", "1000 IU",   "Franco",      "Daily maintenance vitamin D", "None at normal doses", []),
        ("Calcium + D3",     "Calcium Carbonate+D3",  "Calcimax",    "Supplement",            6.00,  415, 65, False, "tablet",  "500mg+250IU","Elder Pharma","Bone health for bedridden patients", "Constipation, hypercalcaemia", ["iron","levothyroxine","quinolones"]),
        ("Calcium Citrate",  "Calcium Citrate",       "Citracal",    "Supplement",            12.00, 240, 40, False, "tablet",  "500mg",     "Bayer",       "Better-absorbed calcium for post-stroke osteoporosis", "Constipation", ["iron","levothyroxine"]),
        ("Zinc Sulphate",    "Zinc Sulphate",         "Zincovit",    "Supplement",            8.00,  295, 45, False, "tablet",  "50mg",      "Apex",        "Wound healing and immune support in rehab", "Nausea, copper deficiency", ["ciprofloxacin","tetracycline"]),
        ("Folic Acid",       "Folic Acid",            "Folvite",     "Vitamin",               2.50,  540, 80, False, "tablet",  "5mg",       "Cadila",      "Homocysteine lowering for stroke risk", "Masks B12 deficiency", ["methotrexate","antiepileptics"]),
        ("Vitamin B Complex","B-complex vitamins",    "Becosules",   "Vitamin",               5.00,  510, 80, False, "capsule", "B-complex",  "Pfizer",     "Nerve health and energy in rehabilitation", "Urine discoloration (harmless)", []),
        ("Multivitamin",     "Multivitamins + Minerals","Supradyn",  "Supplement",            18.00, 285, 45, False, "tablet",  "1 daily",   "Bayer",       "General nutritional supplement for recovery", "Nausea if taken on empty stomach", ["warfarin"]),
        ("Magnesium",        "Magnesium Glycinate",   "MagO7",       "Supplement",            22.00, 175, 30, False, "tablet",  "400mg",     "Nutraceutix", "Muscle cramps and spasms in rehab", "Diarrhoea in high doses", ["bisphosphonates","quinolones"]),
        ("Coenzyme Q10",     "Ubiquinol CoQ10",       "Q-Gel",       "Supplement",            55.00, 90,  18, False, "capsule", "100mg",     "Pharmos",     "Mitochondrial support post-stroke", "GI discomfort", ["warfarin","statins"]),
        ("Omega-3",          "EPA + DHA",             "Omacor",      "Supplement",            42.00, 135, 25, False, "capsule", "1000mg",    "Abbott",      "Cardiovascular protection and neuro-inflammation", "Fish burps, bleeding risk in high doses", ["warfarin","aspirin"]),

        # ════════════════════════════════════════════
        # GI / ANTACIDS (COMMON IN POLYPHARMACY)
        # ════════════════════════════════════════════
        ("Omeprazole",       "Omeprazole",            "Prilosec",    "Antacid",               6.50,  360, 55, False, "capsule", "20mg",      "AstraZeneca", "PPI for GERD, peptic ulcer, GI protection", "Hypomagnesaemia, C. diff risk", ["clopidogrel","methotrexate"]),
        ("Pantoprazole",     "Pantoprazole Sodium",   "Pantop",      "Antacid",               5.00,  390, 60, False, "tablet",  "40mg",      "Sun Pharma",  "GERD and stress ulcer prophylaxis", "Headache, diarrhoea", []),
        ("Rabeprazole",      "Rabeprazole Sodium",    "Pariet",      "Antacid",               8.00,  240, 40, False, "tablet",  "20mg",      "Eisai",       "PPI with less drug interaction than omeprazole", "Diarrhoea", ["methotrexate"]),
        ("Esomeprazole",     "Esomeprazole Magnesium","Nexium",      "Antacid",               14.00, 195, 30, False, "tablet",  "40mg",      "AstraZeneca", "Stronger PPI for erosive GERD", "Hypomagnesaemia", ["clopidogrel"]),
        ("Ranitidine",       "Ranitidine HCl",        "Zantac",      "Antacid",               4.50,  285, 45, False, "tablet",  "150mg",     "GSK",         "H2 blocker for mild acidity", "Headache", ["warfarin","metformin"]),
        ("Domperidone",      "Domperidone",           "Motilium",    "GI",                    5.50,  310, 50, False, "tablet",  "10mg",      "Janssen",     "Nausea and gastroparesis in rehab", "Hyperprolactinaemia, cardiac arrhythmia", ["QT-prolonging drugs"]),
        ("Ondansetron",      "Ondansetron HCl",       "Zofran",      "Antiemetic",            12.00, 200, 35, True,  "tablet",  "4mg",       "GSK",         "Nausea and vomiting prophylaxis", "Headache, constipation, QT prolongation", ["apomorphine","QT drugs"]),
        ("Metoclopramide",   "Metoclopramide HCl",    "Reglan",      "GI",                    4.00,  240, 40, False, "tablet",  "10mg",      "Sanofi",      "Gastroparesis and nausea", "Tardive dyskinesia (prolonged use)", ["levodopa","anticholinergics"]),
        ("Lactulose",        "Lactulose",             "Duphalac",    "Laxative",              22.00, 165, 28, False, "syrup",   "10g/15mL",  "Abbott",      "Constipation in bedridden rehab patients", "Flatulence, diarrhoea", ["neomycin","antacids"]),
        ("Senna",            "Sennoside A+B",         "Senokot",     "Laxative",              8.00,  240, 40, False, "tablet",  "7.5mg",     "Reckitt",     "Stimulant laxative for neurogenic bowel", "Cramps, electrolyte imbalance", []),
        ("Bisacodyl",        "Bisacodyl",             "Dulcolax",    "Laxative",              6.00,  220, 35, False, "tablet",  "5mg",       "Boehringer",  "Constipation management in paralysis", "Abdominal cramps", ["antacids","milk"]),

        # ════════════════════════════════════════════
        # MENTAL HEALTH / SLEEP (POST-STROKE DEPRESSION)
        # ════════════════════════════════════════════
        ("Sertraline",       "Sertraline HCl",        "Zoloft",      "Antidepressant",        18.00, 180, 30, True,  "tablet",  "50mg",      "Pfizer",      "Post-stroke depression and anxiety", "Nausea, insomnia, sexual dysfunction", ["MAOIs","tramadol","triptans"]),
        ("Escitalopram",     "Escitalopram Oxalate",  "Lexapro",     "Antidepressant",        22.00, 155, 25, True,  "tablet",  "10mg",      "Lundbeck",    "SSRI for depression and anxiety in stroke rehab", "Nausea, QT prolongation", ["MAOIs","pimozide"]),
        ("Fluoxetine",       "Fluoxetine HCl",        "Prozac",      "Antidepressant",        15.00, 165, 25, True,  "capsule", "20mg",      "Eli Lilly",   "SSRI for post-stroke depression, may aid motor recovery", "Insomnia, agitation", ["MAOIs","tramadol"]),
        ("Mirtazapine",      "Mirtazapine",           "Remeron",     "Antidepressant",        28.00, 110, 20, True,  "tablet",  "15mg",      "Organon",     "Depression with weight loss and insomnia", "Sedation, weight gain", ["MAOIs","CNS depressants"]),
        ("Quetiapine",       "Quetiapine Fumarate",   "Seroquel",    "Antipsychotic",         45.00, 85,  15, True,  "tablet",  "25mg",      "AstraZeneca", "Agitation, delirium, insomnia post-stroke", "Sedation, metabolic syndrome", ["CYP3A4 inhibitors","antihypertensives"]),
        ("Melatonin",        "Melatonin",             "Circadin",    "Sleep Aid",             18.00, 195, 30, False, "tablet",  "2mg",       "Neurim",      "Sleep disturbance in neurological patients", "Headache, dizziness", ["warfarin","fluvoxamine"]),
        ("Zolpidem",         "Zolpidem Tartrate",     "Ambien",      "Sedative",              22.00, 90,  15, True,  "tablet",  "10mg",      "Sanofi",      "Short-term insomnia in rehab", "Next-day drowsiness, dependence", ["CNS depressants","alcohol"]),
        ("Clonazepam 1mg",   "Clonazepam",            "Rivotril-1",  "Anxiolytic",            12.00, 110, 20, True,  "tablet",  "1mg",       "Roche",       "Anxiety and sleep in neuro rehab", "Dependence, sedation", ["CNS depressants","alcohol"]),

        # ════════════════════════════════════════════
        # ANTIBIOTICS & INFECTION (UTI, PNEUMONIA RISK)
        # ════════════════════════════════════════════
        ("Amoxicillin",      "Amoxicillin",           "Mox",         "Antibiotic",            12.00, 195, 35, True,  "capsule", "500mg",     "Cipla",       "Broad spectrum penicillin antibiotic", "Diarrhoea, allergy", ["methotrexate","warfarin"]),
        ("Amox+Clavulanate", "Amoxicillin+Clavulanate","Augmentin",  "Antibiotic",            32.00, 155, 25, True,  "tablet",  "625mg",     "GSK",         "Beta-lactamase-resistant antibiotic", "GI upset, C. diff", ["warfarin","methotrexate"]),
        ("Azithromycin",     "Azithromycin",          "Azee",        "Antibiotic",            18.00, 175, 30, True,  "tablet",  "500mg",     "Cipla",       "Community acquired pneumonia, atypical infection", "GI upset, QT prolongation", ["antacids","warfarin"]),
        ("Ciprofloxacin",    "Ciprofloxacin HCl",     "Cipro",       "Antibiotic",            14.00, 160, 28, True,  "tablet",  "500mg",     "Bayer",       "UTI and respiratory infections common in paralysis", "Tendon rupture, QT prolongation", ["warfarin","antacids","theophylline"]),
        ("Nitrofurantoin",   "Nitrofurantoin",        "Macrobid",    "Antibiotic",            22.00, 115, 20, True,  "capsule", "100mg",     "Procter",     "UTI prophylaxis in catheterised patients", "Pulmonary toxicity, neuropathy", ["magnesium","quinolones"]),
        ("Trimethoprim",     "Trimethoprim",          "Proloprim",   "Antibiotic",            10.00, 135, 22, True,  "tablet",  "200mg",     "GSK",         "Simple UTI in immobile patients", "Folate deficiency, nausea", ["methotrexate","warfarin"]),
        ("Doxycycline",      "Doxycycline Hyclate",   "Vibramycin",  "Antibiotic",            16.00, 145, 25, True,  "capsule", "100mg",     "Pfizer",      "Atypical pneumonia and Lyme disease", "Photosensitivity, oesophagitis", ["antacids","warfarin","penicillin"]),
        ("Fluconazole",      "Fluconazole",           "Diflucan",    "Antifungal",            25.00, 100, 18, True,  "capsule", "150mg",     "Pfizer",      "Oral and vaginal candidiasis common in antibiotic use", "Hepatotoxicity, QT prolongation", ["warfarin","statins","glibenclamide"]),

        # ════════════════════════════════════════════
        # RESPIRATORY (ASPIRATION RISK IN DYSPHAGIA)
        # ════════════════════════════════════════════
        ("Salbutamol",       "Salbutamol Sulphate",   "Ventolin",    "Bronchodilator",        35.00, 130, 22, False, "inhaler", "100mcg/dose","GSK",         "Acute bronchospasm relief", "Tremor, tachycardia", ["beta blockers","MAOIs"]),
        ("Budesonide",       "Budesonide",            "Pulmicort",   "ICS",                   85.00, 75,  12, True,  "inhaler", "200mcg/dose","AstraZeneca", "Inhaled corticosteroid for chronic asthma", "Oral candidiasis, dysphonia", ["ketoconazole"]),
        ("Prednisolone",     "Prednisolone",          "Wysolone",    "Corticosteroid",        14.00, 165, 28, True,  "tablet",  "5mg",        "Pfizer",      "Acute inflammation and immune conditions", "Osteoporosis, hyperglycaemia, immunosuppression", ["NSAIDs","live vaccines"]),
        ("Montelukast",      "Montelukast Sodium",    "Singulair",   "Leukotriene Inhibitor", 28.00, 120, 20, False, "tablet",  "10mg",       "MSD",        "Asthma and allergic rhinitis", "Neuropsychiatric effects (rare)", []),

        # ════════════════════════════════════════════
        # UROLOGICAL (NEUROGENIC BLADDER IN SCI)
        # ════════════════════════════════════════════
        ("Oxybutynin",       "Oxybutynin Chloride",   "Ditropan",    "Urological",            18.00, 105, 18, True,  "tablet",  "5mg",        "Janssen",     "Neurogenic bladder overactivity in SCI/stroke", "Dry mouth, constipation, confusion", ["anticholinergics","CYP3A4 inhibitors"]),
        ("Solifenacin",      "Solifenacin Succinate", "Vesicare",    "Urological",            55.00, 70,  12, True,  "tablet",  "5mg",        "Astellas",    "Overactive bladder with less CNS effects", "Dry mouth, constipation", ["CYP3A4 inhibitors"]),
        ("Tamsulosin",       "Tamsulosin HCl",        "Flomax",      "Urological",            22.00, 95,  18, True,  "capsule", "0.4mg",      "Boehringer",  "BPH and urinary retention in male stroke patients", "Retrograde ejaculation, hypotension", ["alpha blockers","PDE5 inhibitors"]),

        # ════════════════════════════════════════════
        # TOPICAL & WOUND CARE (PRESSURE SORES)
        # ════════════════════════════════════════════
        ("Silver Sulfadiazine","Silver Sulfadiazine", "Flamazine",   "Wound Care",            65.00, 55,  10, True,  "cream",   "1% 50g",     "Smith+Nephew","Pressure sore and burn wound care", "Skin discoloration, leukopenia", ["proteolytic enzymes"]),
        ("Betadine Ointment", "Povidone Iodine",      "Betadine",    "Wound Care",            22.00, 145, 25, False, "ointment","10% 30g",    "Mundipharma", "Antiseptic for wound cleaning", "Iodine toxicity in large wounds", ["lithium","antithyroid drugs"]),
        ("Mupirocin",        "Mupirocin",             "Bactroban",   "Wound Care",            45.00, 80,  15, True,  "ointment","2% 15g",     "GSK",         "MRSA decolonisation and skin infections", "Skin irritation", []),

        # ════════════════════════════════════════════
        # OTC GENERAL
        # ════════════════════════════════════════════
        ("Cetirizine",       "Cetirizine HCl",        "Zyrtec",      "Antihistamine",         4.00,  380, 60, False, "tablet",  "10mg",       "UCB",         "Allergic rhinitis and urticaria", "Drowsiness", ["CNS depressants","alcohol"]),
        ("Loratadine",       "Loratadine",            "Claritin",    "Antihistamine",         5.50,  295, 50, False, "tablet",  "10mg",       "Bayer",       "Non-sedating antihistamine for allergies", "Headache", []),
        ("Oral Rehydration", "ORS",                   "Electral",    "Electrolyte",           8.00,  250, 40, False, "sachet",  "21.8g",      "Franco",      "Dehydration and electrolyte replacement", "None", []),
        ("Chlorpheniramine", "Chlorpheniramine Maleate","Piriton",   "Antihistamine",         3.50,  310, 50, False, "tablet",  "4mg",        "GSK",         "Acute allergic reactions", "Sedation, dry mouth", ["MAOIs","CNS depressants"]),
    ]

    added = 0
    for (name, generic, brand, category, price, stock, threshold, rx_required,
         dosage_form, strength, manufacturer, description, side_effects, interactions) in medicines:
        # Skip if name already exists
        exists = db.query(Medicine2).filter(Medicine2.name == name).first()
        if exists:
            continue
        db.add(Medicine2(
            name=name, generic_name=generic, brand=brand, category=category,
            price=price, stock=stock, threshold=threshold, rx_required=rx_required,
            dosage_form=dosage_form, strength=strength, manufacturer=manufacturer,
            description=description, side_effects=side_effects,
            interactions=interactions, expiry="2027-06-30"
        ))
        added += 1

    db.commit()
    print(f"\nSeeded {added} new medicines!")
    print(f"Total in database: {db.query(Medicine2).count()}")
    print("\nCategories added:")
    cats = {}
    for m in db.query(Medicine2).all():
        cats[m.category] = cats.get(m.category, 0) + 1
    for cat, count in sorted(cats.items()):
        print(f"  {cat}: {count} medicines")
    db.close()

if __name__ == "__main__":
    seed()
