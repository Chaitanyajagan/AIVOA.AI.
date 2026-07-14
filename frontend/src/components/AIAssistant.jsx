import React, { useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
  setChatInput, 
  appendUserMessage, 
  sendChatMessage, 
  fetchInteractions, 
  showToast 
} from "../store";
import { Send, Sparkles, MessageSquare } from "lucide-react";

export default function AIAssistant() {
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.crm.chatMessages);
  const chatInput = useSelector((state) => state.crm.chatInput);
  const isChatLoading = useSelector((state) => state.crm.isChatLoading);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatLoading]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const input = chatInput;
    dispatch(appendUserMessage(input));
    dispatch(setChatInput(""));

    dispatch(sendChatMessage()).then((res) => {
      // If we committed/logged an interaction through the chat, let's refresh the list!
      if (input.toLowerCase().includes("log") || input.toLowerCase().includes("save")) {
        dispatch(fetchInteractions());
      }
    });
  };

  const handleQuickCommand = (command) => {
    dispatch(setChatInput(command));
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3 className="panel-title" style={{ margin: 0 }}>
          <Sparkles size={18} style={{ color: "hsl(var(--primary))" }} /> AI Assistant
        </h3>
        <div className="chat-status">
          <div className="status-dot"></div>
          <span>Active Agent</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`message-bubble message-${msg.role}`}
          >
            {msg.content}
          </div>
        ))}
        
        {isChatLoading && (
          <div className="chat-loading message-bubble message-assistant">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      <div style={{ padding: "0.5rem 1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", borderTop: "1px solid hsl(var(--border))" }}>
        {[
          "Search Dr. Sharma",
          "Show interaction history with HCP 1",
          "Log this interaction"
        ].map((cmd, i) => (
          <button
            key={i}
            className="sentiment-btn"
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", flex: "none" }}
            onClick={() => handleQuickCommand(cmd)}
          >
            {cmd}
          </button>
        ))}
      </div>

      <form className="chat-footer" onSubmit={handleSend}>
        <div className="chat-input-wrapper">
          <input
            type="text"
            placeholder="Ask me to search, retrieve history, log..."
            value={chatInput}
            onChange={(e) => dispatch(setChatInput(e.target.value))}
            disabled={isChatLoading}
          />
          <button 
            type="submit" 
            className="send-chat-btn"
            disabled={isChatLoading || !chatInput.trim()}
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
