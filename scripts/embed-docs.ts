import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

const DOCS_DIR = path.join(process.cwd(), "0 - AI Inputs Examples");
const CONVERTED_DIR = path.join(process.cwd(), ".converted");

// Chunking settings
const CHUNK_SIZE = 1500; // characters
const CHUNK_OVERLAP = 200; // characters

interface ChunkData {
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

// Get section from file path
function getSection(filePath: string): string {
  const relativePath = path.relative(DOCS_DIR, filePath);
  if (relativePath.startsWith("Section 1")) return "briefing";
  if (relativePath.startsWith("Section 2")) return "phase_one";
  if (relativePath.startsWith("Section 3")) return "primary_research";
  if (relativePath.startsWith("Section 5.Relevant")) return "related_research";
  if (relativePath.startsWith("Section 5.Social")) return "social_science";
  return "general";
}

// Extract text from PDF using unstructured.io via Python script
async function extractPdfText(filePath: string): Promise<string> {
  const scriptPath = path.join(process.cwd(), "scripts", "extract_pdf.py");
  const venvPython = path.join(process.cwd(), ".venv", "bin", "python");

  try {
    const result = execSync(`"${venvPython}" "${scriptPath}" "${filePath}"`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large PDFs
      timeout: 120000, // 2 minute timeout per PDF
    });

    // Check if result is an error JSON
    if (result.startsWith('{"error":')) {
      const error = JSON.parse(result);
      throw new Error(error.error);
    }

    return result;
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error}`);
  }
}

// Read text file
function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

// Chunk text into smaller pieces with overlap
function chunkText(text: string, metadata: Record<string, unknown> = {}): ChunkData[] {
  const chunks: ChunkData[] = [];

  // Clean text
  text = text.replace(/\s+/g, " ").trim();

  if (text.length <= CHUNK_SIZE) {
    chunks.push({ content: text, chunkIndex: 0, metadata });
    return chunks;
  }

  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(". ", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + CHUNK_SIZE / 2) {
        end = breakPoint + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {  // Skip very small chunks
      chunks.push({ content: chunk, chunkIndex, metadata });
      chunkIndex++;
    }

    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

// Generate embedding using Google's API
async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// Process a single file
async function processFile(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const section = getSection(filePath);
  const relativePath = path.relative(DOCS_DIR, filePath);

  console.log(`\nProcessing: ${relativePath}`);

  let text: string;
  let contentType: string;

  try {
    if (ext === ".pdf") {
      text = await extractPdfText(filePath);
      contentType = "pdf";
    } else if (ext === ".txt") {
      text = readTextFile(filePath);
      contentType = "text";
    } else {
      console.log(`  Skipping unsupported format: ${ext}`);
      return;
    }
  } catch (error) {
    console.error(`  Error reading file: ${error}`);
    return;
  }

  if (!text || text.trim().length < 100) {
    console.log(`  Skipping (too short or empty)`);
    return;
  }

  // Create document record
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      title: fileName.replace(/\.(pdf|txt)$/i, ""),
      source_file: relativePath,
      section,
      content_type: contentType,
    })
    .select()
    .single();

  if (docError) {
    console.error(`  Error creating document: ${docError.message}`);
    return;
  }

  console.log(`  Created document: ${doc.id}`);

  // Chunk the text
  const chunks = chunkText(text, { section, source_file: relativePath });
  console.log(`  Created ${chunks.length} chunks`);

  // Process chunks in batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const chunkRecords = await Promise.all(
      batch.map(async (chunk) => {
        const embedding = await generateEmbedding(chunk.content);
        return {
          document_id: doc.id,
          content: chunk.content,
          chunk_index: chunk.chunkIndex,
          embedding,
          metadata: chunk.metadata,
        };
      })
    );

    const { error: chunkError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (chunkError) {
      console.error(`  Error inserting chunks: ${chunkError.message}`);
    } else {
      console.log(`  Inserted chunks ${i + 1}-${Math.min(i + BATCH_SIZE, chunks.length)}`);
    }

    // Rate limiting - Google has limits on embedding API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// Get all files to process
function getAllFiles(): string[] {
  const files: string[] = [];

  // Get PDFs from main directory
  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && !entry.name.startsWith(".")) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === ".pdf") {
          files.push(fullPath);
        }
      }
    }
  }
  walkDir(DOCS_DIR);

  // Get converted text files
  if (fs.existsSync(CONVERTED_DIR)) {
    function walkConverted(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkConverted(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".txt")) {
          files.push(fullPath);
        }
      }
    }
    walkConverted(CONVERTED_DIR);
  }

  return files;
}

async function main() {
  console.log("WJN Document Embedding Script");
  console.log("==============================\n");

  // Check for --clean flag
  if (process.argv.includes("--clean")) {
    console.log("Cleaning existing data...");
    await supabase.from("document_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("Done.\n");
  }

  const files = getAllFiles();
  console.log(`Found ${files.length} files to process.\n`);

  for (const file of files) {
    await processFile(file);
  }

  // Summary
  const { count: docCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true });
  const { count: chunkCount } = await supabase
    .from("document_chunks")
    .select("*", { count: "exact", head: true });

  console.log("\n==============================");
  console.log(`Total documents: ${docCount}`);
  console.log(`Total chunks: ${chunkCount}`);
  console.log("Done!");
}

main().catch(console.error);
