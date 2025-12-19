import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser/public use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (inserting embeddings, etc.)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface Document {
  id: string;
  title: string;
  source_file: string;
  section: string | null;
  content_type: string | null;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SearchResult {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
  similarity: number;
  document_title: string;
  source_file: string;
}
