import React, { useEffect, useRef } from 'react';
import type { SentenceResult } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DiffSidebarProps {
  results: SentenceResult[];
  onCardClick: (id: string) => void;
  activeId: string | null;
}

export function DiffSidebar({ results, onCardClick, activeId }: DiffSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeId && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-card-id="${activeId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeId]);

  // Flatten the issues
  const issues = results.flatMap((res, sIdx) => {
    const items: { id: string; type: string; text: string; desc: string; label: string }[] = [];
    
    // Sentence level issues
    if (res.status === 'missing') {
      items.push({
        id: `diff-${sIdx}-missing`,
        type: 'missing_sentence',
        text: res.baseSentence,
        desc: '比对本缺失此句 (脱句)',
        label: '脱'
      });
    } else if (res.status === 'extra') {
      items.push({
        id: `diff-${sIdx}-extra`,
        type: 'extra_sentence',
        text: res.compareSentence,
        desc: '比对本多出此句 (衍句)',
        label: '衍'
      });
    } else {
      // Inline diffs
      res.diffs.forEach((d, dIdx) => {
        if (d.type !== 'equal') {
          let label = '';
          let desc = '';
          let content = '';

          switch (d.type) {
            case 'delete': 
              label = '脱'; 
              desc = '文字缺失'; 
              content = `底本：${d.text}`;
              break;
            case 'insert': 
              label = '衍'; 
              desc = '文字衍文'; 
              content = `今本：${d.text}`;
              break;
            case 'substitute': 
              label = '讹'; 
              desc = '文字讹误'; 
              content = `底本：${d.originalText} → 今本：${d.text}`;
              break;
            case 'reorder': label = '倒'; desc = '语序颠倒'; break;
            case 'disorder': label = '乱'; desc = '文意错乱'; break;
          }

          items.push({
            id: `diff-${sIdx}-${dIdx}`,
            type: d.type,
            text: content,
            desc,
            label
          });
        }
      });
    }
    return items;
  });

  return (
    <div className="h-full flex flex-col bg-sidebar border-l">
      <div className="p-4 border-b bg-sidebar-accent/50 backdrop-blur">
        <h2 className="font-serif font-bold text-lg">校勘记 ({issues.length})</h2>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {issues.map((item) => (
            <Card 
              key={item.id} 
              data-card-id={item.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-l-4",
                activeId === item.id ? "ring-2 ring-primary border-l-primary bg-accent" : "border-l-muted-foreground/30",
                getTypeColor(item.type)
              )}
              onClick={() => onCardClick(item.id)}
            >
              <CardHeader className="p-3 pb-1">
                 <div className="flex items-center justify-between">
                   <Badge variant="outline" className="font-serif font-bold">{item.label}</Badge>
                   <span className="text-xs text-muted-foreground">{item.desc}</span>
                 </div>
              </CardHeader>
              <CardContent className="p-3 pt-2 text-sm font-serif">
                {item.text}
              </CardContent>
            </Card>
          ))}
          {issues.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              无差异发现
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function getTypeColor(type: string) {
  switch (type) {
    case 'delete': return "border-l-[var(--diff-removed-text)]";
    case 'insert': return "border-l-[var(--diff-added-text)]";
    case 'substitute': return "border-l-[var(--diff-changed-text)]";
    case 'missing_sentence': return "border-l-[var(--diff-removed-text)]";
    case 'extra_sentence': return "border-l-[var(--diff-added-text)]";
    default: return "";
  }
}
