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

  const handleExport = () => {
    if (!result) return;
    
    // CSV Header
    const headers = ['底本原句', '底本', '今本', '说明'];
    const rows = [headers];

    result.results.forEach(res => {
      if (res.status === 'missing') {
        rows.push([
          `"${res.baseSentence.replace(/"/g, '""')}"`,
          `"${res.baseSentence.replace(/"/g, '""')}"`,
          '',
          '脱句'
        ]);
      } else if (res.status === 'extra') {
        rows.push([
          '',
          '',
          `"${res.compareSentence.replace(/"/g, '""')}"`,
          '衍句'
        ]);
      } else {
        res.diffs.forEach(d => {
            if (d.type !== 'equal') {
                let baseText = '';
                let compareText = '';
                let desc = '';
                
                switch (d.type) {
                    case 'delete':
                        baseText = d.text;
                        desc = '脱字';
                        break;
                    case 'insert':
                        compareText = d.text;
                        desc = '衍字';
                        break;
                    case 'substitute':
                        baseText = d.originalText || '';
                        compareText = d.text;
                        desc = '讹误';
                        break;
                    case 'reorder':
                        baseText = d.text;
                        compareText = d.text;
                        desc = '语序颠倒';
                        break;
                    case 'disorder':
                        baseText = d.text;
                        compareText = d.text;
                        desc = '文意错乱';
                        break;
                }
                
                rows.push([
                    `"${res.baseSentence.replace(/"/g, '""')}"`,
                    `"${baseText.replace(/"/g, '""')}"`,
                    `"${compareText.replace(/"/g, '""')}"`,
                    desc
                ]);
            }
        });
      }
    });

    const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collation-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('校勘报告导出成功');
  };

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
               <Button variant="outline" size="icon" onClick={handleExport}>
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
