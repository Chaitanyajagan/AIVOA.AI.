import { configureStore, createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE_URL = "http://127.0.0.1:8000/api";

// ---------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------

export const fetchHCPs = createAsyncThunk("crm/fetchHCPs", async () => {
  const response = await fetch(`${API_BASE_URL}/hcps`);
  if (!response.ok) throw new Error("Failed to fetch HCPs");
  return await response.json();
});

export const fetchMaterialsSamples = createAsyncThunk("crm/fetchMaterialsSamples", async () => {
  const response = await fetch(`${API_BASE_URL}/materials-samples`);
  if (!response.ok) throw new Error("Failed to fetch materials/samples");
  return await response.json();
});

export const fetchInteractions = createAsyncThunk("crm/fetchInteractions", async () => {
  const response = await fetch(`${API_BASE_URL}/interactions`);
  if (!response.ok) throw new Error("Failed to fetch interactions");
  return await response.json();
});

export const logInteractionDirectly = createAsyncThunk(
  "crm/logInteractionDirectly",
  async (interactionData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interactionData),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.detail || "Error logging interaction");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateInteractionDirectly = createAsyncThunk(
  "crm/updateInteractionDirectly",
  async ({ id, fields }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/interactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.detail || "Error updating interaction");
      return { id, ...fields };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  "crm/sendChatMessage",
  async (_, { getState, rejectWithValue }) => {
    const state = getState().crm;
    const { chatMessages, currentDraft, apiKey } = state;
    
    try {
      const payload = {
        messages: chatMessages,
        draft_interaction: currentDraft,
        api_key: apiKey || null,
      };
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (!response.ok) return rejectWithValue("Failed to communicate with agent.");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const summarizeVoiceTranscript = createAsyncThunk(
  "crm/summarizeVoiceTranscript",
  async (transcript, { getState, rejectWithValue }) => {
    const state = getState().crm;
    const { apiKey } = state;
    try {
      const response = await fetch(`${API_BASE_URL}/voice-summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, api_key: apiKey || null }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue("Failed to summarize transcript");
      return data.extracted_fields;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ---------------------------------------------------------
// CRM Slice
// ---------------------------------------------------------

const initialDraft = {
  hcp_id: "",
  interaction_type: "Meeting",
  date: new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().split(" ")[0].substring(0, 5),
  attendees: "",
  topics_discussed: "",
  sentiment: "Neutral",
  outcomes: "",
  follow_up_actions: "",
  materials_shared_ids: [],
  samples_distributed_ids: [],
};

const crmSlice = createSlice({
  name: "crm",
  initialState: {
    hcps: [],
    materials: [],
    samples: [],
    interactions: [],
    currentDraft: { ...initialDraft },
    chatMessages: [
      {
        role: "assistant",
        content: "Hi! I am your AI-First CRM assistant. Describe your interaction here or ask me to search HCPs / view history.",
      },
    ],
    suggestedFollowups: [
      "Schedule follow-up meeting in 2 weeks",
      "Send OncoBoost Phase III PDF",
      "Add Dr. Sharma to advisory board invite list"
    ],
    apiKey: localStorage.getItem("crm_groq_api_key") || "",
    isChatLoading: false,
    isLoggingLoading: false,
    activeTab: "log", // 'log' or 'history'
    chatInput: "",
    toastMessage: null,
    toastType: "success", // 'success' | 'error'
  },
  reducers: {
    setApiKey: (state, action) => {
      state.apiKey = action.payload;
      localStorage.setItem("crm_groq_api_key", action.payload);
    },
    updateDraftField: (state, action) => {
      const { field, value } = action.payload;
      state.currentDraft[field] = value;
    },
    resetDraft: (state) => {
      state.currentDraft = {
        ...initialDraft,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().split(" ")[0].substring(0, 5),
      };
    },
    setChatInput: (state, action) => {
      state.chatInput = action.payload;
    },
    appendUserMessage: (state, action) => {
      state.chatMessages.push({ role: "user", content: action.payload });
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    showToast: (state, action) => {
      state.toastMessage = action.payload.message;
      state.toastType = action.payload.type || "success";
    },
    hideToast: (state) => {
      state.toastMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch HCPs
      .addCase(fetchHCPs.fulfilled, (state, action) => {
        state.hcps = action.payload;
      })
      // Fetch Materials & Samples
      .addCase(fetchMaterialsSamples.fulfilled, (state, action) => {
        state.materials = action.payload.materials;
        state.samples = action.payload.samples;
      })
      // Fetch Interactions
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.interactions = action.payload;
      })
      // Log Interaction Direct
      .addCase(logInteractionDirectly.pending, (state) => {
        state.isLoggingLoading = true;
      })
      .addCase(logInteractionDirectly.fulfilled, (state, action) => {
        state.isLoggingLoading = false;
        state.toastMessage = "Interaction logged successfully!";
        state.toastType = "success";
        state.currentDraft = {
          ...initialDraft,
          date: new Date().toISOString().split("T")[0],
          time: new Date().toTimeString().split(" ")[0].substring(0, 5),
        };
      })
      .addCase(logInteractionDirectly.rejected, (state, action) => {
        state.isLoggingLoading = false;
        state.toastMessage = action.payload || "Failed to log interaction";
        state.toastType = "error";
      })
      // Send Chat Message
      .addCase(sendChatMessage.pending, (state) => {
        state.isChatLoading = true;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.isChatLoading = false;
        const { messages, draft_interaction, suggested_followups } = action.payload;
        if (messages && messages.length > 0) {
          // Replace message history or append new assistant messages
          // To keep it simple, we sync with the server returned message list
          state.chatMessages = messages;
        }
        if (draft_interaction) {
          // Sync draft fields with extracted values
          state.currentDraft = { ...state.currentDraft, ...draft_interaction };
        }
        if (suggested_followups) {
          state.suggestedFollowups = suggested_followups;
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.isChatLoading = false;
        state.chatMessages.push({
          role: "assistant",
          content: "Sorry, I encountered an error communicating with the agent server. Please make sure the backend is running.",
        });
      })
      // Voice transcript summarization
      .addCase(summarizeVoiceTranscript.fulfilled, (state, action) => {
        state.currentDraft = { ...state.currentDraft, ...action.payload };
        state.toastMessage = "Extracted fields from Voice Note!";
        state.toastType = "success";
      })
      .addCase(summarizeVoiceTranscript.rejected, (state, action) => {
        state.toastMessage = action.payload || "Voice note summarization failed";
        state.toastType = "error";
      });
  },
});

export const {
  setApiKey,
  updateDraftField,
  resetDraft,
  setChatInput,
  appendUserMessage,
  setActiveTab,
  showToast,
  hideToast,
} = crmSlice.actions;

export const store = configureStore({
  reducer: {
    crm: crmSlice.reducer,
  },
});
