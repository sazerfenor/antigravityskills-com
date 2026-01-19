'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, Heart, Download, Share2, ZoomIn } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { SidebarTextSection } from '@/shared/components/post-detail/sidebar-text-section';
import { SidebarAttributeSection } from '@/shared/components/post-detail/sidebar-attribute-section';
import { SidebarFAQ } from '@/shared/components/post-detail/sidebar-faq';
import { SidebarUseCases } from '@/shared/components/post-detail/sidebar-use-cases';
import { PostLayout } from '@/shared/components/post-detail/post-layout';
import { RemixLauncher } from '@/shared/components/remix-launcher';
import { DynamicRenderer } from '@/shared/components/post-detail/dynamic-renderer';
import { CreationRecipe } from '@/shared/components/post-detail/creation-recipe'; // V15.0
import { SnippetPackage } from '@/shared/components/post-detail/snippet-package'; // V15.0 GEO
import { VisualAnchors } from '@/shared/components/post-detail/visual-anchors'; // V15.0 F7
import { ImagePreviewDialog } from '@/shared/blocks/vision-logic/components/ImagePreviewDialog'; // Lightbox
import { getContentSections, hasNativeContentSections } from '@/shared/lib/content-sections-converter'; // V14.0
import { CommentSection } from '@/shared/components/post-detail/comment-section';
import { ShareDialog } from '@/shared/components/share-dialog';
import { useAppContext } from '@/shared/contexts/app';
import { toast } from 'sonner';
import type { CommunityPost } from '@/shared/models/community_post';

interface PromptDetailProps {
  post: CommunityPost;
}

/**
 * PromptDetail - Reusable client component for rendering prompt/image detail pages
 * Used by /prompts/[slug] route
 */
export function PromptDetail({ post }: PromptDetailProps) {
  // Parse JSON fields safely
  const parseDynamicHeaders = () => {
    if (!post.dynamicHeaders) return {};
    try {
      return typeof post.dynamicHeaders === 'string' 
        ? JSON.parse(post.dynamicHeaders) 
        : post.dynamicHeaders;
    } catch { return {}; }
  };

  const parseArray = (field: string | null | undefined) => {
    if (!field) return [];
    try {
      const parsed = typeof field === 'string' ? JSON.parse(field) : field;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };

  const dynamicHeaders = parseDynamicHeaders();
  const visualTags = parseArray(post.visualTags);
  const faqItems = parseArray(post.faqItems);
  const useCases = parseArray(post.useCases);

  // V15.0: 解析 post.params 获取 formValues 用于 CreationRecipe
  const parseFormValuesData = () => {
    if (!(post as any).params) return null;
    try {
      const params = typeof (post as any).params === 'string'
        ? JSON.parse((post as any).params)
        : (post as any).params;
      if (params?.formValues && Object.keys(params.formValues).length > 0) {
        return {
          formValues: params.formValues,
          schema: params.schema || null,
        };
      }
      return null;
    } catch {
      return null;
    }
  };
  const formValuesData = parseFormValuesData();

  // V15.0 F7: 解析 post.params 获取 promptHighlights 用于 VisualAnchors
  const parsePromptHighlights = () => {
    if (!(post as any).params) return null;
    try {
      const params = typeof (post as any).params === 'string'
        ? JSON.parse((post as any).params)
        : (post as any).params;
      // 优先使用 native 高亮数据
      if (params?.promptHighlights?.native && Array.isArray(params.promptHighlights.native) && params.promptHighlights.native.length > 0) {
        return params.promptHighlights.native;
      }
      // Fallback to english
      if (params?.promptHighlights?.english && Array.isArray(params.promptHighlights.english) && params.promptHighlights.english.length > 0) {
        return params.promptHighlights.english;
      }
      return null;
    } catch {
      return null;
    }
  };
  const promptHighlights = parsePromptHighlights();

  // V14.0: Get contentSections using centralized converter utility
  // Priority: Native V14 contentSections > Converted from legacy fields
  const contentSections = getContentSections(post);
  const hasV14Content = contentSections.length > 0;

  // Image preview state for Lightbox
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Model display name
  // TODO: 自定义你的模型显示名称
  const modelName = post.model?.includes('gemini')
    ? post.model.includes('3-pro') ? 'Pro' : 'Standard'
    : post.model?.includes('flux') ? 'FLUX' : 'AI';

  // Sidebar Content - 完整版：包含所有交互和内容组件
  const SidebarContent = (
    <>
      {/* 1. Author Card - Glass 样式升级 */}
      <div className="rounded-xl bg-glass-subtle backdrop-blur-md border border-border-medium p-4 hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden ring-2 ring-primary/10">
            {post.user?.image ? (
              <Image src={post.user.image} alt={`${post.user.name || 'Creator'}'s avatar`} width={40} height={40} className="object-cover" />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          <div>
            <Link href={`/user/${post.userId}`} className="font-medium hover:text-primary transition-colors">
              {post.user?.name || 'Anonymous'}
            </Link>
            <p className="text-xs text-muted-foreground">
              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Just now'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Stats Bar - Interactive */}
      <StatsBar post={post} />

      {/* 3. Remix Launcher - Smart Remix Access */}
      <RemixLauncher
        postId={post.id}
        prompt={post.prompt || ''}
        model={post.model || undefined}
        aspectRatio={post.aspectRatio || undefined}
      />

      {/* V15.0 F7: Visual Anchors - 展示 Prompt 高亮片段 */}
      {promptHighlights && promptHighlights.length > 0 && (
        <VisualAnchors highlights={promptHighlights} />
      )}

      {/* V15.0: Creation Recipe - 展示用户配置的生成参数 */}
      {formValuesData && (
        <CreationRecipe
          params={formValuesData}
          enableLinks={false} // F5 上线后改为 true
        />
      )}

      {/* V14.0: Dynamic Content Sections - 保持在侧边栏 */}
      {hasV14Content && (
        <DynamicRenderer
          sections={contentSections}
          className="space-y-4"
        />
      )}

      {/* Legacy Fallback: FAQ Section (only if no V14 content) */}
      {!hasV14Content && faqItems.length > 0 && (
        <SidebarFAQ
          title={dynamicHeaders?.faq || "FAQ & Tips"}
          items={faqItems}
        />
      )}

      {/* Key Elements (Visual Tags) - Legacy fallback only */}
      {!hasV14Content && visualTags.length > 0 && (
        <SidebarAttributeSection
          title={dynamicHeaders?.elements || "Key Elements"}
          items={visualTags.slice(0, 8)}
        />
      )}

      {/* About Section (SEO Intro) */}
      {post.contentIntro && (
        <SidebarTextSection
          title={dynamicHeaders?.about || `About ${modelName}`}
          content={post.contentIntro}
        />
      )}

      {/* Use Cases */}
      {useCases.length > 0 && (
        <SidebarUseCases
          title="Use Cases"
          items={useCases}
        />
      )}

      {/* Generation Data - 精简版 */}
      <div className="rounded-xl bg-glass-subtle backdrop-blur-md border border-border-medium p-4 space-y-2 hover:border-primary/30 transition-colors">
        <h2 className="text-sm font-semibold text-foreground">Generation Data</h2>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Model</span>
            <span className="font-mono text-primary/80">{modelName}</span>
          </div>
          {post.aspectRatio && (
            <div className="flex justify-between">
              <span>Aspect Ratio</span>
              <span className="font-mono text-primary/80">{post.aspectRatio}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Status</span>
            <Badge variant="outline" className="text-[10px]">{post.status}</Badge>
          </div>
        </div>
      </div>
    </>
  );

  // H1 Title
  const h1Title = (post as any).h1Title || post.seoTitle || post.prompt?.slice(0, 60) || 'AI Generated Image';

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <main className="container pt-20 pb-6 max-w-[1800px] relative">
        {/* Atmosphere glow - breaks the dark void */}
        <div className="absolute -z-10 top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground pl-2" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link href="/prompts" className="hover:text-primary">Prompts</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[300px]">{h1Title}</span>
        </nav>

        <article>
          <PostLayout sidebar={SidebarContent}>
            {/* Main Image - Clickable for Lightbox */}
            <div className="bg-glass-subtle rounded-xl border border-border-subtle overflow-hidden relative group flex items-start justify-center">
              <div className="relative w-full h-auto max-h-[90vh] flex items-start justify-center p-2 lg:p-4">
                <figure
                  className="relative inline-block shadow-2xl shadow-black/80 rounded-lg overflow-hidden cursor-zoom-in"
                  onClick={() => post.imageUrl && setPreviewImageUrl(post.imageUrl)}
                >
                  <Image
                    src={post.imageUrl || '/placeholder.jpg'}
                    alt={post.imageAlt || post.prompt || 'AI generated image'}
                    width={1024}
                    height={1024}
                    className="w-auto h-auto max-h-[85vh] max-w-full object-contain"
                    priority
                    quality={75}
                  />
                  <figcaption className="sr-only">{post.prompt || 'AI generated artwork'}</figcaption>
                  {/* Zoom hint overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-3 shadow-lg">
                      <ZoomIn className="w-6 h-6 text-foreground" />
                    </div>
                  </div>
                </figure>
              </div>
            </div>

          {/* Image Preview Lightbox */}
          <ImagePreviewDialog
            imageUrl={previewImageUrl}
            onClose={() => setPreviewImageUrl(null)}
          />
          
          {/* H1 Page Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-6 mb-4 px-2">
            {h1Title}
          </h1>

          {/* V15.0 GEO: Snippet Package Summary */}
          {(post as any).snippetSummary && (
            <div className="mt-6 px-2">
              <SnippetPackage summary={(post as any).snippetSummary} />
            </div>
          )}

          {/* Prompt Breakdown */}
          {post.promptBreakdown && (
            <div className="mt-6 px-2">
              <h2 className="text-lg font-semibold mb-3">{dynamicHeaders?.breakdown || 'Prompt Breakdown'}</h2>
              <div className="prose prose-invert max-w-none text-muted-foreground">
                {post.promptBreakdown}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="mt-10 px-2">
            <CommentSection postId={post.id} />
          </div>
        </PostLayout>
        </article>
      </main>
    </div>
  );
}

/**
 * Interactive Stats Bar Component
 * - Views: Static display
 * - Like: Toggle with /api/community/posts/[id]/reaction
 * - Download: Track with /api/community/posts/[id]/download
 * - Share: Open ShareDialog
 */
function StatsBar({ post }: { post: CommunityPost }) {
  const { user, setIsShowSignModal } = useAppContext();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [viewCount, setViewCount] = useState(post.viewCount || 0);
  const [downloadCount, setDownloadCount] = useState((post as any).downloadCount || 0);
  const [shareOpen, setShareOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Track page view on mount
  useEffect(() => {
    const trackView = async () => {
      try {
        const res = await fetch(`/api/community/posts/${post.id}/view`, { method: 'POST' });
        const data = await res.json() as any;
        if (data.code === 0 && data.data.counted) {
          setViewCount(prev => prev + 1);
        }
      } catch (e) {
        // Ignore view tracking errors
      }
    };
    trackView();
  }, [post.id]);

  // Check if user has liked this post on mount
  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const res = await fetch(`/api/community/posts/${post.id}/reaction`);
        const data = await res.json() as any;
        if (data.code === 0 && data.data.userReactions?.includes('like')) {
          setLiked(true);
        }
      } catch (e) {
        // Ignore - user might not be logged in
      }
    };
    checkLikeStatus();
  }, [post.id]);

  const handleLike = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'like' }),
      });
      const data = await res.json() as any;
      if (data.code === 0) {
        setLiked(data.data.isCreated);
        setLikeCount(prev => prev + (data.data.isCreated ? 1 : -1));
      }
    } catch (e) {
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }
    
    // Track download
    try {
      await fetch(`/api/community/posts/${post.id}/download`, { method: 'POST' });
      setDownloadCount((prev: number) => prev + 1);
    } catch (e) {
      // Ignore tracking errors
    }
    
    // Trigger actual download
    // 判断是否为 Skill 类 Post（使用占位图或 category 以 skill 开头）
    const isSkillPost = post.imageUrl === '/images/skill-default.svg' ||
                        post.category?.startsWith('skill');

    if (isSkillPost) {
      // Skill 类 Post：必须有 ZIP
      if (post.zipUrl) {
        // 有完整 ZIP
        const link = document.createElement('a');
        link.href = post.zipUrl;
        const fileName = (post.title || 'skill').replace(/[^a-zA-Z0-9-_]/g, '-');
        link.download = `${fileName}.zip`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Skill package download started!');
      } else {
        // 无 ZIP → 报错
        console.error('[Download] No zipUrl for skill post:', { id: post.id, zipUrl: post.zipUrl });
        toast.error('Download not available. Please contact support.');
      }
    } else if (post.imageUrl) {
      const link = document.createElement('a');
      link.href = post.imageUrl;
      // TODO: 自定义你的下载文件名前缀
      link.download = `ai-prompts-${post.id}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    }
  };

  return (
    <>
      <div className="rounded-xl bg-glass-subtle border border-border-subtle p-3 flex justify-around">
        {/* Views - Tracked on mount */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">{viewCount}</span>
        </div>
        
        {/* Like - Interactive */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          aria-label={liked ? 'Unlike this prompt' : 'Like this prompt'}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
            liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">{likeCount}</span>
        </button>

        {/* Download - Interactive */}
        <button
          onClick={handleDownload}
          aria-label="Download image"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">{downloadCount}</span>
        </button>

        {/* Share - Interactive */}
        <button
          onClick={() => setShareOpen(true)}
          aria-label="Share this prompt"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>
      
      {/* Share Dialog */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        imageUrl={post.imageUrl || undefined}
        prompt={post.prompt || undefined}
      />
    </>
  );
}
