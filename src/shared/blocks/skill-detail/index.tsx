'use client';

/**
 * SkillDetail - Documentation-style detail page for Skills
 *
 * Design: Notion/Obsidian/GitBook inspired
 * - Clean Markdown rendering
 * - Sidebar with metadata and TOC
 * - FAQ accordion
 * - Discussion section
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Copy, Eye, Heart, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { CommentSection } from '@/shared/components/post-detail/comment-section';
import { SidebarFAQ } from '@/shared/components/post-detail/sidebar-faq';
import { useAppContext } from '@/shared/contexts/app';
import type { CommunityPost } from '@/shared/models/community_post';

import { SkillHero } from './SkillHero';
import { SkillContent } from './SkillContent';
import { SkillMetadata } from './SkillMetadata';
import { SkillQuickStart } from './SkillQuickStart';
import { SkillCapabilities } from './SkillCapabilities';
import { SkillExamples } from './SkillExamples';
import { SkillTriggers } from './SkillTriggers';
import { SkillPresets } from './SkillPresets';

interface SkillDetailProps {
  skill: CommunityPost;
}

export function SkillDetail({ skill }: SkillDetailProps) {
  const { user, isCheckSign } = useAppContext();
  const [viewCount, setViewCount] = useState(skill.viewCount || 0);
  const [likeCount, setLikeCount] = useState(skill.likeCount || 0);
  const [downloadCount, setDownloadCount] = useState(skill.downloadCount || 0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Track view on mount
  useEffect(() => {
    fetch(`/api/community/posts/${skill.id}/view`, { method: 'POST' })
      .then(() => setViewCount((prev) => prev + 1))
      .catch(() => {});
  }, [skill.id]);

  // Parse FAQ items
  const parseFaqItems = () => {
    if (!skill.faqItems) return [];
    try {
      const parsed = typeof skill.faqItems === 'string'
        ? JSON.parse(skill.faqItems)
        : skill.faqItems;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Parse visual tags
  const parseTags = () => {
    if (!skill.visualTags) return [];
    try {
      const parsed = typeof skill.visualTags === 'string'
        ? JSON.parse(skill.visualTags)
        : skill.visualTags;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Parse v19.0 enhanced fields
  const parseJsonField = <T,>(field: string | null | undefined): T | null => {
    if (!field) return null;
    try {
      return typeof field === 'string' ? JSON.parse(field) : field;
    } catch {
      return null;
    }
  };

  const faqItems = parseFaqItems();
  const tags = parseTags();

  // v19.0 Enhanced fields
  const quickStart = parseJsonField<{
    title: string;
    steps: string[];
    exampleCommand: string;
  }>((skill as any).quickStart);

  const capabilities = parseJsonField<Array<{
    icon: string;
    title: string;
    description: string;
  }>>((skill as any).capabilities);

  const usageExamples = parseJsonField<Array<{
    input: string;
    output: string;
    beforeAfter?: { before: string; after: string };
  }>>((skill as any).usageExamples);

  const triggerPhrases = parseJsonField<string[]>((skill as any).triggerPhrases);

  const presets = parseJsonField<Array<{
    name: string;
    colors: string[];
    fonts: { heading: string; body: string };
    bestFor: string;
  }>>((skill as any).presets);

  // Handle like
  const handleLike = async () => {
    if (isCheckSign) {
      toast.info('Loading, please wait...');
      return;
    }
    if (!user) {
      toast.error('Please sign in to like');
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      const res = await fetch(`/api/community/posts/${skill.id}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        setLiked(!liked);
        setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
      }
    } catch {
      toast.error('Failed to like');
    } finally {
      setIsLiking(false);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (isCheckSign) {
      toast.info('Loading, please wait...');
      return;
    }
    if (!user) {
      toast.error('Please sign in to download');
      return;
    }

    // Track download
    try {
      await fetch(`/api/community/posts/${skill.id}/download`, { method: 'POST' });
      setDownloadCount((prev) => prev + 1);
    } catch {}

    // Download logic - ZIP only, no fallback
    if (skill.zipUrl) {
      // Full ZIP from R2 - 直接下载，不开新窗口
      const link = document.createElement('a');
      link.href = skill.zipUrl;
      // 文件名格式: {SkillName}-Antigravityskills-com.zip
      const skillName = (skill.title || 'skill').replace(/[^a-zA-Z0-9-_]/g, '-');
      link.download = `${skillName}-Antigravityskills-com.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Skill package download started!');
    } else {
      // No ZIP available - show error
      console.error('[Download] No zipUrl available:', { id: skill.id, zipUrl: skill.zipUrl });
      toast.error('Download not available. Please contact support.');
    }
  };

  // Copy skill ID
  const handleCopyId = () => {
    const skillId = skill.title?.toLowerCase().replace(/\s+/g, '-') || skill.id;
    navigator.clipboard.writeText(skillId);
    toast.success('Skill ID copied!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-border-subtle bg-glass-subtle">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/skills" className="hover:text-foreground transition-colors">
              Skills
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {skill.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <SkillHero
          skill={skill}
          tags={tags}
          stats={{ views: viewCount, likes: likeCount, downloads: downloadCount }}
          liked={liked}
          onLike={handleLike}
          onDownload={handleDownload}
          onCopyId={handleCopyId}
        />

        {/* Two Column Layout */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* Left: Main Content */}
          <div className="space-y-8">
            {/* About Section */}
            {skill.contentIntro && (
              <section>
                <h2 className="text-lg font-semibold mb-3">About This Skill</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {skill.contentIntro}
                </p>
              </section>
            )}

            {/* Quick Start Section (v19.0) */}
            {quickStart && <SkillQuickStart data={quickStart} />}

            {/* Capabilities Section (v19.0) */}
            {capabilities && capabilities.length > 0 && (
              <SkillCapabilities capabilities={capabilities} />
            )}

            {/* Presets Section (v19.0) */}
            {presets && presets.length > 0 && <SkillPresets presets={presets} />}

            {/* Usage Examples Section (v19.0) */}
            {usageExamples && usageExamples.length > 0 && (
              <SkillExamples examples={usageExamples} />
            )}

            {/* Skill Content (Markdown) */}
            <SkillContent content={(skill as any).skillContent || skill.prompt} />

            {/* FAQ Section */}
            {faqItems.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
                <SidebarFAQ items={faqItems} />
              </section>
            )}

            {/* Discussion */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Discussion</h2>
              <CommentSection postId={skill.id} />
            </section>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            <SkillMetadata skill={skill} tags={tags} />

            {/* Trigger Phrases (v19.0) - in sidebar */}
            {triggerPhrases && triggerPhrases.length > 0 && (
              <SkillTriggers phrases={triggerPhrases} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
