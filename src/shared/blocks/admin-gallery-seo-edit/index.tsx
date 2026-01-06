'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles, Save, Check, X, Eye, Download, Upload, Plus, Copy } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { useDebug } from '@/shared/contexts/debug';
import { BlockCard } from '@/shared/components/admin/block-card';
import { getContentSections } from '@/shared/lib/content-sections-converter';
import { getModelDisplayName } from '@/shared/lib/model-names';
import type { ContentSection, ContentSections } from '@/shared/schemas/api-schemas';


interface AdminGallerySEOEditProps {
  post: any; // CommunityPost type
  aiTask?: any; // AI Task with optimization data
}

export function AdminGallerySEOEdit({ post, aiTask }: AdminGallerySEOEditProps) {
  const router = useRouter();
  const { pushDebug } = useDebug(); // 🆕 统一 Debug Panel
  
  // State for SEO fields
  const [seoSlug, setSeoSlug] = useState(post.seoSlug || '');
  const [seoTitle, setSeoTitle] = useState(post.seoTitle || '');
  const [h1Title, setH1Title] = useState((post as any).h1Title || ''); // 🆕 独立 H1
  const [seoDescription, setSeoDescription] = useState(post.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(post.seoKeywords || '');
  const [seoSlugKeywords, setSeoSlugKeywords] = useState(post.seoSlugKeywords || '');
  const [contentIntro, setContentIntro] = useState(post.contentIntro || '');
  const [promptBreakdown, setPromptBreakdown] = useState(post.promptBreakdown || '');
  const [imageAlt, setImageAlt] = useState(post.imageAlt || '');
  const [dynamicHeaders, setDynamicHeaders] = useState(post.dynamicHeaders || '');
  const [faqItems, setFaqItems] = useState(post.faqItems || '');
  const [useCases, setUseCases] = useState(post.useCases || '');
  const [visualTags, setVisualTags] = useState(post.visualTags || '');
  const [remixIdeas, setRemixIdeas] = useState(post.remixIdeas ? JSON.stringify(post.remixIdeas) : ''); // 🆕 V12.0
  const [relatedConcepts, setRelatedConcepts] = useState(post.relatedConcepts ? JSON.stringify(post.relatedConcepts) : ''); // 🆕 V12.0
  const [contentSections, setContentSections] = useState(post.contentSections ? JSON.stringify(post.contentSections, null, 2) : ''); // 🆕 V14.0
  const [anchor, setAnchor] = useState((post as any).anchor || ''); // 🆕 V14.0
  const [microFocus, setMicroFocus] = useState((post as any).microFocus || ''); // 🆕 V14.0
  const [coreSubject, setCoreSubject] = useState(''); // 新增：核心主体/焦点关键词
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'unchecked' | 'available' | 'taken' | 'error'>('unchecked');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  
  // 🆕 V14.0 Block-based content sections state
  const [blocks, setBlocks] = useState<ContentSections>([]);
  
  // Initialize blocks from post data (Legacy or V14)
  useEffect(() => {
    const sections = getContentSections(post as any);
    setBlocks(sections);
  }, [post]);
  
  // 🆕 Block manipulation utilities
  const updateBlock = useCallback((index: number, updates: Partial<ContentSection>) => {
    setBlocks(prev => prev.map((block, i) => 
      i === index ? { ...block, ...updates } as ContentSection : block
    ) as ContentSections);
  }, []);
  
  const deleteBlock = useCallback((index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const moveBlockUp = useCallback((index: number) => {
    if (index === 0) return;
    setBlocks(prev => {
      const newBlocks = [...prev];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  }, []);
  
  const moveBlockDown = useCallback((index: number) => {
    setBlocks(prev => {
      if (index >= prev.length - 1) return prev;
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  }, []);
  
  const addNewBlock = useCallback((type: ContentSection['type']) => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type,
      title: type === 'rich-text' ? 'New Section' 
           : type === 'faq-accordion' ? 'Frequently Asked Questions'
           : type === 'checklist' ? 'Key Points'
           : 'Comparison',
      headingLevel: 'h2' as const,
      data: type === 'rich-text' ? { text: '' }
          : type === 'faq-accordion' ? { items: [{ q: '', a: '' }] }
          : type === 'checklist' ? { items: [''] }
          : { left: 'Pros', right: 'Cons', rows: [{ pro: '', con: '' }] },
    } as ContentSection;
    setBlocks(prev => [...prev, newBlock]);
  }, []);

  // ===== JSON Export/Import Functions =====
  const handleExportJson = () => {
    // 🔍 按照 Google 爬虫看到的顺序排列
    const formData = {
      // 1. SEO Metadata (Head 信息)
      seoTitle,
      seoDescription,
      seoKeywords,
      seoSlug,
      seoSlugKeywords,
      
      // 2. Page Display (用户可见内容)
      h1Title,
      imageAlt,
      
      // 3. Structured Content (正文内容)
      contentIntro,        // About section
      promptBreakdown,     // Visual Analysis
      dynamicHeaders,      // Section headers
      
      // 4. Rich Data (Schema 相关)
      faqItems,            // FAQPage Schema
      visualTags,          // Keywords/Tags
      useCases,            // Use cases list
      remixIdeas,          // Creative suggestions
      relatedConcepts,     // Internal linking
      
      // 5. Admin Only
      coreSubject,         // Focus keyword (not in final HTML)
    };
    const json = JSON.stringify(formData, null, 2);
    setJsonText(json);
    setShowJsonModal(true);
    navigator.clipboard.writeText(json);
    toast.success('📋 JSON 已复制到剪贴板！');
  };

  const handleImportJson = () => {
    try {
      const data = JSON.parse(jsonText);
      // Restore all fields
      if (data.coreSubject !== undefined) setCoreSubject(data.coreSubject);
      if (data.seoSlug !== undefined) setSeoSlug(data.seoSlug);
      if (data.seoTitle !== undefined) setSeoTitle(data.seoTitle);
      if (data.h1Title !== undefined) setH1Title(data.h1Title);
      if (data.seoDescription !== undefined) setSeoDescription(data.seoDescription);
      if (data.seoKeywords !== undefined) setSeoKeywords(data.seoKeywords);
      if (data.seoSlugKeywords !== undefined) setSeoSlugKeywords(data.seoSlugKeywords);
      if (data.contentIntro !== undefined) setContentIntro(data.contentIntro);
      if (data.promptBreakdown !== undefined) setPromptBreakdown(data.promptBreakdown);
      if (data.imageAlt !== undefined) setImageAlt(data.imageAlt);
      if (data.dynamicHeaders !== undefined) setDynamicHeaders(data.dynamicHeaders);
      if (data.faqItems !== undefined) setFaqItems(data.faqItems);
      if (data.useCases !== undefined) setUseCases(data.useCases);
      if (data.visualTags !== undefined) setVisualTags(data.visualTags);
      if (data.remixIdeas !== undefined) setRemixIdeas(data.remixIdeas);
      if (data.relatedConcepts !== undefined) setRelatedConcepts(data.relatedConcepts);
      
      setShowJsonModal(false);
      setSlugStatus('unchecked');
      toast.success('✅ 表单已从 JSON 还原！');
    } catch (error) {
      toast.error('❌ JSON 格式错误，请检查');
    }
  };

  // 预览功能
  const handlePreview = () => {
    // 将当前表单数据存入 sessionStorage
    const previewData = {
      id: post.id,
      prompt: post.prompt,
      imageUrl: post.imageUrl,
      model: post.model,
      seoTitle,
      h1Title, // 🆕 独立 H1
      seoDescription,
      seoKeywords,
      seoSlug,
      contentIntro,
      promptBreakdown,
      dynamicHeaders,
      faqItems,
      visualTags,
      useCases,
      imageAlt,
      remixIdeas, // 🆕 V12.0
      relatedConcepts, // 🆕 V12.0
      userName: post.user?.name,
      userImage: post.user?.image,
    };
    
    sessionStorage.setItem(`seo-preview-${post.id}`, JSON.stringify(previewData));
    
    // 在新标签页打开预览
    window.open(`/preview/${post.id}`, '_blank');
  };

  // AI生成所有内容
  const handleAIGenerateAll = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/seo/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          prompt: post.prompt,
          model: post.model,
          imageUrl: post.imageUrl,
          subject: coreSubject || undefined, // 新增：传递核心主体
        }),
      });

      if (!response.ok) throw new Error('AI generation failed');

      const { data } = await response.json() as { data: any };
      
      // 更新所有字段
      setSeoSlug(data.seoSlug);
      setSeoTitle(data.seoTitle);
      setH1Title(data.h1Title || ''); // 🆕 独立 H1
      setSeoDescription(data.seoDescription);
      setSeoKeywords(data.seoKeywords);
      setSeoSlugKeywords(data.seoSlugKeywords);
      setContentIntro(data.contentIntro);
      setPromptBreakdown(data.promptBreakdown);
      setImageAlt(data.imageAlt);
      setDynamicHeaders(data.dynamicHeaders);
      setFaqItems(data.faqItems);
      setUseCases(data.useCases);
      
      // 🆕 统一 Debug Panel 推送 (V14.0 完整调试链路)
      if (data.debugInfo) {
        pushDebug('seo-generate', 'AI SEO Generation', data.debugInfo);
      }
      setVisualTags(data.visualTags);
      
      // 🆕 V12.0 新字段
      if (data.remixIdeas) {
        setRemixIdeas(JSON.stringify(data.remixIdeas));
      }
      if (data.relatedConcepts) {
        setRelatedConcepts(JSON.stringify(data.relatedConcepts));
      }
      
      // 🆕 V14.0 新字段 - Use AI-generated contentSections directly
      // V14 AI returns native contentSections, use getContentSections for fallback to legacy
      console.log('[V14 Debug] AI Response contentSections:', data.contentSections);
      console.log('[V14 Debug] AI Response contentSections length:', data.contentSections?.length);
      
      const generatedBlocks = getContentSections({
        faqItems: data.faqItems,
        useCases: data.useCases,
        visualTags: data.visualTags,
        contentIntro: data.contentIntro,
        promptBreakdown: data.promptBreakdown,
        dynamicHeaders: data.dynamicHeaders,
        contentSections: data.contentSections, // If AI returns V14 format, use directly
      } as any);
      
      console.log('[V14 Debug] getContentSections result:', generatedBlocks);
      console.log('[V14 Debug] getContentSections result length:', generatedBlocks.length);
      console.log('[V14 Debug] Block types:', generatedBlocks.map(b => b.type));
      
      setBlocks(generatedBlocks);
      
      if (data.anchor) {
        setAnchor(data.anchor);
      }
      if (data.microFocus) {
        setMicroFocus(data.microFocus);
      }

      // 新增：如果AI返回了subject，且用户未填写，则回填
      if (data.subject && !coreSubject) {
        setCoreSubject(data.subject);
      }

      toast.success('✨ AI已生成所有SEO内容！');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('AI生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 检查 Slug 重复
  const handleCheckSlug = async () => {
    if (!seoSlug) {
      toast.error('请先输入 Slug');
      return;
    }

    setIsCheckingSlug(true);
    setSlugStatus('unchecked');

    try {
      const response = await fetch(
        `/api/admin/seo/check-slug?slug=${encodeURIComponent(seoSlug)}&postId=${post.id}`
      );

      if (!response.ok) throw new Error('Check failed');

      const { data } = await response.json() as { data: any };

      if (data.available) {
        setSlugStatus('available');
        toast.success('✅ Slug 可用！');
      } else {
        setSlugStatus('taken');
        toast.error(`❌ Slug 已被占用（ID: ${data.conflictId}）`);
      }
    } catch (error) {
      console.error('Slug check error:', error);
      setSlugStatus('error');
      toast.error('检查失败，请重试');
    } finally {
      setIsCheckingSlug(false);
    }
  };


  // 保存草稿
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/gallery/${post.id}/seo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seoSlug,
          seoTitle,
          h1Title, // 🆕 独立 H1
          seoDescription,
          seoKeywords,
          seoSlugKeywords,
          contentIntro,
          promptBreakdown,
          imageAlt,
          dynamicHeaders,
          faqItems,
          useCases,
          visualTags,
          remixIdeas, // 🆕 V12.0
          relatedConcepts, // 🆕 V12.0
          contentSections: blocks.length > 0 ? blocks : null, // 🆕 V14.0 - Use blocks state
          anchor, // 🆕 V14.0
          microFocus, // 🆕 V14.0
          relatedPosts: '[]',
        }),
      });

      if (!response.ok) throw new Error('Save failed');

      toast.success('💾 保存成功！');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 保存并审核通过 (包含缩略图生成)
  const handleSaveAndApprove = async () => {
    setIsSaving(true);
    
    try {
      // Step 1: Generate and upload thumbnail (if not already exists)
      let thumbnailUrl = (post as any).thumbnailUrl;
      
      if (!thumbnailUrl && post.imageUrl) {
        console.log('[Approve] Generating thumbnail...');
        toast.info('🖼️ Generating thumbnail...');
        
        try {
          const { generateAndUploadThumbnail } = await import('@/shared/lib/thumbnail-generator');
          thumbnailUrl = await generateAndUploadThumbnail({
            imageUrl: post.imageUrl,
            seoSlug: seoSlug || undefined,
          });
          console.log('[Approve] Thumbnail uploaded:', thumbnailUrl);
        } catch (thumbError) {
          console.error('[Approve] Thumbnail generation failed:', thumbError);
          // Continue without thumbnail - not blocking
        }
      }
      
      // Step 2: Save SEO data with thumbnailUrl
      const response = await fetch(`/api/admin/gallery/${post.id}/seo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seoSlug,
          seoTitle,
          h1Title,
          seoDescription,
          seoKeywords,
          seoSlugKeywords,
          contentIntro,
          promptBreakdown,
          imageAlt,
          dynamicHeaders,
          faqItems,
          useCases,
          visualTags,
          remixIdeas,
          relatedConcepts,
          contentSections: blocks.length > 0 ? blocks : null, // 🆕 V14.0 - Use blocks state
          anchor, // 🆕 V14.0
          microFocus, // 🆕 V14.0
          relatedPosts: '[]',
          thumbnailUrl, // 🆕 Include thumbnail URL
        }),
      });

      if (!response.ok) throw new Error('Save failed');
      
      // Step 3: Approve the post
      const approveResponse = await fetch(`/api/admin/gallery/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!approveResponse.ok) throw new Error('Approve failed');

      toast.success('✅ 审核通过并发布！' + (thumbnailUrl ? ' (缩略图已生成)' : ''));
      router.push('/admin/gallery');
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('审核失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
      
      {/* LEFT COLUMN: Source (Reference) */}
      <div className="lg:col-span-5 space-y-6 h-fit lg:sticky lg:top-6">
        
        {/* 1. Image & Prompt Card */}
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="relative aspect-square max-h-[400px] bg-muted/30 flex items-center justify-center p-2">
            <Image
              src={post.imageUrl}
              alt="Preview"
              fill
              className="object-contain"
            />
            <Badge variant="secondary" className="absolute top-3 left-3 bg-background/80 backdrop-blur shadow-sm">
              {getModelDisplayName(post.model)}
            </Badge>
          </div>

          <div className="p-4 border-t bg-muted/10 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase font-bold">Original Prompt</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => {
                  const params = post.params ? JSON.parse(post.params) : null;
                  const copyData = {
                    prompt: post.prompt,
                    model: post.model,
                    aspectRatio: post.aspectRatio,
                    ...(params || {}),
                  };
                  navigator.clipboard.writeText(JSON.stringify(copyData, null, 2));
                  toast.success('📋 VisionLogic 数据已复制！');
                }}
              >
                <Copy className="h-3 w-3" />
                Copy All
              </Button>
            </div>
            <Textarea
              value={post.prompt}
              readOnly
              className="min-h-[100px] resize-y text-sm bg-background/50 focus-visible:ring-0 border-transparent shadow-none p-0 cursor-text"
            />
          </div>
        </Card>

        {/* 2. Optimization Context */}
        {aiTask?.optimizationData && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Optimization Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* Reference Case */}
              {aiTask.optimizationData.referenceCaseUsed && (
                <div className="bg-white/60 p-3 rounded border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-blue-800 text-xs uppercase">Ref Case</span>
                    <span className="font-medium truncate">{aiTask.optimizationData.referenceCaseUsed.title}</span>
                  </div>
                  {aiTask.optimizationData.referenceCaseUsed.relevanceReason && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {aiTask.optimizationData.referenceCaseUsed.relevanceReason}
                    </p>
                  )}
                </div>
              )}

              {/* Enhancement Logic */}
              {aiTask.optimizationData.enhancementLogic && (
                <div>
                  <span className="font-semibold text-blue-800 text-xs uppercase block mb-1">Logic</span>
                  <p className="text-muted-foreground text-xs leading-relaxed bg-white/60 p-2 rounded border border-blue-100">
                    {aiTask.optimizationData.enhancementLogic}
                  </p>
                </div>
              )}

              {/* Suggested Modifiers */}
              {aiTask.optimizationData.suggestedModifiers?.length > 0 && (
                <div>
                  <span className="font-semibold text-blue-800 text-xs uppercase block mb-2">Style Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiTask.optimizationData.suggestedModifiers.map((modifier: string, index: number) => (
                      <span key={index} className="px-2 py-0.5 bg-white border border-blue-100 rounded text-xs text-blue-700">
                        {modifier}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. VisionLogic Original Data (for Remix) */}
        {(() => {
          const params = post.params ? JSON.parse(post.params) : null;
          if (!params || params.version < 2) return null;

          return (
            <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-purple-900 dark:text-purple-300 flex items-center gap-2">
                  🎨 VisionLogic Data (Remix)
                </CardTitle>
                <CardDescription className="text-xs">
                  用户生成时的原始输入，用于社区 Remix 功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Original Input */}
                {params.originalInput && (
                  <div>
                    <span className="font-semibold text-purple-800 dark:text-purple-400 text-xs uppercase block mb-1">Original Input</span>
                    <p className="text-xs bg-white/60 dark:bg-black/20 p-2 rounded border border-purple-100 dark:border-purple-800">
                      {params.originalInput}
                    </p>
                  </div>
                )}

                {/* Model & Aspect Ratio */}
                <div className="flex gap-4">
                  {params.model && (
                    <div>
                      <span className="font-semibold text-purple-800 dark:text-purple-400 text-xs uppercase block mb-1">Model</span>
                      <Badge variant="outline" className="text-xs">{params.model}</Badge>
                    </div>
                  )}
                  {params.aspectRatio && (
                    <div>
                      <span className="font-semibold text-purple-800 dark:text-purple-400 text-xs uppercase block mb-1">Ratio</span>
                      <Badge variant="outline" className="text-xs">{params.aspectRatio}</Badge>
                    </div>
                  )}
                </div>

                {/* Form Values */}
                {params.formValues && Object.keys(params.formValues).length > 0 && (
                  <div>
                    <span className="font-semibold text-purple-800 dark:text-purple-400 text-xs uppercase block mb-2">Form Values</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(params.formValues).map(([key, value]) => (
                        <span key={key} className="px-2 py-0.5 bg-white dark:bg-black/30 border border-purple-100 dark:border-purple-800 rounded text-xs">
                          <span className="text-purple-600 dark:text-purple-400">{key}:</span>{' '}
                          <span className="text-foreground">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt Highlights */}
                {params.promptHighlights && params.promptHighlights.length > 0 && (
                  <div>
                    <span className="font-semibold text-purple-800 dark:text-purple-400 text-xs uppercase block mb-2">Prompt Highlights</span>
                    <div className="text-xs bg-white/60 dark:bg-black/20 p-2 rounded border border-purple-100 dark:border-purple-800 leading-relaxed">
                      {params.promptEnglish || params.promptNative}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {params.promptHighlights.map((h: any, i: number) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                          style={{
                            backgroundColor: h.color ? `${h.color}20` : '#8b5cf620',
                            color: h.color || '#8b5cf6',
                            border: `1px solid ${h.color || '#8b5cf6'}40`
                          }}
                        >
                          {h.text || h.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Language */}
                {params.detectedLang && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Language:</span>
                    <Badge variant="secondary" className="text-[10px]">{params.detectedLang}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* RIGHT COLUMN: Action (Editor) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Sticky Action Header */}
        <div className="sticky top-4 z-20 bg-background/95 backdrop-blur p-4 rounded-xl border shadow-sm flex justify-between items-center ring-1 ring-border/50">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              SEO Content
              <Badge variant="outline" className="font-normal text-xs">Editing</Badge>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportJson}
              size="sm"
              variant="ghost"
              className="gap-1.5"
              title="Export as JSON"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => { setJsonText(''); setShowJsonModal(true); }}
              size="sm"
              variant="ghost"
              className="gap-1.5"
              title="Import from JSON"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button
              onClick={handleAIGenerateAll}
              disabled={isGenerating}
              size="sm"
              variant="outline"
              className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Auto-Fill
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button onClick={handleSaveDraft} disabled={isSaving} size="sm" variant="ghost">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
            <Button onClick={handlePreview} size="sm" variant="ghost" className="gap-1.5" title="Preview SEO">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={handleSaveAndApprove} size="sm" className="gap-2">
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
        </div>

        {/* 1. Focus Keyword (The Seed) */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <Label className="text-primary font-bold flex items-center gap-2 mb-2">
              🎯 Focus Keyword
              <span className="text-xs font-normal text-muted-foreground">(Core Subject)</span>
            </Label>
            <div className="flex gap-2">
              <Input 
                value={coreSubject} 
                onChange={(e) => setCoreSubject(e.target.value)} 
                placeholder='e.g. "Realistic 3D Figurine"'
                className="bg-background"
              />
              <Button onClick={() => setCoreSubject('')} variant="ghost" size="icon" className="shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. SEO Metadata */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="SEO Title (for search engines)"
                />
              </div>
              {/* 🆕 独立 H1 输入框 */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="h1Title">H1 Title (Page Display)</Label>
                <Input
                  id="h1Title"
                  value={h1Title}
                  onChange={(e) => setH1Title(e.target.value)}
                  placeholder="H1 Title (shown on page, shorter & cleaner)"
                />
                <p className="text-xs text-muted-foreground">
                  This is the main heading users see on the page. Keep it clean without brand suffix.
                </p>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="seoSlug">Slug</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="seoSlug"
                      value={seoSlug}
                      onChange={(e) => {
                        setSeoSlug(e.target.value);
                        setSlugStatus('unchecked');
                      }}
                      className={slugStatus === 'available' ? 'border-green-500 pr-8' : slugStatus === 'taken' ? 'border-red-500 pr-8' : ''}
                    />
                    {slugStatus !== 'unchecked' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugStatus === 'available' ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" onClick={handleCheckSlug} disabled={isCheckingSlug || !seoSlug}>
                    Check
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seoDescription">Description</Label>
              <Textarea
                id="seoDescription"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                className="resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label htmlFor="seoKeywords">Keywords</Label>
                  <Input id="seoKeywords" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} />
               </div>
               <div className="space-y-2">
                  <Label htmlFor="seoSlugKeywords">Slug Keywords</Label>
                  <Input id="seoSlugKeywords" value={seoSlugKeywords} onChange={(e) => setSeoSlugKeywords(e.target.value)} />
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Alt - Moved from removed Legacy card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Image Alt Text</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="imageAlt">Alt Text (SEO-friendly description)</Label>
              <Input 
                id="imageAlt" 
                value={imageAlt} 
                onChange={(e) => setImageAlt(e.target.value)} 
                placeholder="Descriptive alt text for the image..."
              />
              <p className="text-xs text-muted-foreground">
                💡 Describe the image content for accessibility and SEO
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Content Sections Editor */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Content Sections</CardTitle>
            <CardDescription>Structured content for the page body</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Anchor & Micro-Focus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="anchor" className="flex items-center gap-2">
                  🎯 Anchor
                  <span className="text-xs text-muted-foreground">(Core Subject)</span>
                </Label>
                <Input 
                  id="anchor" 
                  value={anchor} 
                  onChange={(e) => setAnchor(e.target.value)}
                  placeholder="e.g. Cyberpunk Street Scene"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="microFocus" className="flex items-center gap-2">
                  🔬 Micro-Focus
                  <span className="text-xs text-muted-foreground">(Unique Angle)</span>
                </Label>
                <Input 
                  id="microFocus" 
                  value={microFocus} 
                  onChange={(e) => setMicroFocus(e.target.value)}
                  placeholder="e.g. Neon Reflection Physics"
                />
              </div>
            </div>
            
            {/* Content Sections - Visual Block Editor */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                📦 Content Sections
                <Badge variant="outline" className="text-xs">{blocks.length} blocks</Badge>
              </Label>
              
              {/* Block List */}
              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={index}
                    totalBlocks={blocks.length}
                    onUpdate={(updates) => updateBlock(index, updates)}
                    onDelete={() => deleteBlock(index)}
                    onMoveUp={() => moveBlockUp(index)}
                    onMoveDown={() => moveBlockDown(index)}
                  />
                ))}
                
                {blocks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="text-sm">No content sections yet.</p>
                    <p className="text-xs mt-1">Click "AI Auto-Fill" or add a block manually below.</p>
                  </div>
                )}
              </div>
              
              {/* Add New Block Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addNewBlock('rich-text')}
                  className="gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  Text
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addNewBlock('faq-accordion')}
                  className="gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  FAQ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addNewBlock('checklist')}
                  className="gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
      
      {/* JSON Import/Export Modal */}
      <Dialog open={showJsonModal} onOpenChange={setShowJsonModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📋 JSON Import / Export
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="粘贴 JSON 到此处以还原表单..."
              className="h-[400px] font-mono text-xs resize-none"
              spellCheck={false}
            />
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(jsonText);
                toast.success('📋 已复制到剪贴板！');
              }}
              disabled={!jsonText}
            >
              <Download className="h-4 w-4 mr-2" />
              复制 JSON
            </Button>
            <Button
              onClick={handleImportJson}
              disabled={!jsonText}
            >
              <Upload className="h-4 w-4 mr-2" />
              还原表单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
