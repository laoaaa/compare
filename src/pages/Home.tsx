import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, BookOpen, ArrowRight, Upload, Loader2, Eraser, Languages } from 'lucide-react';
import { parseFile, cleanText } from '@/lib/file-parser';
import { convertToSimplified } from '@/lib/converter';
import { toast } from 'sonner';

export default function Home() {
  const [, setLocation] = useLocation();
  const [baseText, setBaseText] = useState('');
  const [compareText, setCompareText] = useState('');
  const [loadingBase, setLoadingBase] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [converting, setConverting] = useState<'base'|'compare'|null>(null);
  const baseFileInputRef = useRef<HTMLInputElement>(null);
  const compareFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'base' | 'compare') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setLoading = target === 'base' ? setLoadingBase : setLoadingCompare;
    const setText = target === 'base' ? setBaseText : setCompareText;

    setLoading(true);
    try {
      const rawText = await parseFile(file);
      const cleaned = cleanText(rawText);
      setText(cleaned);
      toast.success('文件解析并清洗成功');
    } catch (err) {
      console.error(err);
      toast.error('文件解析失败，请检查文件格式');
    } finally {
      setLoading(false);
    }
  };

  const handleClean = (target: 'base' | 'compare') => {
    const text = target === 'base' ? baseText : compareText;
    if (!text) return;
    const setText = target === 'base' ? setBaseText : setCompareText;
    setText(cleanText(text));
    toast.success('文本已执行智能清洗 (去除多余空格/合并断行)');
  };

  const handleConvert = async (target: 'base' | 'compare') => {
    const text = target === 'base' ? baseText : compareText;
    if (!text) return;
    
    setConverting(target);
    const setText = target === 'base' ? setBaseText : setCompareText;
    
    try {
      toast.info('正在执行本地繁简转换...');
      const simplified = await convertToSimplified(text);
      setText(simplified);
      toast.success('繁简转换成功');
    } catch (err: any) {
      toast.error('转换失败');
      console.error(err);
    } finally {
      setConverting(null);
    }
  };

  const handleStart = () => {
    if (!baseText.trim() || !compareText.trim()) {
      toast.error('请填写两段文本进行比对');
      return;
    }
    // Store in localStorage or pass via state (wouter doesn't have state pass easily, use storage or context)
    // For simplicity in this demo, localStorage
    localStorage.setItem('collator_base', baseText);
    localStorage.setItem('collator_compare', compareText);
    setLocation('/result');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold text-primary">文本比对的demo-v3</h1>
          <p className="text-muted-foreground text-lg">2026.1.12</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-t-4 border-t-primary/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> 底本 (基础文本)
              </CardTitle>
              <CardDescription className="flex justify-between">
                <span>作为标准的原始文本</span>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleConvert('base')} disabled={!baseText || converting === 'base'}>
                     {converting === 'base' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Languages className="w-3 h-3 mr-1"/>} 繁转简
                   </Button>
                   <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleClean('base')} disabled={!baseText}>
                     <Eraser className="w-3 h-3 mr-1"/> 清洗
                   </Button>
                   <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => baseFileInputRef.current?.click()}>
                     {loadingBase ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3 mr-1"/>} 导入
                   </Button>
                   <input type="file" ref={baseFileInputRef} className="hidden" accept=".txt,.docx,.pdf" onChange={(e) => { handleFileUpload(e, 'base'); e.target.value = ''; }} />
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="请输入或粘贴底本内容..." 
                className="min-h-[300px] font-serif resize-none text-base leading-relaxed"
                value={baseText}
                onChange={(e) => setBaseText(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg border-t-4 border-t-secondary-foreground/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5" /> 对校本 (比对文本)
              </CardTitle>
              <CardDescription className="flex justify-between">
                <span>需要进行校对的文本</span>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleConvert('compare')} disabled={!compareText || converting === 'compare'}>
                     {converting === 'compare' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Languages className="w-3 h-3 mr-1"/>} 繁转简
                   </Button>
                   <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleClean('compare')} disabled={!compareText}>
                     <Eraser className="w-3 h-3 mr-1"/> 清洗
                   </Button>
                   <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => compareFileInputRef.current?.click()}>
                     {loadingCompare ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3 mr-1"/>} 导入
                   </Button>
                   <input type="file" ref={compareFileInputRef} className="hidden" accept=".txt,.docx,.pdf" onChange={(e) => { handleFileUpload(e, 'compare'); e.target.value = ''; }} />
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="请输入或粘贴比对文本..." 
                className="min-h-[300px] font-serif resize-none text-base leading-relaxed"
                value={compareText}
                onChange={(e) => setCompareText(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-4">
          <Button size="lg" className="px-8 text-lg gap-2 shadow-xl transition-all hover:scale-105" onClick={handleStart}>
            开始比对 <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>支持 Word (.docx), PDF, TXT 格式导入 (功能开发中)</p>
          <p>内置本地化简繁智能转换引擎 (无需联网)</p>
        </div>
      </div>
    </div>
  );
}
