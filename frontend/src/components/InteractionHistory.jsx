import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateInteractionDirectly, fetchInteractions, showToast } from "../store";
import { Edit2, Save, X, Trash2, Calendar, Clock, Smile, Meh, Frown, Users, FileText } from "lucide-react";

export default function InteractionHistory() {
  const dispatch = useDispatch();
  const interactions = useSelector((state) => state.crm.interactions);
  const materials = useSelector((state) => state.crm.materials);
  const samples = useSelector((state) => state.crm.samples);

  // Track which interaction is being edited
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditForm({
      interaction_type: item.interaction_type,
      date: item.date,
      time: item.time,
      attendees: item.attendees,
      topics_discussed: item.topics_discussed,
      sentiment: item.sentiment,
      outcomes: item.outcomes,
      follow_up_actions: item.follow_up_actions,
    });
  };

  const handleSaveClick = (id) => {
    dispatch(updateInteractionDirectly({ id, fields: editForm })).then((res) => {
      if (res.meta.requestStatus === "fulfilled") {
        setEditingId(null);
        dispatch(fetchInteractions());
        dispatch(showToast({ message: "Interaction updated successfully!", type: "success" }));
      }
    });
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case "Positive": return <Smile size={14} />;
      case "Negative": return <Frown size={14} />;
      default: return <Meh size={14} />;
    }
  };

  return (
    <div className="form-panel">
      <div className="panel-card">
        <h3 className="panel-title">
          <Calendar size={18} /> Logged Interactions History
        </h3>
        
        {interactions.length === 0 ? (
          <p style={{ color: "hsl(var(--muted-foreground))", textAlign: "center", padding: "2rem" }}>
            No interactions logged yet. Use the Log form or the AI Assistant to log your first interaction.
          </p>
        ) : (
          <div className="history-list">
            {interactions.map((item) => {
              const isEditing = editingId === item.id;
              
              return (
                <div key={item.id} className="history-item">
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div className="form-grid">
                        <div>
                          <label className="form-label">Type</label>
                          <select
                            className="form-select"
                            value={editForm.interaction_type}
                            onChange={(e) => setEditForm({ ...editForm, interaction_type: e.target.value })}
                          >
                            <option value="Meeting">Meeting</option>
                            <option value="Call">Call</option>
                            <option value="Email">Email</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label">Time</label>
                          <input
                            type="time"
                            className="form-input"
                            value={editForm.time}
                            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label">Attendees</label>
                          <input
                            type="text"
                            className="form-input"
                            value={editForm.attendees}
                            onChange={(e) => setEditForm({ ...editForm, attendees: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Topics Discussed</label>
                        <textarea
                          className="form-textarea"
                          rows="2"
                          value={editForm.topics_discussed}
                          onChange={(e) => setEditForm({ ...editForm, topics_discussed: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="form-label">Sentiment</label>
                        <div className="sentiment-group">
                          {["Positive", "Neutral", "Negative"].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              className={`sentiment-btn ${editForm.sentiment === opt ? `active-${opt}` : ""}`}
                              onClick={() => setEditForm({ ...editForm, sentiment: opt })}
                            >
                              {getSentimentIcon(opt)} {opt}
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
                            value={editForm.outcomes}
                            onChange={(e) => setEditForm({ ...editForm, outcomes: e.target.value })}
                          />
                        </div>
                        <div className="form-group-full">
                          <label className="form-label">Follow-up Actions</label>
                          <textarea
                            className="form-textarea"
                            rows="2"
                            value={editForm.follow_up_actions}
                            onChange={(e) => setEditForm({ ...editForm, follow_up_actions: e.target.value })}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button 
                          className="btn-primary" 
                          style={{ flex: 1, padding: "0.5rem" }} 
                          onClick={() => handleSaveClick(item.id)}
                        >
                          <Save size={16} /> Save
                        </button>
                        <button 
                          className="sentiment-btn" 
                          style={{ flex: 1, padding: "0.5rem" }} 
                          onClick={() => setEditingId(null)}
                        >
                          <X size={16} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <>
                      <div className="history-item-header">
                        <div>
                          <div className="history-hcp-name">{item.hcp_name}</div>
                          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                            <span className="history-date" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Calendar size={12} /> {item.date}
                            </span>
                            <span className="history-date" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Clock size={12} /> {item.time}
                            </span>
                            <span className="tag-badge" style={{ fontSize: "0.7rem", verticalAlign: "middle" }}>
                              {item.interaction_type}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span className={`history-sentiment sentiment-${item.sentiment}`}>
                            {getSentimentIcon(item.sentiment)} {item.sentiment}
                          </span>
                          <button 
                            className="settings-btn" 
                            style={{ padding: "0.35rem" }}
                            onClick={() => handleEditClick(item)}
                            title="Edit interaction"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>

                      {item.attendees && (
                        <div style={{ fontSize: "0.8rem", color: "hsl(var(--muted-foreground))" }}>
                          <Users size={12} style={{ display: "inline", marginRight: "4px" }} /> 
                          Attendees: {item.attendees}
                        </div>
                      )}

                      <div style={{ fontSize: "0.85rem", borderLeft: "2px solid hsl(var(--border))", paddingLeft: "8px", margin: "0.25rem 0" }}>
                        <strong>Discussion:</strong> {item.topics_discussed || "None"}
                      </div>

                      {/* Display Shared materials/samples */}
                      {(item.materials.length > 0 || item.samples.length > 0) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.25rem" }}>
                          {item.materials.map(m => (
                            <span key={m.id} className="item-tag" style={{ fontSize: "0.7rem", padding: "0.1rem 0.35rem" }}>
                              Material: {m.name}
                            </span>
                          ))}
                          {item.samples.map(s => (
                            <span key={s.id} className="item-tag" style={{ fontSize: "0.7rem", padding: "0.1rem 0.35rem" }}>
                              Sample: {s.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.outcomes && (
                        <div style={{ fontSize: "0.8rem" }}>
                          <strong>Outcomes:</strong> {item.outcomes}
                        </div>
                      )}

                      {item.follow_up_actions && (
                        <div style={{ fontSize: "0.8rem", color: "hsl(var(--primary))", marginTop: "0.25rem" }}>
                          <strong>Follow-ups:</strong> {item.follow_up_actions}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
