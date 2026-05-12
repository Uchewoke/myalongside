import { create } from "zustand";
import { MockMessage } from "@/lib/mock-data";

interface ChatState {
  messages: Record<string, MockMessage[]>;
  activeConversationId: string | null;
  setActiveConversation: (id: string) => void;
  addMessage: (conversationId: string, message: MockMessage) => void;
  markRead: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),
  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...(state.messages[conversationId] ?? []),
          message,
        ],
      },
    })),
  markRead: (conversationId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) => ({
          ...m,
          read: true,
        })),
      },
    })),
}));
