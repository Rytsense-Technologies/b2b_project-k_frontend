import { createSlice } from '@reduxjs/toolkit';

const interviewSlice = createSlice({
  name: 'interview',
  initialState: {
    config: null,
    sessionId: null,
    /** LiveKit room credentials from POST /livekit-interview/start */
    livekitSession: null,
    liveInsights: [],
    transcript: [],
  },
  reducers: {
    setConfig(s, a)     { s.config = a.payload; },
    setSessionId(s, a)  { s.sessionId = a.payload; },
    setLivekitSession(s, a) {
      s.livekitSession = a.payload;
      s.sessionId = a.payload?.sessionId ?? s.sessionId;
    },
    addInsight(s, a)    { s.liveInsights.push(a.payload); },
    addMessage(s, a)    { s.transcript.push(a.payload); },
    resetLiveData(s) {
      s.liveInsights = [];
      s.transcript = [];
    },
    resetSession(s)     {
      s.sessionId = null;
      s.livekitSession = null;
      s.liveInsights = [];
      s.transcript = [];
    },
  },
});

export const {
  setConfig,
  setSessionId,
  setLivekitSession,
  addInsight,
  addMessage,
  resetLiveData,
  resetSession,
} = interviewSlice.actions;
export default interviewSlice.reducer;

export const selectConfig        = (s) => s.interview.config;
export const selectSessionId     = (s) => s.interview.sessionId;
export const selectLivekitSession = (s) => s.interview.livekitSession;
export const selectLiveInsights  = (s) => s.interview.liveInsights;
export const selectTranscript    = (s) => s.interview.transcript;
