import React, { useRef, useEffect } from 'react';
import type { DiffSegment, SentenceResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  data: SentenceResult[];
  role: 'base' | 'compare'; // Displaying base text or comparison text?
  onHighlightClick: (id: string) => void;
  activeId: string | null;
}

export function DiffViewer({ data, role, onHighlightClick, activeId }: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to active element
  useEffect(() => {
    if (activeId && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-id="${activeId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeId]);

  return (
    <div ref={containerRef} className="prose dark:prose-invert max-w-none p-8 font-serif leading-loose text-lg whitespace-pre-wrap">
      {data.map((sentence, sIdx) => {
        // If role is base, show baseSentence. If missing_sentence, show base.
        // If extra_sentence, show nothing in base (or show gap?).
        
        if (role === 'base') {
           if (sentence.status === 'extra') return null; // Base doesn't have this
           if (sentence.status === 'missing') {
             // Missing in Compare = Text exists in Base, but not in Compare. 
             // In Base view, it's just normal text, maybe highlighted as "Will be Missing"?
             // Usually Base is the "Standard", so we show it as is, or mark it as "Unmatched".
             // Let's mark it as 'delete' type essentially (from Compare perspective).
             return (
               <span 
                 key={sIdx}
                 className="bg-[var(--diff-removed-bg)] text-[var(--diff-removed-text)] cursor-pointer hover:brightness-95 rounded px-1 transition-colors"
                 data-id={`diff-${sIdx}-missing`}
                 onClick={() => onHighlightClick(`diff-${sIdx}-missing`)}
               >
                 {sentence.baseSentence}
               </span>
             );
           }
        } else {
           // Role == compare
           if (sentence.status === 'missing') return (
             <span key={sIdx} className="text-muted-foreground/30 select-none">[脱句]</span>
           ); // Placeholder for alignment?
           if (sentence.status === 'extra') {
             return (
                <span 
                 key={sIdx}
                 className="bg-[var(--diff-added-bg)] text-[var(--diff-added-text)] cursor-pointer hover:brightness-95 rounded px-1 transition-colors"
                 data-id={`diff-${sIdx}-extra`}
                 onClick={() => onHighlightClick(`diff-${sIdx}-extra`)}
               >
                 {sentence.compareSentence}
               </span>
             );
           }
        }

        // Normal diffs within sentence
        return (
          <span key={sIdx} className="inline mr-1 group relative">
             {sentence.diffs.map((diff, dIdx) => {
               // Base View: Show 'equal', 'delete' (which is content present in Base), 'substitute' (original)
               // Compare View: Show 'equal', 'insert' (content present in Compare), 'substitute' (new)
               
               const id = `diff-${sIdx}-${dIdx}`;
               const isActive = activeId === id;

               if (role === 'base') {
                 if (diff.type === 'insert') return null; // Don't show insertions in base
                 if (diff.type === 'delete') {
                   return (
                     <Highlight 
                        key={dIdx} 
                        type="delete" 
                        text={diff.text} 
                        id={id} 
                        onClick={onHighlightClick} 
                        active={isActive}
                     />
                   );
                 }
                 if (diff.type === 'substitute') {
                   return (
                     <Highlight 
                        key={dIdx} 
                        type="substitute" 
                        text={diff.originalText || ''} 
                        id={id} 
                        onClick={onHighlightClick} 
                        active={isActive}
                     />
                   );
                 }
                 return <span key={dIdx}>{diff.text}</span>;
               } 
               
               // Role: Compare
               if (diff.type === 'delete') return null; // Don't show deletions in compare
               if (diff.type === 'insert') {
                 return (
                    <Highlight 
                        key={dIdx} 
                        type="insert" 
                        text={diff.text} 
                        id={id} 
                        onClick={onHighlightClick} 
                        active={isActive}
                     />
                 );
               }
               if (diff.type === 'substitute') {
                  return (
                     <Highlight 
                        key={dIdx} 
                        type="substitute" 
                        text={diff.text} 
                        id={id} 
                        onClick={onHighlightClick} 
                        active={isActive}
                     />
                   );
               }
               return <span key={dIdx}>{diff.text}</span>;
             })}
          </span>
        );
      })}
    </div>
  );
}

function Highlight({ type, text, id, onClick, active }: any) {
  const colors: any = {
    delete: 'bg-[var(--diff-removed-bg)] text-[var(--diff-removed-text)]', // 脱
    insert: 'bg-[var(--diff-added-bg)] text-[var(--diff-added-text)]', // 衍
    substitute: 'bg-[var(--diff-changed-bg)] text-[var(--diff-changed-text)]', // 讹
  };
  
  return (
    <span 
      className={cn(
        colors[type], 
        "cursor-pointer rounded px-0.5 transition-all duration-200 border-b-2 border-transparent",
        active && "border-primary brightness-95 scale-105 inline-block shadow-sm"
      )}
      data-id={id}
      onClick={() => onClick(id)}
    >
      {text}
    </span>
  );
}
