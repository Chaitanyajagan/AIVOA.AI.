import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
  updateDraftField, 
  resetDraft, 
  logInteractionDirectly, 
  fetchInteractions, 
  summarizeVoiceTranscript,
  showToast
} from "../store";
import { 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  Mic, 
  MicOff, 
  Plus, 
  Minus, 
  Smile, 
  Meh, 
  Frown, 
  CheckCircle,
  FilePlus,
  Sparkles,
  ClipboardList
} from "lucide-react";

export default function LogInteractionForm() {
  const dispatch = useDispatch();
  const draft = useSelector((state) => state.crm.currentDraft);
  const hcps = useSelector((state) => state.crm.hcps);
  const materials = useSelector((state) => state.crm.materials);
  const samples = useSelector((state) => state.crm.samples);
  const suggestedFollowups = useSelector((state) => state.crm.suggestedFollowups);
  const isLoggingLoading = useSelector((state) => state.crm.isLoggingLoading);

  // Search filter states
  const [hcpSearch, setHcpSearch] = useState("");
  const [showHcpDropdown, setShowHcpDropdown] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [sampleSearch, setSampleSearch] = useState("");
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);

  // Voice note states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceTextPreset, setVoiceTextPreset] = useState("");

  const selectedHCP = hcps.find(h => h.id === parseInt(draft.hcp_id));

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";
      
      rec.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        dispatch(updateDraftField({ 
          field: "topics_discussed", 
          value: draft.topics_discussed ? draft.topics_discussed + " " + transcript : transcript 
        }));
        dispatch(showToast({ message: "Transcribed: " + transcript, type: "success" }));
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, [draft.topics_discussed]);

  const handleToggleVoice = () => {
    if (!recognition) {
      // Fallback: Open voice note simulation modal
      setShowVoiceModal(true);
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      // Request consent or simulate consent since the UI shows "(Requires Consent)"
      const consent = window.confirm("Do you give consent to record audio and transcribe this interaction?");
      if (consent) {
        try {
          recognition.start();
          setIsRecording(true);
        } catch (e) {
          console.error(e);
          setShowVoiceModal(true); // Fallback to simulation
        }
      }
    }
  };

  const handleApplyVoicePreset = (text) => {
    dispatch(summarizeVoiceTranscript(text));
    setShowVoiceModal(false);
  };

  const handleAddMaterial = (id) => {
    if (!draft.materials_shared_ids.includes(id)) {
      dispatch(updateDraftField({
        field: "materials_shared_ids",
        value: [...draft.materials_shared_ids, id]
      }));
    }
    setMaterialSearch("");
    setShowMaterialDropdown(false);
  };

  const handleRemoveMaterial = (id) => {
    dispatch(updateDraftField({
      field: "materials_shared_ids",
      value: draft.materials_shared_ids.filter(mid => mid !== id)
    }));
  };

  const handleAddSample = (id) => {
    if (!draft.samples_distributed_ids.includes(id)) {
      dispatch(updateDraftField({
        field: "samples_distributed_ids",
        value: [...draft.samples_distributed_ids, id]
      }));
    }
    setSampleSearch("");
    setShowSampleDropdown(false);
  };

  const handleRemoveSample = (id) => {
    dispatch(updateDraftField({
      field: "samples_distributed_ids",
      value: draft.samples_distributed_ids.filter(sid => sid !== id)
    }));
  };

  const handleSelectSuggestedFollowUp = (suggestion) => {
    // Append to follow up action text area
    const currentActions = draft.follow_up_actions;
    const newActions = currentActions 
      ? currentActions + "\n- " + suggestion 
      : "- " + suggestion;
    dispatch(updateDraftField({ field: "follow_up_actions", value: newActions }));
    dispatch(showToast({ message: `Added follow-up: "${suggestion}"`, type: "success" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.hcp_id) {
      dispatch(showToast({ message: "Please select a Healthcare Professional (HCP)", type: "error" }));
      return;
    }
    
    dispatch(logInteractionDirectly(draft)).then((res) => {
      if (res.meta.requestStatus === "fulfilled") {
        dispatch(fetchInteractions());
        setHcpSearch("");
      }
    });
  };

  return (
    <div className="form-panel">
      <form onSubmit={handleSubmit}>
        {/* Interaction Details */}
        <div className="panel-card">
          <h3 className="panel-title">
            <ClipboardList size={18} /> Interaction Details
          </h3>
          
          <div className="form-grid">
            {/* HCP Name (Search / Select) */}
            <div className="form-group-full search-select-container">
              <label className="form-label">HCP Name *</label>
              <div className="textarea-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder={selectedHCP ? selectedHCP.name : "Search or select HCP..."}
                  value={hcpSearch}
                  onChange={(e) => {
                    setHcpSearch(e.target.value);
                    setShowHcpDropdown(true);
                  }}
                  onFocus={() => setShowHcpDropdown(true)}
                />
                <Search size={16} style={{ position: "absolute", right: "12px", top: "12px", color: "var(--muted-foreground)" }} />
              </div>
              
              {showHcpDropdown && (
                <div className="dropdown-results">
                  {hcps
                    .filter(h => h.name.toLowerCase().includes(hcpSearch.toLowerCase()) || h.specialty.toLowerCase().includes(hcpSearch.toLowerCase()))
                    .map(h => (
                      <div 
                        key={h.id} 
                        className="dropdown-item" 
                        onClick={() => {
                          dispatch(updateDraftField({ field: "hcp_id", value: h.id }));
                          setHcpSearch(h.name);
                          setShowHcpDropdown(false);
                        }}
                      >
                        <span>{h.name} ({h.specialty})</span>
                        <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>{h.hospital}</span>
                      </div>
                    ))
                  }
                  {hcps.filter(h => h.name.toLowerCase().includes(hcpSearch.toLowerCase())).length === 0 && (
                    <div className="dropdown-item" style={{ color: "hsl(var(--muted-foreground))" }}>No HCPs found</div>
                  )}
                </div>
              )}
              {selectedHCP && (
                <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: "hsl(var(--primary))" }}>
                  Selected: <strong>{selectedHCP.name}</strong> ({selectedHCP.specialty}) at {selectedHCP.hospital}
                </div>
              )}
            </div>

            {/* Interaction Type */}
            <div>
              <label className="form-label">Interaction Type</label>
              <select 
                className="form-select"
                value={draft.interaction_type}
                onChange={(e) => dispatch(updateDraftField({ field: "interaction_type", value: e.target.value }))}
              >
                <option value="Meeting">Meeting</option>
                <option value="Call">Call</option>
                <option value="Email">Email</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="form-label">Date</label>
              <div className="textarea-wrapper">
                <input 
                  type="date" 
                  className="form-input" 
                  value={draft.date}
                  onChange={(e) => dispatch(updateDraftField({ field: "date", value: e.target.value }))}
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="form-label">Time</label>
              <input 
                type="time" 
                className="form-input" 
                value={draft.time}
                onChange={(e) => dispatch(updateDraftField({ field: "time", value: e.target.value }))}
              />
            </div>

            {/* Attendees */}
            <div>
              <label className="form-label">Attendees</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Nurse Jane, Dr. Patel" 
                value={draft.attendees}
                onChange={(e) => dispatch(updateDraftField({ field: "attendees", value: e.target.value }))}
              />
            </div>

            {/* Topics Discussed */}
            <div className="form-group-full">
              <label className="form-label">Topics Discussed</label>
              <div className="textarea-wrapper">
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Enter key discussion points or use voice note..."
                  value={draft.topics_discussed}
                  onChange={(e) => dispatch(updateDraftField({ field: "topics_discussed", value: e.target.value }))}
                />
                <button
                  type="button"
                  className={`voice-note-btn ${isRecording ? "voice-recording" : ""}`}
                  onClick={handleToggleVoice}
                  title="Summarize from Voice Note (Requires Consent)"
                >
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
                * Click mic to dictate directly (requires Chrome/Edge) or open Simulation Presets if dictation is not set up.
              </span>
            </div>
          </div>
        </div>

        {/* Materials & Samples */}
        <div className="panel-card">
          <h3 className="panel-title">
            <FilePlus size={18} /> Materials Shared / Samples Distributed
          </h3>

          {/* Materials Shared */}
          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label">Materials Shared</label>
            <div className="item-tag-list">
              {draft.materials_shared_ids.map(mid => {
                const mat = materials.find(m => m.id === mid);
                return mat ? (
                  <span key={mid} className="item-tag">
                    {mat.name}
                    <button type="button" className="item-tag-remove" onClick={() => handleRemoveMaterial(mid)}>&times;</button>
                  </span>
                ) : null;
              })}
            </div>
            
            <div className="textarea-wrapper">
              <input
                type="text"
                className="form-input"
                placeholder="Search materials to add..."
                value={materialSearch}
                onChange={(e) => {
                  setMaterialSearch(e.target.value);
                  setShowMaterialDropdown(true);
                }}
                onFocus={() => setShowMaterialDropdown(true)}
              />
              <Search size={14} style={{ position: "absolute", right: "12px", top: "12px", color: "var(--muted-foreground)" }} />
            </div>

            {showMaterialDropdown && (
              <div className="dropdown-results">
                {materials
                  .filter(m => m.name.toLowerCase().includes(materialSearch.toLowerCase()))
                  .map(m => (
                    <div key={m.id} className="dropdown-item" onClick={() => handleAddMaterial(m.id)}>
                      <span>{m.name}</span>
                      <span className="tag-badge">{m.type}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Samples Distributed */}
          <div>
            <label className="form-label">Samples Distributed</label>
            <div className="item-tag-list">
              {draft.samples_distributed_ids.map(sid => {
                const sam = samples.find(s => s.id === sid);
                return sam ? (
                  <span key={sid} className="item-tag">
                    {sam.name}
                    <button type="button" className="item-tag-remove" onClick={() => handleRemoveSample(sid)}>&times;</button>
                  </span>
                ) : null;
              })}
            </div>
            
            <div className="textarea-wrapper">
              <input
                type="text"
                className="form-input"
                placeholder="Search samples to add..."
                value={sampleSearch}
                onChange={(e) => {
                  setSampleSearch(e.target.value);
                  setShowSampleDropdown(true);
                }}
                onFocus={() => setShowSampleDropdown(true)}
              />
              <Search size={14} style={{ position: "absolute", right: "12px", top: "12px", color: "var(--muted-foreground)" }} />
            </div>

            {showSampleDropdown && (
              <div className="dropdown-results">
                {samples
                  .filter(s => s.name.toLowerCase().includes(sampleSearch.toLowerCase()))
                  .map(s => (
                    <div key={s.id} className="dropdown-item" onClick={() => handleAddSample(s.id)}>
                      <span>{s.name}</span>
                      <span style={{ fontSize: "0.75rem" }}>Stock: {s.stock_count}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* Sentiment, Outcomes & Follow-up */}
        <div className="panel-card">
          <h3 className="panel-title">
            <Smile size={18} /> Sentiment & Outcomes
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label">Observed/Inferred HCP Sentiment</label>
            <div className="sentiment-group">
              {[
                { label: "Positive", icon: <Smile size={16} /> },
                { label: "Neutral", icon: <Meh size={16} /> },
                { label: "Negative", icon: <Frown size={16} /> }
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  className={`sentiment-btn ${draft.sentiment === opt.label ? `active-${opt.label}` : ""}`}
                  onClick={() => dispatch(updateDraftField({ field: "sentiment", value: opt.label }))}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group-full">
              <label className="form-label">Outcomes</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Key outcomes or agreements..."
                value={draft.outcomes}
                onChange={(e) => dispatch(updateDraftField({ field: "outcomes", value: e.target.value }))}
              />
            </div>

            <div className="form-group-full">
              <label className="form-label">Follow-up Actions</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Enter next steps or tasks..."
                value={draft.follow_up_actions}
                onChange={(e) => dispatch(updateDraftField({ field: "follow_up_actions", value: e.target.value }))}
              />
            </div>
          </div>

          {/* AI Suggested Follow ups */}
          {suggestedFollowups.length > 0 && (
            <div className="ai-suggestions">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "hsl(var(--primary))" }}>
                <Sparkles size={14} /> AI Suggested Follow-ups:
              </label>
              {suggestedFollowups.map((s, idx) => (
                <div 
                  key={idx} 
                  className="suggestion-link"
                  onClick={() => handleSelectSuggestedFollowUp(s)}
                >
                  <Plus size={14} /> {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isLoggingLoading}
          style={{ marginBottom: "2rem" }}
        >
          <CheckCircle size={18} /> {isLoggingLoading ? "Logging..." : "Log Interaction"}
        </button>
      </form>

      {/* Voice Note Simulation Modal */}
      {showVoiceModal && (
        <div className="modal-overlay" onClick={() => setShowVoiceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "500px" }}>
            <div className="modal-header">
              <h3 className="panel-title" style={{ margin: 0 }}>
                <Mic size={20} /> Voice Note Simulation
              </h3>
              <button className="modal-close" onClick={() => setShowVoiceModal(false)}>&times;</button>
            </div>
            
            <p className="form-label" style={{ marginBottom: "1rem" }}>
              Since dictation is not active, choose a pre-recorded audio transcript preset (Consent is assumed by selection):
            </p>

            <div 
              className="suggestion-link" 
              style={{ border: "1px solid hsl(var(--border))", padding: "0.75rem", borderRadius: "8px" }}
              onClick={() => handleApplyVoicePreset("I met Dr. Sarah Smith at City General Hospital. We discussed CardioLife Patient Care Brochure and I left some CardioLife 5mg Capsules. She was extremely positive and requested we follow up in a week.")}
            >
              <strong>Preset 1 (CardioLife Call)</strong>
              <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-foreground))", marginTop: "4px" }}>
                "I met Dr. Sarah Smith... discussed CardioLife... positive sentiment..."
              </p>
            </div>

            <div 
              className="suggestion-link" 
              style={{ border: "1px solid hsl(var(--border))", padding: "0.75rem", borderRadius: "8px", marginTop: "0.5rem" }}
              onClick={() => handleApplyVoicePreset("Had an onsite meeting with Dr. Anil Sharma. Discussed the OncoBoost Phase III Clinical Trial PDF. He had some concerns and was rather neutral. Distributed OncoBoost 10mg samples.")}
            >
              <strong>Preset 2 (OncoBoost Meeting)</strong>
              <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-foreground))", marginTop: "4px" }}>
                "Had an onsite meeting with Dr. Anil Sharma... OncoBoost... neutral sentiment..."
              </p>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <label className="form-label">Or paste a custom transcript:</label>
              <textarea 
                className="form-textarea" 
                rows="3" 
                placeholder="Paste audio transcription text here..."
                value={voiceTextPreset}
                onChange={(e) => setVoiceTextPreset(e.target.value)}
              />
              <button 
                className="btn-primary" 
                style={{ marginTop: "1rem" }}
                onClick={() => handleApplyVoicePreset(voiceTextPreset)}
                disabled={!voiceTextPreset}
              >
                Process Transcript
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
