import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setApiKey, showToast } from "../store";
import { X, Key } from "lucide-react";

export default function SettingsModal({ onClose }) {
  const dispatch = useDispatch();
  const currentKey = useSelector((state) => state.crm.apiKey);
  const [keyInput, setKeyInput] = useState(currentKey);

  const handleSave = () => {
    dispatch(setApiKey(keyInput));
    dispatch(showToast({ message: "API Key updated successfully!", type: "success" }));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="panel-title" style={{ margin: 0 }}>
            <Key size={20} /> Settings
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="form-group-full" style={{ marginBottom: "1.5rem" }}>
          <label className="form-label" htmlFor="apiKeyInput">
            Groq API Key (gemma2-9b-it model)
          </label>
          <input
            id="apiKeyInput"
            type="password"
            className="form-input"
            placeholder="gsk_..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <p className="form-label" style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
            If left blank, the application will use the local Mock LLM parser.
          </p>
        </div>

        <button className="btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
}
