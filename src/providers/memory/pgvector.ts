import { OpenAIEmbeddings } from "@langchain/openai";
import { toSql } from "pgvector/pg";
import type { Pool } from "pg";
import type { IMemoryStore, SearchParams } from "../../interfaces/memory.js";

export function createPgVectorMemoryStore(pool: Pool): IMemoryStore {
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

  return {
    async upsert(userPhone: string, content: string): Promise<void> {
      const [vector] = await embeddings.embedDocuments([content]);
      await pool.query(
        `INSERT INTO memories (user_phone, content, embedding) VALUES ($1, $2, $3)`,
        [userPhone, content, toSql(vector)],
      );
    },

    async search({
      userPhone,
      query,
      topK = 5,
      minScore = 0.75,
    }: SearchParams): Promise<string[]> {
      const [queryVector] = await embeddings.embedDocuments([query]);
      const result = await pool.query<{ content: string; score: number }>(
        `SELECT content, 1 - (embedding <=> $1) AS score
         FROM memories
         WHERE user_phone = $2
           AND 1 - (embedding <=> $1) >= $3
         ORDER BY score DESC
         LIMIT $4`,
        [toSql(queryVector), userPhone, minScore, topK],
      );
      return result.rows.map((r) => r.content);
    },
  };
}
