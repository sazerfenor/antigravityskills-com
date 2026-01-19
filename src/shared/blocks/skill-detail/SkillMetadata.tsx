'use client';

/**
 * SkillMetadata - Sidebar metadata card
 *
 * Shows: Author, Version, License, Category, Tags, etc.
 */

import Link from 'next/link';
import { User, Calendar, Tag, Folder, FileCode, Package } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import type { CommunityPost } from '@/shared/models/community_post';

interface SkillMetadataProps {
  skill: CommunityPost;
  tags: string[];
}

export function SkillMetadata({ skill, tags }: SkillMetadataProps) {
  // Format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get author name
  const authorName = skill.user?.name || 'Skill Bot';

  // Get category display name
  const getCategoryDisplay = (cat: string | null) => {
    if (!cat) return 'Tools';
    return cat
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="sticky top-4 space-y-6">
      {/* Quick Info Card */}
      <div className="rounded-xl border border-border-subtle bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Quick Info
        </h3>

        <div className="space-y-4">
          {/* Author */}
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">Author</div>
              <div className="text-sm font-medium">{authorName}</div>
            </div>
          </div>

          {/* Published Date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">Published</div>
              <div className="text-sm font-medium">
                {formatDate(skill.publishedAt || skill.createdAt)}
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="flex items-start gap-3">
            <Folder className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">Category</div>
              <div className="text-sm font-medium">
                {getCategoryDisplay(skill.category)}
              </div>
            </div>
          </div>

          {/* Version (placeholder) */}
          <div className="flex items-start gap-3">
            <FileCode className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">Version</div>
              <div className="text-sm font-medium">1.0.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Card */}
      {tags.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Table of Contents (placeholder for future) */}
      <div className="rounded-xl border border-border-subtle bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          On This Page
        </h3>
        <nav className="space-y-2 text-sm">
          <a href="#about" className="block text-muted-foreground hover:text-foreground transition-colors">
            About
          </a>
          <a href="#content" className="block text-muted-foreground hover:text-foreground transition-colors">
            Skill Content
          </a>
          <a href="#faq" className="block text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </a>
          <a href="#discussion" className="block text-muted-foreground hover:text-foreground transition-colors">
            Discussion
          </a>
        </nav>
      </div>
    </div>
  );
}
