import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { embedText } from "@/lib/embeddings";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.length > 0);
}

const bodySchema = z.object({
  text: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { text, metadata } = parsed.data;
  const chunks = chunkText(text);

  const inserted: number[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);
    const embeddingStr = `[${embedding.join(",")}]`;
    const chunkMeta = { ...metadata, chunkIndex: i, totalChunks: chunks.length };

    const result = await sql`
      INSERT INTO documents (content, embedding, metadata)
      VALUES (${chunk}, ${embeddingStr}::vector, ${JSON.stringify(chunkMeta)}::jsonb)
      RETURNING id
    `;
    inserted.push(result.rows[0].id);
  }

  return NextResponse.json({ inserted: inserted.length, ids: inserted });
}
