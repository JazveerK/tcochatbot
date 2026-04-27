"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { ChatContainer } from "@/components/ChatContainer";

export default function Home() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const isLoading = status === "streaming" || status === "submitted";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
  }

  return (
    <ChatContainer
      messages={messages}
      input={input}
      setInput={setInput}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}
