'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, Eye, Heart, Repeat2, Zap } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { SidebarTextSection } from '@/shared/components/post-detail/sidebar-text-section';
import { SidebarAttributeSection } from '@/shared/components/post-detail/sidebar-attribute-section';
import { SidebarFAQ } from '@/shared/components/post-detail/sidebar-faq';
import { SidebarUseCases } from '@/shared/components/post-detail/sidebar-use-cases';
import { PostLayout } from '@/shared/components/post-detail/post-layout';

interface PreviewData {
  id: string;
  prompt: string;
  imageUrl: string;
  model: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoSlug: string;
  contentIntro: string;
  promptBreakdown: string;
  dynamicHeaders: string;
  faqItems: string;
  visualTags: string;
  useCases: string;
  imageAlt: string;
  remixIdeas?: string; // 🆕 V12.0
  relatedConcepts?: string; // 🆕 V12.0
  userName?: string;
  userImage?: string;
}

/**
 * SEO Preview Page - For admin to preview SEO content before publishing
 * This page is blocked by robots.txt and has noindex meta
 * 
 * ⚠️ This page must stay in sync with image/[id]/page.tsx (Post page)
 */
export default function PreviewPage() {
  const params = useParams();
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read preview data from sessionStorage
    const key = `seo-preview-${params.id}`;
    const stored = sessionStorage.getItem(key);
    
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (e) {
        setError('Failed to parse preview data');
      }
    } else {
      setError('No preview data found. Please go back to admin and click Preview again.');
    }
  }, [params.id]);

  // Parse JSON fields safely
  const parseDynamicHeaders = () => {
    if (!data?.dynamicHeaders) return {};
    try {
      return typeof data.dynamicHeaders === 'string' 
        ? JSON.parse(data.dynamicHeaders) 
        : data.dynamicHeaders;
    } catch { return {}; }
  };

  const parseArray = (field: string | undefined) => {
    if (!field) return [];
    try {
      const parsed = typeof field === 'string' ? JSON.parse(field) : field;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card/60 border border-white/10 rounded-xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Preview Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.close()}>Close Window</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const dynamicHeaders = parseDynamicHeaders();
  const visualTags = parseArray(data.visualTags);
  const faqItems = parseArray(data.faqItems);
  const useCases = parseArray(data.useCases);
  const remixIdeas = parseArray(data.remixIdeas); // 🆕 V12.0

  // Model display name
  // TODO: 自定义你的模型名称
  const modelName = data.model?.includes('gemini')
    ? data.model.includes('3-pro') ? 'Pro' : 'Standard'
    : data.model?.includes('flux') ? 'FLUX' : 'AI';

  // ============================================================
  // SIDEBAR - Must match image/[id]/page.tsx exactly!
  // ============================================================
  const SidebarContent = (
    <>
      {/* 1. Author Card */}
      <div className="rounded-xl bg-glass-subtle border border-border-subtle p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {data.userImage ? (
              <Image src={data.userImage} alt="" width={40} height={40} className="object-cover" />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          <div>
            <p className="font-medium">{data.userName || 'Preview User'}</p>
            <p className="text-xs text-muted-foreground">Just now</p>
          </div>
        </div>
      </div>

      {/* 2. Stats Bar (Static Preview) */}
      <div className="rounded-xl bg-glass-subtle border border-border-subtle p-3 flex justify-around">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">0</span>
        </div>
        <div className="flex items-center gap-1.5 text-yellow-500">
          <Heart className="w-4 h-4" />
          <span className="text-sm font-medium">0</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Repeat2 className="w-4 h-4" />
          <span className="text-sm font-medium">0</span>
        </div>
      </div>

      {/* 3. Instant Generator (Disabled Preview) */}
      <div className="rounded-xl bg-glass-subtle border border-border-subtle p-4 space-y-3 opacity-60">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Zap className="w-4 h-4 text-primary" />
          Instant Generator
        </div>
        <Button disabled className="w-full bg-primary/50 text-black font-bold">
          ⚡ Generate Variation
        </Button>
        <p className="text-xs text-muted-foreground text-center">(Disabled in preview)</p>
      </div>

      {/* 4. FAQ Section */}
      {faqItems.length > 0 && (
        <SidebarFAQ 
          title={dynamicHeaders?.faq || "FAQ & Tips"}
          items={faqItems}
        />
      )}

      {/* 5. Key Elements (Visual Tags) */}
      {visualTags.length > 0 && (
        <SidebarAttributeSection 
          title={dynamicHeaders?.elements || "Key Elements"} 
          items={visualTags.slice(0, 8)} 
        />
      )}

      {/* 6. Ad Slot (Static Placeholder for Client Component) */}
      <div className="w-full aspect-[3/2] flex flex-col items-center justify-center bg-transparent border-2 border-dashed border-border-medium rounded-xl overflow-hidden">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Advertisement</span>
        <span className="text-[10px] text-muted-foreground/50">(Preview)</span>
      </div>

      {/* 7. About Section (SEO Intro) */}
      {data.contentIntro && (
        <SidebarTextSection 
          title={dynamicHeaders?.about || `About ${modelName}`} 
          content={data.contentIntro} 
        />
      )}

      {/* 8. Use Cases */}
      {useCases.length > 0 && (
        <SidebarUseCases 
          title="Use Cases"
          items={useCases}
        />
      )}

      {/* 🆕 9. Remix Ideas (V12.0) */}
      {remixIdeas.length > 0 && (
        <div className="rounded-xl bg-glass-subtle border border-border-subtle p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            🎨 Try Remixing This
          </h3>
          <ul className="space-y-2">
            {remixIdeas.map((idea: string, index: number) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 10. Generation Data (Static Preview) */}
      <div className="rounded-xl bg-glass-subtle border border-border-subtle p-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Generation Data</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Model</span>
            <span className="font-mono">{modelName}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <Badge variant="outline" className="text-[10px]">Preview</Badge>
          </div>
        </div>
      </div>

      {/* 11. Comments (Static Placeholder) */}
      <div className="rounded-xl bg-glass-subtle border border-border-subtle p-4 space-y-2 opacity-60">
        <h3 className="text-sm font-semibold text-foreground">Comments</h3>
        <p className="text-xs text-muted-foreground text-center py-4">
          (Comments are disabled in preview mode)
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Preview Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black py-2 px-4 text-center font-bold">
        ⚠️ PREVIEW MODE - This is how your page will look. SEO data shown below.
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-4 bg-black/20 hover:bg-black/30 text-black"
          onClick={() => window.close()}
        >
          Close Preview
        </Button>
      </div>

      <div className="min-h-screen bg-background text-foreground pb-12 pt-12">
        <div className="container pt-20 pb-6 max-w-[1800px]">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground pl-2">
            <span>Home</span>
            <span>/</span>
            <span>Prompts</span>
            <span>/</span>
            <span className="text-foreground truncate max-w-[300px]">{data.seoTitle || 'Preview'}</span>
          </div>

          <PostLayout sidebar={SidebarContent}>
            {/* Main Image */}
            <div className="bg-glass-subtle rounded-xl border border-border-subtle overflow-hidden relative group flex items-start justify-center">
              <div className="relative w-full h-auto max-h-[90vh] flex items-start justify-center p-2 lg:p-4">
                <div className="relative inline-block shadow-2xl shadow-black/80 rounded-lg overflow-hidden">
                  <Image
                    src={data.imageUrl || '/placeholder.jpg'}
                    alt={data.imageAlt || data.prompt || 'AI generated image'}
                    width={1024}
                    height={1024}
                    className="w-auto h-auto max-h-[85vh] max-w-full object-contain"
                    priority
                    quality={75}
                  />
                </div>
              </div>
            </div>
            
            {/* H1 Page Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-6 mb-4 px-2">
              {data.seoTitle || data.prompt?.slice(0, 60) || 'AI Generated Image'}
            </h1>
          </PostLayout>
        </div>
      </div>
    </>
  );
}
