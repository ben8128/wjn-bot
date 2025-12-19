"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-2 px-3 py-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        <AvatarFallback
          className={cn(
            "text-[10px] font-medium",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-emerald-600 text-white"
          )}
        >
          {isUser ? "U" : "W"}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex-1 rounded-md px-3 py-2",
          isUser
            ? "bg-blue-50 dark:bg-blue-950"
            : "bg-gray-50 dark:bg-gray-900"
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold mt-4 mb-2 first:mt-0">
                    {children}
                  </h3>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-sm">{children}</li>
                ),
                p: ({ children }) => (
                  <p className="text-sm my-2 first:mt-0 last:mb-0">{children}</p>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-emerald-600 animate-pulse ml-1" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
