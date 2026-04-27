import { sql } from "./db";
import { embedText } from "./embeddings";

export interface DocumentChunk {
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function retrieveContext(
  query: string,
  limit = 5
): Promise<DocumentChunk[]> {
  const embedding = await embedText(query);
  const embeddingStr = `[${embedding.join(",")}]`;

  // Cast via ::text::vector so the parameterized string value is accepted by pgvector
  const result = await sql`
    SELECT content, metadata, 1 - (embedding <=> ${embeddingStr}::text::vector) AS similarity
    FROM documents
    ORDER BY embedding <=> ${embeddingStr}::text::vector
    LIMIT ${limit}
  `;

  return result.rows as DocumentChunk[];
}

export function buildContextPrompt(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return "";
  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join("\n\n");
  return `Use the following context to answer the user's question. If the context doesn't contain relevant information, say so.\n\nContext:\n${context}`;
}
