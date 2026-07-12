import { Prisma } from '@prisma/client';
import { prisma } from '@agentlab/database';
import { createFallbackProvider, getDefaultProvider, type LLMProvider } from '@agentlab/llm';
import type { SearchResult, SearchRequest } from '@agentlab/shared';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export class RAGEngine {
  private llm: LLMProvider | null = null;

  private getLLM(): LLMProvider {
    if (!this.llm) {
      try {
        this.llm = createFallbackProvider();
      } catch {
        this.llm = getDefaultProvider();
      }
    }
    return this.llm;
  }

  async ingestDocument(documentId: string, content: string): Promise<number> {
    const chunks = this.splitText(content);
    const embeddings = await this.getLLM().embed(chunks);

    // Insert chunks one by one due to vector column
    for (let i = 0; i < chunks.length; i++) {
      await prisma.$executeRaw`
        INSERT INTO chunks (id, content, embedding, index, "tokenCount", "documentId", "createdAt")
        VALUES (gen_random_uuid(), ${chunks[i]}, ${embeddings[i]}::vector, ${i}, ${this.estimateTokens(chunks[i])}, ${documentId}, NOW())
      `;
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { chunkCount: chunks.length, status: 'COMPLETED' },
    });

    return chunks.length;
  }

  async search(request: SearchRequest): Promise<SearchResult[]> {
    const { query, topK = 5, scoreThreshold = 0.3, documentIds } = request;

    const queryEmbedding = await this.getLLM().embed([query]);
    const embedding = queryEmbedding[0];

    const whereClause: Record<string, unknown> = {};
    if (documentIds?.length) {
      whereClause.documentId = { in: documentIds };
    }

    const results = await prisma.$queryRaw<
      Array<{ id: string; content: string; score: number; metadata: unknown }>
    >`
      SELECT 
        c.id,
        c.content,
        1 - (c.embedding <=> ${embedding}::vector) as score,
        jsonb_build_object(
          'documentId', c."documentId",
          'chunkIndex', c.index,
          'documentName', d.name
        ) as metadata
      FROM chunks c
      JOIN documents d ON d.id = c."documentId"
      WHERE 1 - (c.embedding <=> ${embedding}::vector) > ${scoreThreshold}
      ${documentIds?.length ? Prisma.sql`AND c."documentId" IN (${Prisma.join(documentIds)})` : Prisma.sql``}
      ORDER BY c.embedding <=> ${embedding}::vector
      LIMIT ${topK}
    `;

    return results.map((r) => ({
      chunk: {
        id: r.id,
        content: r.content,
        metadata: r.metadata as SearchResult['chunk']['metadata'],
      },
      score: Number(r.score),
    }));
  }

  private splitText(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export const ragEngine = new RAGEngine();
