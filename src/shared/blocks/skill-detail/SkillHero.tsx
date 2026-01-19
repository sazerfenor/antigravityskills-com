'use client';

/**
 * SkillHero - Hero section with title, description, and CTAs
 */

import { Download, Copy, Eye, Heart, FileDown } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import type { CommunityPost } from '@/shared/models/community_post';

interface SkillHeroProps {
  skill: CommunityPost;
  tags: string[];
  stats: {
    views: number;
    likes: number;
    downloads: number;
  };
  liked: boolean;
  onLike: () => void;
  onDownload: () => void;
  onCopyId: () => void;
}

export function SkillHero({
  skill,
  tags,
  stats,
  liked,
  onLike,
  onDownload,
  onCopyId,
}: SkillHeroProps) {
  // Extract h1Title or fallback to title
  const displayTitle = (skill as any).h1Title || skill.title;

  return (
    <div className="rounded-xl border border-border-subtle bg-card p-6 md:p-8">
      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        {displayTitle}
      </h1>

      {/* Description */}
      {skill.seoDescription && (
        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
          {skill.seoDescription}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.slice(0, 6).map((tag, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="text-xs font-medium"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Primary CTA */}
        <Button
          onClick={onDownload}
          className="gap-2"
          size="lg"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>

        {/* Secondary CTA */}
        <Button
          variant="outline"
          onClick={onCopyId}
          className="gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy Skill ID
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {/* Views */}
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>{stats.views}</span>
          </div>

          {/* Likes */}
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              liked ? 'text-red-500' : 'hover:text-red-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            <span>{stats.likes}</span>
          </button>

          {/* Downloads */}
          <div className="flex items-center gap-1.5">
            <FileDown className="w-4 h-4" />
            <span>{stats.downloads}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
