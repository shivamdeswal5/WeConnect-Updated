
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  email?: string;
  isOnline?: boolean;
}

interface ChatState {
  currentChatId: string | null;
  selectedUser: User | null;
  messages: any[];
}

const initialState: ChatState = {
  currentChatId: null,
  selectedUser: null,
  messages: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChatId(state, action: PayloadAction<string>) {
      state.currentChatId = action.payload;
    },
    setSelectedUser(state, action: PayloadAction<User>) {
      state.selectedUser = action.payload;
    },
    setMessages(state, action: PayloadAction<any[]>) {
      state.messages = action.payload;
    },
    addMessage(state, action: PayloadAction<any>) {
      state.messages.push(action.payload);
    },
  },
});

export const {
  setCurrentChatId,
  setSelectedUser,
  setMessages,
  addMessage,
} = chatSlice.actions;

export default chatSlice.reducer;
