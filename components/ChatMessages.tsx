"use client";

import { UIMessage, isTextUIPart } from "ai";
import { useRef, useEffect } from "react";

export function ChatMessages({
  messages,
  isLoading,
}: {
  messages: UIMessage[];
  isLoading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <div className="text-4xl mb-4">💬</div>
            <h2 className="font-semibold mb-2">Start a conversation</h2>
            <p className="text-sm text-muted max-w-xs">
              Upload documents on the left, then ask questions about them
            </p>
          </div>
        </div>
      )}

      {messages.map((m) => {
        const text = m.parts
          .filter(isTextUIPart)
          .map((p) => p.text)
          .join("");
        if (!text) return null;

        return (
          <div
            key={m.id}
            className={`flex gap-3 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-accent text-white rounded-br-none"
                  : "bg-card border border-border text-foreground rounded-bl-none"
              }`}
            >
              {text}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="bg-card border border-border rounded-lg rounded-bl-none px-4 py-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-muted rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-muted rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-muted rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
