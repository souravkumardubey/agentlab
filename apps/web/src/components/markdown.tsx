'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={`markdown-content ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;

            if (isInline) {
              return (
                <code
                  className="inline-code"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="code-block-wrapper">
                {match && (
                  <div className="code-block-header">
                    <span className="code-block-language">{match[1]}</span>
                  </div>
                )}
                <code className={className} {...props}>
                  {children}
                </code>
              </div>
            );
          },
          p({ children, ...props }) {
            return (
              <p {...props}>
                {children}
              </p>
            );
          },
          ul({ children, ...props }) {
            return (
              <ul {...props}>
                {children}
              </ul>
            );
          },
          ol({ children, ...props }) {
            return (
              <ol {...props}>
                {children}
              </ol>
            );
          },
          li({ children, ...props }) {
            return (
              <li {...props}>
                {children}
              </li>
            );
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote {...props}>
                {children}
              </blockquote>
            );
          },
          h1({ children, ...props }) {
            return <h1 {...props}>{children}</h1>;
          },
          h2({ children, ...props }) {
            return <h2 {...props}>{children}</h2>;
          },
          h3({ children, ...props }) {
            return <h3 {...props}>{children}</h3>;
          },
          h4({ children, ...props }) {
            return <h4 {...props}>{children}</h4>;
          },
          table({ children, ...props }) {
            return (
              <div className="table-wrapper">
                <table {...props}>{children}</table>
              </div>
            );
          },
          a({ children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
