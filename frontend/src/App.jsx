import React, { useState, useEffect } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store, fetchHCPs, fetchMaterialsSamples, fetchInteractions, hideToast, setActiveTab } from "./store";
import LogInteractionForm from "./components/LogInteractionForm";
import AIAssistant from "./components/AIAssistant";
import InteractionHistory from "./components/InteractionHistory";
import SettingsModal from "./components/SettingsModal";
import { 
  Settings, 
  Sun, 
  Moon, 
  Brain, 
  Activity, 
  History, 
  PenTool, 
  CheckCircle,
  AlertTriangle 
} from "lucide-react";

function MainDashboard() {
  const dispatch = useDispatch();
  const activeTab = useSelector((state) => state.crm.activeTab);
  const toastMessage = useSelector((state) => state.crm.toastMessage);
  const toastType = useSelector((state) => state.crm.toastType);
  const apiKey = useSelector((state) => state.crm.apiKey);

  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchHCPs());
    dispatch(fetchMaterialsSamples());
    dispatch(fetchInteractions());
  }, [dispatch]);

  // Handle toast timeout
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        dispatch(hideToast());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, dispatch]);

  // Toggle Dark Mode
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  };

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="logo-text">Aivoa CRM</h1>
            <span style={{ fontSize: "0.7rem", color: "hsl(var(--muted-foreground))", display: "block", marginTop: "-3px" }}>
              AI-First HCP Module
            </span>
          </div>
        </div>

        <div className="header-actions">
          {/* API Key Status Indicator */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.35rem", 
              fontSize: "0.75rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "20px",
              backgroundColor: apiKey ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
              color: apiKey ? "hsl(var(--success))" : "hsl(var(--warning))",
              border: `1px solid ${apiKey ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`
            }}
          >
            <Brain size={12} />
            <span>{apiKey ? "Groq LLM Active" : "Mock LLM Fallback"}</span>
          </div>

          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="main-content">
        {/* Left Column - Form or History */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          
          {/* Tabs Switcher */}
          <div style={{ padding: "1.25rem 1.5rem 0 1.5rem", backgroundColor: "hsl(var(--background))" }}>
            <div className="tabs-header">
              <button 
                className={`tab-btn ${activeTab === "log" ? "active" : ""}`}
                onClick={() => dispatch(setActiveTab("log"))}
              >
                <PenTool size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                Log Interaction
              </button>
              <button 
                className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
                onClick={() => dispatch(setActiveTab("history"))}
              >
                <History size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                Interaction History
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "log" ? <LogInteractionForm /> : <InteractionHistory />}
          </div>
        </div>

        {/* Right Column - Chat Assistant */}
        <AIAssistant />
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-container toast-${toastType}`}>
          {toastType === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <MainDashboard />
    </Provider>
  );
}
