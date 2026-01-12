import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsDialog() {
  const [apiKey, setApiKey] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('deepseek_api_key');
    if (key) setApiKey(key);
  }, []);

  const handleSave = () => {
    localStorage.setItem('deepseek_api_key', apiKey);
    toast.success('设置已保存');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-4 right-4">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>系统设置</DialogTitle>
          <DialogDescription>
            配置 DeepSeek API 以启用繁简智能转换功能。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apikey" className="text-right">
              API Key
            </Label>
            <Input
              id="apikey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="col-span-3 font-mono text-xs"
              placeholder="sk-..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>保存配置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
