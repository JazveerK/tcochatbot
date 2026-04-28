import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Busboy from "busboy";
import { sql } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import { parseUploadedFile } from "@/lib/ingest";

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

const jsonBodySchema = z.object({
  text: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

async function embedAndStore(
  text: string,
  metadata: Record<string, unknown>
): Promise<number[]> {
  const chunks = chunkText(text);
  const inserted: number[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);
    const embeddingStr = `[${embedding.join(",")}]`;
    const chunkMeta = {
      ...metadata,
      chunkIndex: i,
      totalChunks: chunks.length,
    };

    const result = await sql`
      INSERT INTO documents (content, embedding, metadata)
      VALUES (${chunk}, ${embeddingStr}::text::vector, ${JSON.stringify(chunkMeta)}::jsonb)
      RETURNING id
    `;
    inserted.push(result.rows[0].id);
  }

  return inserted;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  // Handle JSON requests (backward compatibility)
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const parsed = jsonBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { text, metadata } = parsed.data;
    const inserted = await embedAndStore(text, metadata);

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      ids: inserted,
    });
  }

  // Handle multipart form-data (file uploads)
  if (contentType.includes("multipart/form-data")) {
    return new Promise<Response>((resolve) => {
      const busboy_ = Busboy({ headers: { "content-type": contentType } });
      const files: Array<{
        fieldname: string;
        filename: string;
        data: Buffer;
      }> = [];
      let metadata: Record<string, unknown> = {};

      busboy_.on("file", (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
        const { filename } = info;
        const chunks: Buffer[] = [];

        file.on("data", (data: Buffer) => {
          chunks.push(data);
        });

        file.on("end", () => {
          files.push({
            fieldname,
            filename,
            data: Buffer.concat(chunks),
          });
        });
      });

      busboy_.on("field", (fieldname: string, value: string) => {
        if (fieldname === "metadata") {
          try {
            metadata = { ...metadata, ...JSON.parse(value) };
          } catch {
            // Ignore invalid JSON
          }
        } else {
          metadata[fieldname] = value;
        }
      });

      busboy_.on("close", async () => {
        try {
          const allInserted: number[] = [];

          for (const file of files) {
            const text = await parseUploadedFile(file.data, file.filename);
            const fileMetadata = {
              ...metadata,
              filename: file.filename,
              uploadedAt: new Date().toISOString(),
            };
            const inserted = await embedAndStore(text, fileMetadata);
            allInserted.push(...inserted);
          }

          resolve(
            NextResponse.json({
              success: true,
              filesProcessed: files.length,
              inserted: allInserted.length,
              ids: allInserted,
            })
          );
        } catch (error) {
          resolve(
            NextResponse.json(
              {
                error: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
              },
              { status: 400 }
            )
          );
        }
      });

      // Convert the request body to a readable stream
      const reader = req.body?.getReader();
      if (reader) {
        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                busboy_.end();
                break;
              }
              busboy_.write(Buffer.from(value));
            }
          } catch (err) {
            busboy_.destroy(err instanceof Error ? err : new Error(String(err)));
          }
        })();
      }
    });
  }

  return NextResponse.json(
    { error: "Unsupported content type. Use application/json or multipart/form-data" },
    { status: 400 }
  );
}
