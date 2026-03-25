export interface MemoryRecord {
  content: string;
  score?: number;
}

export interface SearchParams {
  userPhone: string;
  query: string;
  topK?: number;
  minScore?: number;
}

export interface IMemoryStore {
  upsert(userPhone: string, content: string): Promise<void>;
  search(params: SearchParams): Promise<string[]>;
}
