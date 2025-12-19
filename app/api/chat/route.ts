import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt, CampaignContext } from "@/lib/prompts";
import { searchDocuments, formatSearchResults } from "@/lib/search";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const MODEL_NAME = "gemini-2.0-flash";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: Message[];
  context: CampaignContext;
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, context } = body;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the latest user message for RAG search
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage.role !== "user") {
      return new Response(JSON.stringify({ error: "Last message must be from user" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Search for relevant document chunks
    console.log("Searching for relevant documents...");
    const searchResults = await searchDocuments(latestUserMessage.content, {
      matchCount: 15, // Get top 15 most relevant chunks
    });
    console.log(`Found ${searchResults.length} relevant chunks`);

    // Format search results for inclusion in prompt
    const formattedContext = formatSearchResults(searchResults);

    // Get the model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Build system prompt with campaign context
    const systemPrompt = buildSystemPrompt(context);

    // Build conversation contents for Gemini
    const contents = [];

    // First message includes search results and system prompt
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (!firstUserMessage) {
      return new Response(JSON.stringify({ error: "No user message found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Include RAG results in the first message
    contents.push({
      role: "user" as const,
      parts: [
        {
          text: `${systemPrompt}

---

## Relevant Research Context

The following excerpts are from the WJN research corpus, retrieved based on relevance to the question:

${formattedContext}

---

Based on the research excerpts provided above, please respond to the following:

${firstUserMessage.content}`,
        },
      ],
    });

    // Add remaining messages to the conversation (skip first user message)
    let isFirstUserMessage = true;
    for (const message of messages) {
      if (message.role === "user" && isFirstUserMessage) {
        isFirstUserMessage = false;
        continue;
      }

      contents.push({
        role: message.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: message.content }],
      });
    }

    // Generate streaming response
    const result = await model.generateContentStream({ contents });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              // Send as Server-Sent Events format
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          // Send done signal
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Streaming error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
