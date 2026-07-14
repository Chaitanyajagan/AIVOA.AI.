import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = "sqlite:///./crm.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Association tables for many-to-many relationships
interaction_material_association = Table(
    "interaction_material",
    Base.metadata,
    Column("interaction_id", Integer, ForeignKey("interactions.id", ondelete="CASCADE"), primary_key=True),
    Column("material_id", Integer, ForeignKey("materials.id", ondelete="CASCADE"), primary_key=True)
)

interaction_sample_association = Table(
    "interaction_sample",
    Base.metadata,
    Column("interaction_id", Integer, ForeignKey("interactions.id", ondelete="CASCADE"), primary_key=True),
    Column("sample_id", Integer, ForeignKey("samples.id", ondelete="CASCADE"), primary_key=True),
    Column("quantity", Integer, default=1)
)

class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    specialty = Column(String, nullable=False)
    hospital = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    interactions = relationship("Interaction", back_populates="hcp", cascade="all, delete-orphan")

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # e.g. "Brochure", "Study", "PDF"
    url = Column(String, nullable=True)

class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    stock_count = Column(Integer, default=100)

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id", ondelete="CASCADE"), nullable=False)
    interaction_type = Column(String, nullable=False, default="Meeting") # Meeting, Call, Email, etc.
    date = Column(String, nullable=False) # YYYY-MM-DD
    time = Column(String, nullable=False) # HH:MM
    attendees = Column(String, nullable=True) # Comma-separated names
    topics_discussed = Column(Text, nullable=True)
    sentiment = Column(String, nullable=False, default="Neutral") # Positive, Neutral, Negative
    outcomes = Column(Text, nullable=True)
    follow_up_actions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hcp = relationship("HCP", back_populates="interactions")
    materials = relationship("Material", secondary=interaction_material_association)
    samples = relationship("Sample", secondary=interaction_sample_association)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
