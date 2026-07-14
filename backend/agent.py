import os
import json
import datetime
from typing import Annotated, Sequence, TypedDict, List, Dict, Any, Union
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from database import SessionLocal, HCP, Material, Sample, Interaction, interaction_material_association, interaction_sample_association

# State definition
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    draft_interaction: Dict[str, Any]
    suggested_followups: List[str]
    session_id: str

# ---------------------------------------------------------
# Define Tools
# ---------------------------------------------------------

@tool
def search_hcp(query: str) -> str:
    """Search for Healthcare Professionals (HCPs) in the database by name, specialty, or hospital.
    Returns a list of matching HCPs with their IDs.
    """
    db = SessionLocal()
    try:
        hcps = db.query(HCP).filter(
            (HCP.name.like(f"%{query}%")) | 
            (HCP.specialty.like(f"%{query}%")) | 
            (HCP.hospital.like(f"%{query}%"))
        ).all()
        
        if not hcps:
            return "No HCPs found matching your query."
        
        result = []
        for hcp in hcps:
            result.append({
                "id": hcp.id,
                "name": hcp.name,
                "specialty": hcp.specialty,
                "hospital": hcp.hospital,
                "email": hcp.email,
                "phone": hcp.phone
            })
        return json.dumps(result)
    finally:
        db.close()

@tool
def get_available_materials_and_samples() -> str:
    """Retrieve all available marketing/clinical materials and drug samples in inventory.
    Use this to match details mentioned in interactions to available IDs.
    """
    db = SessionLocal()
    try:
        materials = db.query(Material).all()
        samples = db.query(Sample).all()
        
        result = {
            "materials": [{"id": m.id, "name": m.name, "type": m.type} for m in materials],
            "samples": [{"id": s.id, "name": s.name, "stock": s.stock_count} for s in samples]
        }
        return json.dumps(result)
    finally:
        db.close()

@tool
def get_interaction_history(hcp_id: int) -> str:
    """Retrieve the log history of past interactions with a specific HCP by their ID."""
    db = SessionLocal()
    try:
        hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
        if not hcp:
            return f"HCP with ID {hcp_id} not found."
        
        interactions = db.query(Interaction).filter(Interaction.hcp_id == hcp_id).order_by(Interaction.date.desc()).all()
        
        if not interactions:
            return f"No prior interactions logged for {hcp.name}."
            
        result = []
        for item in interactions:
            result.append({
                "id": item.id,
                "interaction_type": item.interaction_type,
                "date": item.date,
                "time": item.time,
                "topics_discussed": item.topics_discussed,
                "sentiment": item.sentiment,
                "outcomes": item.outcomes,
                "follow_up_actions": item.follow_up_actions
            })
        return json.dumps({
            "hcp_name": hcp.name,
            "interactions": result
        })
    finally:
        db.close()

@tool
def log_interaction(
    hcp_id: int,
    interaction_type: str = "Meeting",
    date: str = None,
    time: str = None,
    attendees: str = "",
    topics_discussed: str = "",
    materials_shared_ids: List[int] = None,
    samples_distributed_ids: List[int] = None,
    sentiment: str = "Neutral",
    outcomes: str = "",
    follow_up_actions: str = ""
) -> str:
    """Saves a new interaction record to the database for an HCP.
    Provide all available fields. Returns a success message with the logged interaction ID.
    Date should be in YYYY-MM-DD format. Time in HH:MM format.
    """
    db = SessionLocal()
    try:
        hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
        if not hcp:
            return f"Error: HCP with ID {hcp_id} does not exist."
            
        if not date:
            date = datetime.date.today().strftime("%Y-%m-%d")
        if not time:
            time = datetime.datetime.now().strftime("%H:%M")
            
        interaction = Interaction(
            hcp_id=hcp_id,
            interaction_type=interaction_type,
            date=date,
            time=time,
            attendees=attendees,
            topics_discussed=topics_discussed,
            sentiment=sentiment,
            outcomes=outcomes,
            follow_up_actions=follow_up_actions
        )
        
        # Link materials
        if materials_shared_ids:
            materials = db.query(Material).filter(Material.id.in_(materials_shared_ids)).all()
            interaction.materials.extend(materials)
            
        # Link samples
        if samples_distributed_ids:
            samples = db.query(Sample).filter(Sample.id.in_(samples_distributed_ids)).all()
            interaction.samples.extend(samples)
            # Decrement stock count
            for s in samples:
                s.stock_count = max(0, s.stock_count - 1)
                
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        
        return json.dumps({
            "status": "success",
            "message": f"Successfully logged interaction with ID {interaction.id} for {hcp.name}.",
            "interaction_id": interaction.id
        })
    except Exception as e:
        db.rollback()
        return f"Error logging interaction: {str(e)}"
    finally:
        db.close()

@tool
def edit_interaction(interaction_id: int, updated_fields: Dict[str, Any]) -> str:
    """Edits an existing interaction record in the database.
    Pass a dict of fields to update. E.g. updated_fields={"sentiment": "Positive", "outcomes": "Agreed to trial"}
    """
    db = SessionLocal()
    try:
        interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
        if not interaction:
            return f"Error: Interaction with ID {interaction_id} not found."
            
        for key, value in updated_fields.items():
            if hasattr(interaction, key):
                if key in ["materials_shared_ids", "samples_distributed_ids"]:
                    # Handle updating materials/samples lists
                    if key == "materials_shared_ids":
                        materials = db.query(Material).filter(Material.id.in_(value)).all()
                        interaction.materials = materials
                    elif key == "samples_distributed_ids":
                        samples = db.query(Sample).filter(Sample.id.in_(value)).all()
                        interaction.samples = samples
                else:
                    setattr(interaction, key, value)
                    
        db.commit()
        return json.dumps({
            "status": "success",
            "message": f"Successfully updated interaction ID {interaction_id}.",
            "interaction_id": interaction.id
        })
    except Exception as e:
        db.rollback()
        return f"Error updating interaction: {str(e)}"
    finally:
        db.close()

@tool
def update_draft_interaction(fields: Dict[str, Any]) -> str:
    """Updates the frontend UI's active 'draft' state with extracted values.
    Use this tool whenever the user mentions details that fit the interaction log,
    so that the structured form in the user interface is pre-filled in real-time.
    Supported keys: hcp_id, interaction_type, date, time, attendees, topics_discussed, sentiment, outcomes, follow_up_actions, materials_shared_ids, samples_distributed_ids.
    """
    # This tool doesn't edit the database directly. It communicates updates back to the UI.
    return json.dumps({
        "status": "draft_updated",
        "fields": fields
    })

# Group all tools
tools_list = [
    search_hcp, 
    get_available_materials_and_samples, 
    get_interaction_history, 
    log_interaction, 
    edit_interaction,
    update_draft_interaction
]
tools_map = {t.name: t for t in tools_list}

# ---------------------------------------------------------
# Agent Node & Graph Implementation
# ---------------------------------------------------------

SYSTEM_PROMPT = """You are an AI Assistant designed to help life science field representatives manage and log interactions with Healthcare Professionals (HCPs).
You are connected to a database of HCPs, marketing materials, and drug samples.

Your goals:
1. Help the representative find HCP details using `search_hcp`.
2. View past interactions using `get_interaction_history`.
3. Check available materials and samples using `get_available_materials_and_samples`.
4. Parse interaction descriptions in chat and automatically call `update_draft_interaction` to synchronize/populate the draft form fields in real-time.
5. Create and commit interactions using `log_interaction` when the user instructs you to log/save the interaction.
6. Edit interactions using `edit_interaction`.

Form Synchronization Rule:
Whenever the user describes an interaction (e.g. "Met Dr. Sharma today, talked about OncoBoost efficacy. He was very positive, shared brochure. Follow up next week."), you MUST immediately identify which fields match (e.g., HCP ID, topics discussed, sentiment, materials, samples, outcomes, follow-up actions) and call the `update_draft_interaction` tool with those fields so the UI form fills in.
- Sentiment must be mapped to "Positive", "Neutral", or "Negative".
- Search for the HCP first if you don't know their ID.
- Check materials and samples list first if you don't know their IDs.

Always respond politely, explaining what actions or tools you are executing.
"""

def execute_mock_agent(state: AgentState) -> Dict[str, Any]:
    """Fallback Rule-based parsing in case no Groq API Key is configured.
    Ensures the application works and can be verified offline.
    """
    messages = state.get("messages", [])
    draft = state.get("draft_interaction", {})
    suggested = state.get("suggested_followups", [])
    
    if not messages:
        return {"messages": [AIMessage(content="Hello! I'm your AI Assistant. How can I help you today?")], "draft_interaction": draft}
        
    last_msg = messages[-1].content.strip()
    last_msg_lower = last_msg.lower()
    
    response_text = ""
    called_tools_output = []
    
    # 1. Simple search_hcp trigger
    if "search" in last_msg_lower or "find" in last_msg_lower:
        # Extract possible name query
        query = last_msg.replace("search", "").replace("find", "").strip()
        if not query:
            query = "Sharma" # Default
        tool_res = search_hcp.invoke({"query": query})
        called_tools_output.append(("search_hcp", tool_res))
        response_text += f"I have searched for HCPs matching '{query}'. Here is what I found:\n"
        try:
            items = json.loads(tool_res)
            if isinstance(items, list):
                for item in items:
                    response_text += f"- **{item['name']}** (ID: {item['id']}) - {item['specialty']} at {item['hospital']}\n"
            else:
                response_text += f"{tool_res}\n"
        except:
            response_text += f"{tool_res}\n"
            
    # 2. Extract and update draft fields
    extracted_fields = {}
    if "sharma" in last_msg_lower:
        extracted_fields["hcp_id"] = 1
    elif "smith" in last_msg_lower:
        extracted_fields["hcp_id"] = 2
    elif "patel" in last_msg_lower:
        extracted_fields["hcp_id"] = 3
    elif "davis" in last_msg_lower:
        extracted_fields["hcp_id"] = 4
        
    if "positive" in last_msg_lower or "happy" in last_msg_lower or "liked" in last_msg_lower:
        extracted_fields["sentiment"] = "Positive"
    elif "negative" in last_msg_lower or "disliked" in last_msg_lower or "complained" in last_msg_lower:
        extracted_fields["sentiment"] = "Negative"
    elif "neutral" in last_msg_lower or "ok" in last_msg_lower:
        extracted_fields["sentiment"] = "Neutral"

    if "oncoboost" in last_msg_lower:
        extracted_fields["topics_discussed"] = "Discussed OncoBoost efficacy and patient trials."
        extracted_fields["materials_shared_ids"] = [1] # OncoBoost study
        extracted_fields["samples_distributed_ids"] = [1] # OncoBoost sample
    elif "cardiolife" in last_msg_lower:
        extracted_fields["topics_discussed"] = "Discussed CardioLife side-effects and dosage."
        extracted_fields["materials_shared_ids"] = [2]
        extracted_fields["samples_distributed_ids"] = [2]
        
    if "follow up" in last_msg_lower or "follow-up" in last_msg_lower:
        extracted_fields["follow_up_actions"] = "Schedule a follow-up call/meeting."
        
    if "meeting" in last_msg_lower:
        extracted_fields["interaction_type"] = "Meeting"
    elif "call" in last_msg_lower:
        extracted_fields["interaction_type"] = "Call"
    elif "email" in last_msg_lower:
        extracted_fields["interaction_type"] = "Email"

    # Merge draft fields
    if extracted_fields:
        draft = {**draft, **extracted_fields}
        tool_res = update_draft_interaction.invoke({"fields": extracted_fields})
        called_tools_output.append(("update_draft_interaction", tool_res))
        response_text += "\n[Form Synced] I've filled in the form with details extracted from your message."

    # 3. Log/Save trigger
    is_log_action = "log" in last_msg_lower or "save" in last_msg_lower or "commit" in last_msg_lower
    if is_log_action:
        # Validate we have hcp_id
        hcp_id = draft.get("hcp_id")
        if not hcp_id:
            hcp_id = 1 # Fallback to Dr Sharma
            draft["hcp_id"] = hcp_id
            
        log_res = log_interaction.invoke({
            "hcp_id": hcp_id,
            "interaction_type": draft.get("interaction_type", "Meeting"),
            "date": draft.get("date", datetime.date.today().strftime("%Y-%m-%d")),
            "time": draft.get("time", datetime.datetime.now().strftime("%H:%M")),
            "attendees": draft.get("attendees", ""),
            "topics_discussed": draft.get("topics_discussed", "Discussed product details."),
            "materials_shared_ids": draft.get("materials_shared_ids", []),
            "samples_distributed_ids": draft.get("samples_distributed_ids", []),
            "sentiment": draft.get("sentiment", "Neutral"),
            "outcomes": draft.get("outcomes", "Completed discussion."),
            "follow_up_actions": draft.get("follow_up_actions", "")
        })
        called_tools_output.append(("log_interaction", log_res))
        try:
            res_obj = json.loads(log_res)
            response_text += f"\n\n**Success:** Logged interaction. {res_obj.get('message', '')}."
        except:
            response_text += f"\n\n{log_res}"
            
    # 4. History check
    if "history" in last_msg_lower:
        hcp_id = draft.get("hcp_id", 1)
        history_res = get_interaction_history.invoke({"hcp_id": hcp_id})
        called_tools_output.append(("get_interaction_history", history_res))
        response_text += f"\n\nHere is the history of interactions with HCP ID {hcp_id}:\n"
        try:
            hist_data = json.loads(history_res)
            interactions = hist_data.get("interactions", [])
            if interactions:
                for inter in interactions:
                    response_text += f"- {inter['date']} ({inter['interaction_type']}): {inter['topics_discussed']} (Sentiment: {inter['sentiment']})\n"
            else:
                response_text += "No history found."
        except:
            response_text += history_res
            
    if not response_text:
        response_text = "I received your message. Let me know if you would like to search for an HCP, view their history, or log/edit an interaction."

    # Return AI Message
    ai_msg = AIMessage(content=response_text)
    
    # Generate some suggested follow-ups
    suggested = ["Schedule follow-up meeting in 2 weeks", "Send OncoBoost Phase III PDF", "Add to advisory board list"]
    
    return {
        "messages": [ai_msg],
        "draft_interaction": draft,
        "suggested_followups": suggested
    }

def run_agent(messages: List[BaseMessage], draft_interaction: Dict[str, Any], api_key: str = None) -> Dict[str, Any]:
    """Entry point to run the agent. If API key is provided, it uses Groq; otherwise falls back to mock."""
    state = {
        "messages": messages,
        "draft_interaction": draft_interaction or {},
        "suggested_followups": [],
        "session_id": "default"
    }
    
    effective_api_key = api_key or os.getenv("GROQ_API_KEY")
    
    if not effective_api_key:
        # Fallback to local rule-based mock engine
        return execute_mock_agent(state)
        
    try:
        # Actual Groq execution
        llm = ChatGroq(
            model="gemma2-9b-it",
            groq_api_key=effective_api_key,
            temperature=0.1
        )
        
        # Bind tools
        llm_with_tools = llm.bind_tools(tools_list)
        
        # Construct graph
        workflow = StateGraph(AgentState)
        
        def call_model(state: AgentState):
            messages = state["messages"]
            # Prepend system message if not present
            sys_message = SystemMessage(content=SYSTEM_PROMPT)
            all_msgs = [sys_message] + list(messages)
            response = llm_with_tools.invoke(all_msgs)
            return {"messages": [response]}
            
        def call_tool(state: AgentState):
            messages = state["messages"]
            last_message = messages[-1]
            tool_calls = last_message.tool_calls
            
            tool_messages = []
            draft_updates = {}
            
            for call in tool_calls:
                tool_name = call["name"]
                args = call["args"]
                tool_to_call = tools_map[tool_name]
                
                # Execute tool
                result = tool_to_call.invoke(args)
                
                # If update_draft_interaction was called, let's track the updates
                if tool_name == "update_draft_interaction":
                    try:
                        res_obj = json.loads(result)
                        draft_updates.update(res_obj.get("fields", {}))
                    except:
                        pass
                
                # If log_interaction was called, we also want to return success
                tool_messages.append(
                    ToolMessage(content=result, tool_call_id=call["id"], name=tool_name)
                )
                
            return {
                "messages": tool_messages,
                "draft_interaction": {**state.get("draft_interaction", {}), **draft_updates}
            }
            
        def should_continue(state: AgentState):
            messages = state["messages"]
            last_message = messages[-1]
            if getattr(last_message, "tool_calls", None):
                return "tools"
            return END
            
        workflow.add_node("agent", call_model)
        workflow.add_node("tools", call_tool)
        
        workflow.add_edge(START, "agent")
        workflow.add_conditional_edges("agent", should_continue, {
            "tools": "tools",
            END: END
        })
        workflow.add_edge("tools", "agent")
        
        app = workflow.compile()
        
        final_state = app.invoke(state)
        
        # Determine suggested follow ups
        # We can extract suggestions based on topics or let the LLM output suggestions.
        # Here we do a simple rules-based check for the demo, or we can use LLM.
        last_ai_content = final_state["messages"][-1].content.lower()
        suggested = []
        if "oncoboost" in last_ai_content:
            suggested.append("Schedule follow-up meeting in 2 weeks")
            suggested.append("Send OncoBoost Phase III PDF")
        elif "cardiolife" in last_ai_content:
            suggested.append("Schedule follow-up meeting in 1 week")
            suggested.append("Send CardioLife Brochure")
        else:
            suggested.append("Schedule follow-up meeting in 2 weeks")
            suggested.append("Add Dr. Sharma to advisory board invite list")
            
        final_state["suggested_followups"] = suggested
        
        # Convert messages to serializable format for JSON API
        serializable_msgs = []
        for msg in final_state["messages"]:
            if isinstance(msg, AIMessage):
                serializable_msgs.append({"role": "assistant", "content": msg.content})
            elif isinstance(msg, HumanMessage):
                serializable_msgs.append({"role": "user", "content": msg.content})
            elif isinstance(msg, SystemMessage):
                serializable_msgs.append({"role": "system", "content": msg.content})
            elif isinstance(msg, ToolMessage):
                serializable_msgs.append({"role": "tool", "name": msg.name, "content": msg.content})
                
        return {
            "messages": serializable_msgs,
            "draft_interaction": final_state.get("draft_interaction", {}),
            "suggested_followups": final_state.get("suggested_followups", [])
        }
        
    except Exception as e:
        # Fall back to mock on error
        print(f"Error calling Groq, falling back to mock: {str(e)}")
        mock_res = execute_mock_agent(state)
        # Convert mock messages to serializable format
        serializable_msgs = []
        for msg in mock_res["messages"]:
            if isinstance(msg, AIMessage):
                serializable_msgs.append({"role": "assistant", "content": msg.content})
            elif isinstance(msg, HumanMessage):
                serializable_msgs.append({"role": "user", "content": msg.content})
        mock_res["messages"] = serializable_msgs
        return mock_res
