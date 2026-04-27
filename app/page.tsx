"use client";

import { useChat } from "@ai-sdk/react";
import { isTextUIPart } from "ai";
import { useRef, useEffect, useState } from "react";

export default function Home() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const isLoading = status === "streaming" || status === "submitted";
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">TCO Chatbot</h1>
        <p className="text-sm text-gray-500">Powered by Gemini + RAG</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">Ask me anything about your documents.</p>
            <p className="text-sm mt-1">
              Ingest documents first via{" "}
              <code className="bg-gray-100 px-1 rounded">/api/ingest</code>
            </p>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts.filter(isTextUIPart).map((p) => p.text).join("");
          if (!text) return null;
          return (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm whitespace-pre-wrap shadow-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 border"
                }`}
              >
                {text}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl px-4 py-3 text-sm text-gray-400 shadow-sm">
              Thinking...
            </div>
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 text-sm">
            {error.message}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="bg-white border-t px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
