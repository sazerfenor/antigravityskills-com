/**
 * Skill Converter Playground
 * 核心 UI 组件 - 将 Claude Skills 或自然语言想法转换为 Antigravity Skills
 */

'use client';

import { useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Loader2, Download, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function SkillConverterPlayground() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConvert = async () => {
    if (!input.trim()) {
      toast.error('Please enter some content to convert');
      return;
    }

    setLoading(true);
    setOutput(null);

    try {
      const response = await fetch('/api/skills/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          sourceType: 'other',
        }),
      });

      const data = (await response.json()) as {
        code: number;
        message?: string;
        data?: { skillMd: string };
      };

      if (data.code !== 0) {
        throw new Error(data.message || 'Conversion failed');
      }

      setOutput(data.data?.skillMd ?? null);
      toast.success('✨ Conversion completed!');
    } catch (error: any) {
      console.error('Conversion error:', error);
      toast.error(error.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!output) return;

    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📥 Downloaded SKILL.md');
  };

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('📋 Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Input
          </h3>
          <Textarea
            placeholder="Paste Claude Skill content here, or describe your skill idea...

Examples:
- Paste a complete Claude Skill (with frontmatter)
- Describe: 'Create a skill for code review'
- Describe: 'Help me implement TDD workflow'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={20}
            className="font-mono text-sm mb-4 resize-none"
          />
          <Button
            onClick={handleConvert}
            disabled={!input.trim() || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Convert to Antigravity Skill
              </>
            )}
          </Button>
        </Card>

        {/* Output Panel */}
        <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Output</h3>
            {output && (
              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
          {output ? (
            <div className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-[600px] pr-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {output}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground text-center">
              <div>
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Converted skill will appear here...</p>
                <p className="text-xs mt-2">
                  Supports Claude Skills and natural language ideas
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
