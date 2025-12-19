-- Enable pgvector extension
create extension if not exists vector;

-- Documents table (metadata about each source file)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_file text not null,
  section text,
  content_type text,
  created_at timestamptz default now()
);

-- Document chunks with embeddings
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  embedding vector(768),  -- Google's text-embedding-004 uses 768 dimensions
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Create index for fast vector similarity search
create index if not exists document_chunks_embedding_idx
  on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create index on document_id for fast joins
create index if not exists document_chunks_document_id_idx
  on document_chunks(document_id);

-- Function for hybrid search (semantic + optional keyword)
create or replace function search_chunks(
  query_embedding vector(768),
  match_count int default 10,
  filter_section text default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  metadata jsonb,
  similarity float,
  document_title text,
  source_file text
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.title as document_title,
    d.source_file
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where
    (filter_section is null or d.section = filter_section)
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Grant permissions
grant usage on schema public to anon, authenticated;
grant all on documents to anon, authenticated;
grant all on document_chunks to anon, authenticated;
