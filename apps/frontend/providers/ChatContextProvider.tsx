'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PageContext } from '@/types/chat';

interface ChatContextValue {
  context: PageContext | null;
  setContext: (context: PageContext | null) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<PageContext | null>(null);

  const setContext = useCallback((newContext: PageContext | null) => {
    setContextState(newContext);
  }, []);

  return (
    <ChatContext.Provider value={{ context, setContext }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within ChatContextProvider');
  }
  return context;
}
