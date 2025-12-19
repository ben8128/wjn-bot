import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "./supabase";
import type { SearchResult } from "./supabase";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Generate embedding for a query
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(query);
  return result.embedding.values;
}

// Search for relevant document chunks
export async function searchDocuments(
  query: string,
  options: {
    matchCount?: number;
    section?: string;
  } = {}
): Promise<SearchResult[]> {
  const { matchCount = 10, section } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateQueryEmbedding(query);

  // Call the search_chunks function in Supabase
  const { data, error } = await supabaseAdmin.rpc("search_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_section: section || null,
  });

  if (error) {
    console.error("Search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }

  return data as SearchResult[];
}

// Format search results for inclusion in the prompt
export function formatSearchResults(results: SearchResult[]): string {
  if (!results.length) {
    return "No relevant documents found.";
  }

  const formattedResults = results.map((result, index) => {
    return `[Source ${index + 1}: ${result.document_title} (similarity: ${(result.similarity * 100).toFixed(1)}%)]
${result.content}`;
  });

  return formattedResults.join("\n\n---\n\n");
}
