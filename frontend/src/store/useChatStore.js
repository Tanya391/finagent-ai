import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  messages: [],   // { id, role: 'user'|'assistant', content, data, sources, provider, route, intent, confidence, timestamp, isLoading, error }
  queryHistory: [], // { id, question, timestamp, intent, route }

  addUserMessage: (question) => {
    const id = Date.now();
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: 'user', content: question, timestamp: new Date().toISOString() },
      ],
    }));
    return id;
  },

  addLoadingMessage: () => {
    const id = Date.now() + 1;
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: 'assistant', content: '', isLoading: true, timestamp: new Date().toISOString() },
      ],
    }));
    return id;
  },

  resolveMessage: (id, payload) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...payload, isLoading: false } : m
      ),
    }));
  },

  setMessageError: (id, error) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, error, isLoading: false } : m
      ),
    }));
  },

  retryMessage: (id) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, error: null, isLoading: true } : m
      ),
    }));
  },

  addToHistory: (entry) => {
    set((state) => ({
      queryHistory: [entry, ...state.queryHistory].slice(0, 50),
    }));
  },

  clearChat: () => set({ messages: [] }),
}));

export default useChatStore;
