import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { collateTexts } from '@/lib/collator';
import type { CollationResult } from '@/lib/types';
import { DiffViewer } from '@/components/DiffViewer';
import { DiffSidebar } from '@/components/DiffSidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Settings, Loader2 } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

export default function Result() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<CollationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const base = localStorage.getItem('collator_base');
    const compare = localStorage.getItem('collator_compare');

    if (!base || !compare) {
      setLocation('/');
      return;
    }

    // Simulate async processing
    setTimeout(() => {
      try {
        const res = collateTexts(base, compare);
        setResult(res);
      } catch (e) {
        console.error(e);
        toast.error('比对过程发生错误');
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [setLocation]);

  if (loading || !result) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">正在进行智能逐句比对...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b flex items-center px-4 justify-between bg-card z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-serif font-bold text-lg">比对结果</h1>
          <div className="flex gap-2 text-sm text-muted-foreground ml-4">
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded dark:bg-green-900 dark:text-green-100">匹配: {result.stats.matchCount}</span>
            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded dark:bg-red-900 dark:text-red-100">差异: {result.stats.totalSentences - result.stats.matchCount + result.stats.extraCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Tooltip>
             <TooltipTrigger asChild>
               <Button variant="outline" size="icon">
                 <Download className="w-4 h-4" />
               </Button>
             </TooltipTrigger>
             <TooltipContent>导出报告</TooltipContent>
           </Tooltip>
           <Button variant="ghost" size="icon">
             <Settings className="w-4 h-4" />
           </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Base Text Panel */}
          <ResizablePanel defaultSize={35} minSize={20} className="bg-background flex flex-col">
             <div className="p-2 border-b text-center font-bold text-sm text-muted-foreground bg-muted/30">底本 (Base)</div>
             <div className="flex-1 overflow-auto custom-scrollbar">
                <DiffViewer 
                  data={result.results} 
                  role="base" 
                  onHighlightClick={setActiveId} 
                  activeId={activeId}
                />
             </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />

          {/* Compare Text Panel */}
          <ResizablePanel defaultSize={35} minSize={20} className="bg-background flex flex-col">
             <div className="p-2 border-b text-center font-bold text-sm text-muted-foreground bg-muted/30">比对本 (Comparison)</div>
             <div className="flex-1 overflow-auto custom-scrollbar">
                <DiffViewer 
                  data={result.results} 
                  role="compare" 
                  onHighlightClick={setActiveId} 
                  activeId={activeId}
                />
             </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Sidebar Panel */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="bg-sidebar">
             <DiffSidebar 
               results={result.results} 
               onCardClick={setActiveId} 
               activeId={activeId} 
             />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
