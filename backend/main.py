from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import datetime

from database import get_db, init_db, HCP, Material, Sample, Interaction
from agent import run_agent

# Initialize Database
init_db()

app = FastAPI(title="AI-First CRM API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For easy local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class InteractionCreate(BaseModel):
    hcp_id: int
    interaction_type: str = "Meeting"
    date: str
    time: str
    attendees: Optional[str] = ""
    topics_discussed: Optional[str] = ""
    sentiment: str = "Neutral"
    outcomes: Optional[str] = ""
    follow_up_actions: Optional[str] = ""
    materials_shared_ids: List[int] = []
    samples_distributed_ids: List[int] = []

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    messages: List[ChatMessage]
    draft_interaction: Dict[str, Any]
    api_key: Optional[str] = None

class VoiceTranscriptPayload(BaseModel):
    transcript: str
    api_key: Optional[str] = None

# ---------------------------------------------------------
# Endpoints
# ---------------------------------------------------------

@app.get("/api/hcps")
def get_hcps(db: Session = Depends(get_db)):
    hcps = db.query(HCP).all()
    return [{"id": h.id, "name": h.name, "specialty": h.specialty, "hospital": h.hospital, "email": h.email, "phone": h.phone} for h in hcps]

@app.get("/api/materials-samples")
def get_materials_samples(db: Session = Depends(get_db)):
    materials = db.query(Material).all()
    samples = db.query(Sample).all()
    return {
        "materials": [{"id": m.id, "name": m.name, "type": m.type, "url": m.url} for m in materials],
        "samples": [{"id": s.id, "name": s.name, "stock_count": s.stock_count} for s in samples]
    }

@app.get("/api/interactions")
def get_interactions(db: Session = Depends(get_db)):
    interactions = db.query(Interaction).order_by(Interaction.date.desc(), Interaction.time.desc()).all()
    result = []
    for item in interactions:
        result.append({
            "id": item.id,
            "hcp_id": item.hcp_id,
            "hcp_name": item.hcp.name if item.hcp else "Unknown",
            "interaction_type": item.interaction_type,
            "date": item.date,
            "time": item.time,
            "attendees": item.attendees,
            "topics_discussed": item.topics_discussed,
            "sentiment": item.sentiment,
            "outcomes": item.outcomes,
            "follow_up_actions": item.follow_up_actions,
            "materials": [{"id": m.id, "name": m.name} for m in item.materials],
            "samples": [{"id": s.id, "name": s.name} for s in item.samples]
        })
    return result

@app.post("/api/interactions")
def create_interaction(data: InteractionCreate, db: Session = Depends(get_db)):
    # Validate HCP exists
    hcp = db.query(HCP).filter(HCP.id == data.hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")

    try:
        interaction = Interaction(
            hcp_id=data.hcp_id,
            interaction_type=data.interaction_type,
            date=data.date or datetime.date.today().strftime("%Y-%m-%d"),
            time=data.time or datetime.datetime.now().strftime("%H:%M"),
            attendees=data.attendees,
            topics_discussed=data.topics_discussed,
            sentiment=data.sentiment,
            outcomes=data.outcomes,
            follow_up_actions=data.follow_up_actions
        )

        if data.materials_shared_ids:
            materials = db.query(Material).filter(Material.id.in_(data.materials_shared_ids)).all()
            interaction.materials.extend(materials)

        if data.samples_distributed_ids:
            samples = db.query(Sample).filter(Sample.id.in_(data.samples_distributed_ids)).all()
            interaction.samples.extend(samples)
            for s in samples:
                s.stock_count = max(0, s.stock_count - 1)

        db.add(interaction)
        db.commit()
        db.refresh(interaction)

        return {
            "status": "success",
            "message": f"Successfully logged interaction with {hcp.name}.",
            "id": interaction.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/interactions/{id}")
def update_interaction(id: int, data: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    try:
        for key, value in data.items():
            if hasattr(interaction, key):
                if key == "materials_shared_ids":
                    materials = db.query(Material).filter(Material.id.in_(value)).all()
                    interaction.materials = materials
                elif key == "samples_distributed_ids":
                    samples = db.query(Sample).filter(Sample.id.in_(value)).all()
                    interaction.samples = samples
                else:
                    setattr(interaction, key, value)

        db.commit()
        return {"status": "success", "message": f"Updated interaction ID {id}."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
def chat_with_agent(payload: ChatPayload):
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    
    # Reconstruct langchain messages list
    langchain_messages = []
    for msg in payload.messages:
        if msg.role == "user":
            langchain_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            langchain_messages.append(AIMessage(content=msg.content))
            
    # Run the LangGraph agent
    result = run_agent(
        messages=langchain_messages,
        draft_interaction=payload.draft_interaction,
        api_key=payload.api_key
    )
    
    return result

@app.post("/api/voice-summarize")
def summarize_voice(payload: VoiceTranscriptPayload, db: Session = Depends(get_db)):
    # This endpoint parses the voice transcript to populate the form.
    # We can use a simple prompt to a lightweight ChatGroq instance, or fall back to rule-based extraction.
    transcript = payload.transcript.lower()
    
    extracted = {
        "topics_discussed": f"Transcription summary: {payload.transcript}",
        "date": datetime.date.today().strftime("%Y-%m-%d"),
        "time": datetime.datetime.now().strftime("%H:%M")
    }
    
    # Simple rule-based extraction for fallback
    if "sharma" in transcript:
        extracted["hcp_id"] = 1
    elif "smith" in transcript:
        extracted["hcp_id"] = 2
    elif "patel" in transcript:
        extracted["hcp_id"] = 3
    elif "davis" in transcript:
        extracted["hcp_id"] = 4
        
    if "positive" in transcript or "excited" in transcript or "happy" in transcript:
        extracted["sentiment"] = "Positive"
    elif "negative" in transcript or "disappointed" in transcript or "unhappy" in transcript:
        extracted["sentiment"] = "Negative"
    else:
        extracted["sentiment"] = "Neutral"
        
    if "oncoboost" in transcript:
        extracted["materials_shared_ids"] = [1]
        extracted["samples_distributed_ids"] = [1]
    elif "cardiolife" in transcript:
        extracted["materials_shared_ids"] = [2]
        extracted["samples_distributed_ids"] = [2]
        
    return {
        "status": "success",
        "extracted_fields": extracted
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
