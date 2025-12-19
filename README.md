# WJN Messaging Assistant

An AI-powered messaging assistant for political campaigns, grounded in the [Winning Jobs Narrative](https://winningjobsnarrative.org/) research corpus. Built with RAG (Retrieval-Augmented Generation) to provide accurate, research-backed guidance on economic messaging.

## Features

- **Research-Grounded Responses**: All guidance is based on WJN's extensive polling, focus groups, and messaging research
- **Structured Output**: Responses follow a "3 things to say, 2 things to avoid" format
- **Campaign Context**: Customize responses by office type, geography, target audience, and communication medium
- **Fast Responses**: Vector search retrieves relevant context in milliseconds, with streaming responses
- **Modern UI**: Clean, responsive interface optimized for readability

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
│              (Next.js + React + shadcn/ui)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Chat API                                 │
│                  (/api/chat/route.ts)                       │
│                                                              │
│  1. Generate embedding for user query                       │
│  2. Vector search in Supabase (top 15 chunks)               │
│  3. Build prompt with retrieved context                     │
│  4. Stream response from Gemini                             │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│   Supabase/pgvector  │    │   Google Gemini      │
│                      │    │                      │
│  • Document chunks   │    │  • text-embedding-004│
│  • Vector embeddings │    │  • gemini-2.0-flash  │
│  • Similarity search │    │  • Streaming output  │
└──────────────────────┘    └──────────────────────┘
```

### RAG Pipeline

1. **Document Processing** (`scripts/embed-docs.ts`):
   - Extract text from PDFs using [unstructured.io](https://unstructured.io/)
   - Split into ~1500 character chunks with 200 character overlap
   - Generate embeddings using Google's text-embedding-004 model
   - Store in Supabase with pgvector

2. **Query Processing**:
   - Convert user question to embedding
   - Find top 15 most similar document chunks via cosine similarity
   - Include retrieved chunks as context in the prompt

3. **Response Generation**:
   - Gemini generates response grounded in the retrieved context
   - Responses stream back to the UI in real-time

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| LLM | Google Gemini 2.0 Flash |
| Embeddings | Google text-embedding-004 (768 dim) |
| Vector DB | Supabase + pgvector |
| PDF Processing | unstructured.io (Python) |
| Deployment | Vercel |

## Setup

### Prerequisites

- Node.js 18+
- Python 3.9+ (for PDF processing)
- A Supabase account
- A Google Cloud account with Gemini API access

### 1. Clone and Install

```bash
git clone https://github.com/ben8128/wjn-bot.git
cd wjn-bot
npm install
```

### 2. Set Up Python Environment (for PDF processing)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install "unstructured[pdf]"
```

### 3. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Get your project URL and keys from Project Settings > API

### 4. Get Google API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. Ensure it has access to Gemini and Embeddings APIs

### 5. Configure Environment

Create `.env.local`:

```env
# Google Gemini API
GOOGLE_API_KEY=your_google_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 6. Process Documents

Place your source documents in `0 - AI Inputs Examples/` directory, then run:

```bash
npm run embed-docs -- --clean
```

This will:
- Extract text from all PDFs using unstructured.io
- Chunk the text
- Generate embeddings
- Store everything in Supabase

### 7. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Or use CLI:

```bash
vercel --prod
```

### Environment Variables for Production

Set these in your Vercel project settings:
- `GOOGLE_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Project Structure

```
wjn-bot/
├── app/                      # Next.js App Router
│   ├── api/chat/route.ts     # Chat API endpoint
│   ├── page.tsx              # Home page
│   └── layout.tsx            # Root layout
├── components/
│   ├── chat/                 # Chat UI components
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── gemini.ts             # Gemini client
│   ├── prompts.ts            # System prompts
│   ├── search.ts             # Vector search
│   ├── supabase.ts           # Supabase client
│   └── utils.ts              # Utilities
├── scripts/
│   ├── embed-docs.ts         # Document processing
│   └── extract_pdf.py        # PDF extraction
├── supabase/
│   └── schema.sql            # Database schema
└── 0 - AI Inputs Examples/   # Source documents (gitignored)
```

## Database Schema

### Tables

**documents**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Document title |
| source_file | text | Original file path |
| section | text | Category (briefing, primary_research, etc.) |
| content_type | text | pdf or text |
| created_at | timestamptz | Creation timestamp |

**document_chunks**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| document_id | uuid | Foreign key to documents |
| content | text | Chunk text |
| chunk_index | integer | Position in document |
| embedding | vector(768) | Text embedding |
| metadata | jsonb | Additional metadata |
| created_at | timestamptz | Creation timestamp |

### Functions

**search_chunks(query_embedding, match_count, filter_section)**
- Performs cosine similarity search
- Returns chunks with similarity scores
- Optional section filtering

## Scripts

### `npm run embed-docs`

Process documents and store embeddings in Supabase.

```bash
# Process all documents (add new ones only)
npm run embed-docs

# Clean database and re-process all documents
npm run embed-docs -- --clean
```

### `npm run dev`

Start the development server on port 3000.

### `npm run build`

Build for production.

## API Reference

### POST /api/chat

Send a message and receive a streaming response.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "How should I talk about tariffs?" }
  ],
  "context": {
    "officeType": "federal",
    "geography": "Michigan",
    "audience": "Union workers",
    "medium": "speech"
  }
}
```

**Response:** Server-Sent Events stream with JSON chunks:
```
data: {"text": "### Summary\n"}
data: {"text": "When discussing tariffs..."}
data: [DONE]
```

## License

Private - WJN Project
