"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type MarkdownMessageProps = {
  content: string;
  className?: string;
};

export function MarkdownMessage({
  content,
  className,
}: MarkdownMessageProps) {
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code: ({ node, className: codeClassName, children, ...props }) => {
            const isBlock = !!codeClassName;
            const match = /language-(\w+)/.exec(codeClassName || "");
            return !isBlock ? (
              <pre className="bg-muted p-2 rounded-md overflow-x-auto my-2">
                <code
                  className={cn("text-xs font-mono", codeClassName)}
                  {...props}
                >
                  {children}
                </code>
              </pre>
            ) : (
              <code
                className={cn(
                  "bg-muted px-1.5 py-0.5 rounded text-xs font-mono",
                  codeClassName
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Paragraphs
          p: ({ node, children, ...props }) => (
            <p className="mb-2 last:mb-0" {...props}>
              {children}
            </p>
          ),
          // Headings
          h1: ({ node, children, ...props }) => (
            <h1 className="text-lg font-semibold mb-2 mt-3 first:mt-0" {...props}>
              {children}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0" {...props}>
              {children}
            </h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0" {...props}>
              {children}
            </h3>
          ),
          // Links
          a: ({ node, href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80"
              {...props}
            >
              {children}
            </a>
          ),
          // Lists
          ul: ({ node, children, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-2 ml-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 ml-2" {...props}>
              {children}
            </ol>
          ),
          li: ({ node, children, ...props }) => (
            <li className="ml-2" {...props}>
              {children}
            </li>
          ),
          // Blockquotes
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              className="border-l-4 border-muted-foreground/50 pl-4 italic my-2"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Tables (from remark-gfm)
          table: ({ node, children, ...props }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-muted" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ node, children, ...props }) => (
            <thead className="bg-muted" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ node, children, ...props }) => (
            <tbody {...props}>{children}</tbody>
          ),
          tr: ({ node, children, ...props }) => (
            <tr className="border-b border-muted" {...props}>
              {children}
            </tr>
          ),
          th: ({ node, children, ...props }) => (
            <th className="border border-muted px-2 py-1 text-left font-semibold text-xs" {...props}>
              {children}
            </th>
          ),
          td: ({ node, children, ...props }) => (
            <td className="border border-muted px-2 py-1 text-xs" {...props}>
              {children}
            </td>
          ),
          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="border-muted my-3" {...props} />
          ),
          // Strong/Bold
          strong: ({ node, children, ...props }) => (
            <strong className="font-semibold" {...props}>
              {children}
            </strong>
          ),
          // Emphasis/Italic
          em: ({ node, children, ...props }) => (
            <em className="italic" {...props}>
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
