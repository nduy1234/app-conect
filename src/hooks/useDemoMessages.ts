import { useEffect, useState } from 'react';

export interface DemoMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export function useDemoMessages(partnerId: string, seed: DemoMessage[]) {
  const key = `demo_messages_${partnerId}`;

  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as DemoMessage[]) : seed;
    } catch (e) {
      return seed;
    }
  });

  // When the partnerId changes, reload messages for that conversation
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setDemoMessages(raw ? (JSON.parse(raw) as DemoMessage[]) : seed);
    } catch (e) {
      setDemoMessages(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(demoMessages));
    } catch (e) {
      // ignore write errors
    }
  }, [key, demoMessages]);

  const addDemoMessage = (msg: DemoMessage) => {
    setDemoMessages((prev) => [...prev, msg]);
  };

  const clearDemoMessages = () => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  };

  return { demoMessages, setDemoMessages, addDemoMessage, clearDemoMessages };
}
