"use client";

import { useState, useRef, useEffect } from "react";
import { CampaignContext } from "@/lib/prompts";
import { MessageBubble } from "./MessageBubble";
import { ContextSelector } from "./ContextSelector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [showContext, setShowContext] = useState(true);
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
    <Card className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <CardHeader className="border-b shrink-0 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            WJN Messaging Assistant
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContext(!showContext)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            {showContext ? "Hide" : "Show"} Context
          </Button>
        </div>

        {showContext ? (
          <div className="mt-4">
            <ContextSelector context={context} onChange={setContext} />
          </div>
        ) : (
          <div className="mt-2">
            <ContextSelector
              context={context}
              onChange={setContext}
              isCollapsed
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="divide-y">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">
                  Welcome to the WJN Messaging Assistant
                </p>
                <p className="text-sm mb-4">
                  Ask me about economic messaging for your campaign. I can help
                  with talking points, message framing, and what to avoid.
                </p>
                <div className="text-left max-w-lg mx-auto space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    Try asking:
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>
                      &quot;Give me 3 things to say about tariffs and 2 things
                      to avoid&quot;
                    </li>
                    <li>
                      &quot;How should I talk about inflation to suburban
                      voters?&quot;
                    </li>
                    <li>
                      &quot;My opponent called us job killers - how do I
                      respond?&quot;
                    </li>
                  </ul>
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
        </div>

        <div className="border-t p-4 bg-background">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about economic messaging..."
                className="min-h-[44px] max-h-[200px] resize-none"
                rows={1}
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="shrink-0 h-[44px] w-[44px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
