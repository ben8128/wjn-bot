"use client";

import { useState, useRef, useEffect } from "react";
import { CampaignContext } from "@/lib/prompts";
import { MessageBubble } from "./MessageBubble";
import { ContextSelector } from "./ContextSelector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Settings2, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [context, setContext] = useState<CampaignContext>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);

    // Add placeholder for assistant response
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantContent += parsed.text;
                setMessages([
                  ...newMessages,
                  { role: "assistant", content: assistantContent },
                ]);
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      setIsStreaming(false);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "I'm sorry, there was an error processing your request. Please make sure the API key is configured and try again.",
        },
      ]);
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="border-b shrink-0 px-3 py-1.5 bg-background z-10">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <a href="https://winningjobsnarrative.org/" target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img
              src="https://winningjobsnarrative.org/wp-content/uploads/2022/11/WJN_Logo-text-horizontal-768x152.png"
              alt="Winning Jobs Narrative"
              className="h-6"
            />
          </a>
          <div className="flex-1 flex items-center gap-2">
            <ContextSelector
              context={context}
              onChange={setContext}
              isCollapsed={!showContext}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContext(!showContext)}
              className="gap-1 h-6 px-2 text-xs shrink-0"
            >
              <Settings2 className="h-3 w-3" />
              {showContext ? "Less" : "More"}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-5xl mx-auto">
          {messages.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-sm mb-3">
                Ask about economic messaging for your campaign.
              </p>
              <div className="text-left max-w-md mx-auto text-xs space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Try:</p>
                <p>&bull; &quot;3 things to say about tariffs, 2 to avoid&quot;</p>
                <p>&bull; &quot;How to talk about inflation to suburban voters?&quot;</p>
                <p>&bull; &quot;Opponent called us job killers - how to respond?&quot;</p>
              </div>
            </div>
          ) : (
            messages.map((message, i) => (
              <MessageBubble
                key={i}
                role={message.role}
                content={message.content}
                isStreaming={
                  isStreaming &&
                  i === messages.length - 1 &&
                  message.role === "assistant"
                }
              />
            ))
          )}
        </div>
      </main>

      <footer className="border-t p-2 bg-background shrink-0 z-10">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about economic messaging..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="shrink-0 h-[40px] w-[40px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
}
