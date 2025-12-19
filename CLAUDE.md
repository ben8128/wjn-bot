# CLAUDE.md - Project Context for Claude Code

## Project Overview

WJN Messaging Assistant - A RAG-powered AI chatbot that provides economic messaging guidance for political campaigns, grounded in the Winning Jobs Narrative research corpus.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **LLM**: Google Gemini 2.0 Flash
- **Embeddings**: Google text-embedding-004 (768 dimensions)
- **Vector DB**: Supabase with pgvector extension
- **PDF Processing**: unstructured.io (Python)
- **Deployment**: Vercel

## Project Structure

```
wjn-bot/
├── app/
│   ├── api/chat/route.ts    # Streaming chat API with RAG
│   ├── page.tsx             # Main page (renders ChatInterface)
│   └── layout.tsx           # Root layout
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx    # Main chat UI
│   │   ├── MessageBubble.tsx    # Message display with markdown
│   │   └── ContextSelector.tsx  # Campaign context inputs
│   └── ui/                      # shadcn components
├── lib/
│   ├── gemini.ts            # Gemini client setup
│   ├── prompts.ts           # System prompts and context building
│   ├── search.ts            # Vector search functions
│   ├── supabase.ts          # Supabase client and types
│   └── utils.ts             # Utility functions
├── scripts/
│   ├── embed-docs.ts        # Document chunking and embedding
│   ├── extract_pdf.py       # PDF text extraction (unstructured.io)
│   └── upload-docs.ts       # Legacy: Gemini File API upload
├── supabase/
│   └── schema.sql           # Database schema with pgvector
└── 0 - AI Inputs Examples/  # Source documents (not in git)
```

## Key Files

- `app/api/chat/route.ts` - The main API endpoint. Performs vector search, builds context, streams Gemini response.
- `lib/search.ts` - `searchDocuments()` generates query embedding and calls Supabase `search_chunks` function.
- `lib/prompts.ts` - `buildSystemPrompt()` creates the system prompt with campaign context and output format instructions.
- `scripts/embed-docs.ts` - Run with `npm run embed-docs` to process documents and store embeddings.

## Database Schema

Two main tables in Supabase:
- `documents` - Metadata (title, source_file, section, content_type)
- `document_chunks` - Content chunks with vector(768) embeddings

The `search_chunks` function performs cosine similarity search.

## Environment Variables

Required in `.env.local`:
```
GOOGLE_API_KEY=           # Gemini API key
NEXT_PUBLIC_SUPABASE_URL= # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key (server-side only)
```

## Common Tasks

### Re-embed documents
```bash
npm run embed-docs -- --clean  # Clean and re-embed all
npm run embed-docs             # Add new documents only
```

### Run locally
```bash
npm run dev
```

### Deploy
```bash
git push origin main           # Auto-deploys via Vercel
vercel --prod                  # Manual deploy
```

## Architecture Notes

1. **RAG Flow**: User query → Generate embedding → Vector search (top 15 chunks) → Build prompt with context → Stream Gemini response

2. **Output Format**: Responses follow "3 things to say, 2 things to avoid" structure per the WJN project requirements.

3. **Campaign Context**: Optional filters for office type, geography, audience, and medium that modify the system prompt.

4. **Chunking**: 1500 character chunks with 200 character overlap, breaking at sentence boundaries.
