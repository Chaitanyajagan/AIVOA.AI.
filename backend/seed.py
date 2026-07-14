from database import init_db, SessionLocal, HCP, Material, Sample, Interaction

def seed_data():
    init_db()
    db = SessionLocal()
    
    # Check if database is already seeded
    if db.query(HCP).first() is not None:
        print("Database already seeded.")
        db.close()
        return

    print("Seeding database...")
    
    # Add HCPs
    hcps = [
        HCP(name="Dr. Anil Sharma", specialty="Oncology", hospital="Apollo Hospital, Delhi", email="anil.sharma@apollo.com", phone="+91-9876543210"),
        HCP(name="Dr. Sarah Smith", specialty="Cardiology", hospital="City General Hospital, Mumbai", email="sarah.smith@cityhospital.com", phone="+91-8765432109"),
        HCP(name="Dr. Priya Patel", specialty="Pediatrics", hospital="Children's Health Clinic, Bangalore", email="priya.patel@childrenshealth.com", phone="+91-7654321098"),
        HCP(name="Dr. James Davis", specialty="Neurology", hospital="Neurological Institute, Pune", email="james.davis@neuroinstitute.com", phone="+91-6543210987")
    ]
    db.add_all(hcps)
    
    # Add Materials
    materials = [
        Material(name="OncoBoost Phase III Clinical Trial PDF", type="Clinical Study", url="http://example.com/materials/oncoboost-phase-3.pdf"),
        Material(name="CardioLife Patient Care Brochure", type="Brochure", url="http://example.com/materials/cardiolife-brochure.pdf"),
        Material(name="NeuroShield Efficacy Slides", type="Slide Deck", url="http://example.com/materials/neuroshield-efficacy.pdf"),
        Material(name="PediatraCare Dosage Chart", type="Brochure", url="http://example.com/materials/pediatracare-dosage.pdf")
    ]
    db.add_all(materials)
    
    # Add Samples
    samples = [
        Sample(name="OncoBoost 10mg Tablets", stock_count=50),
        Sample(name="CardioLife 5mg Capsules", stock_count=100),
        Sample(name="NeuroShield 20mg Tablets", stock_count=30),
        Sample(name="PediatraCare Liquid Suspension", stock_count=200)
    ]
    db.add_all(samples)
    
    db.commit()
    print("Database seeding completed.")
    db.close()

if __name__ == "__main__":
    seed_data()
