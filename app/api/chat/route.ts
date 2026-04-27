import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, UIMessage, isTextUIPart } from "ai";
import { NextRequest } from "next/server";
import { retrieveContext, buildContextPrompt } from "@/lib/rag";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  const queryText = lastUserMessage
    ? lastUserMessage.parts.filter(isTextUIPart).map((p) => p.text).join(" ")
    : "";

  const chunks = queryText ? await retrieveContext(queryText, 5) : [];
  const contextPrompt = buildContextPrompt(chunks);

  const systemPrompt = contextPrompt
    ? contextPrompt
    : "You are a helpful assistant. Answer questions as best you can.";

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
