import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export function FormattedText({ text, className = '' }: FormattedTextProps) {
  if (!text) return null;

  const paragraphs = text.split('\n');

  return (
    <div className={className}>
      {paragraphs.map((p, i) => {
        // Split by ** for bold
        const parts = p.split(/(\*\*.*?\*\*)/g);
        
        return (
          <p key={i} className={i > 0 ? "mt-2" : ""}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
              }
              
              // Handle *italic* or single * bold if some LLMs use it
              // We'll treat *text* as italic for standard markdown
              const italicParts = part.split(/(\*.*?\*)/g);
              if (italicParts.length > 1) {
                return italicParts.map((iPart, k) => {
                  if (iPart.startsWith('*') && iPart.endsWith('*')) {
                    // Sometimes LLMs use * for bold if they don't use **, let's just use font-semibold
                    return <span key={k} className="font-semibold text-inherit">{iPart.slice(1, -1)}</span>;
                  }
                  return <span key={k}>{iPart}</span>;
                });
              }

              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}
