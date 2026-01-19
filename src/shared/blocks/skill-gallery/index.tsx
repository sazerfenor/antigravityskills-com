'use client';

/**
 * SkillGallery - Grid gallery for Skills list page
 *
 * Design: Clean grid layout (not Masonry)
 * - Sidebar accordion filter on desktop
 * - 3 columns on desktop, 2 on tablet, 1 on mobile
 * - Sort dropdown
 * - Load more pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Loader2, Package, SlidersHorizontal } from 'lucide-react';

import { SkillCard, SkillCardData } from '@/shared/components/skill-card';
import { SkillFilterSidebar, MobileFilterButton } from '@/shared/components/skill-filter-sidebar';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';
import { getCategoryName } from '@/config/skill-categories';

// ==================== Types ====================

export interface InitialSkillGalleryData {
  skills: SkillCardData[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

export interface SkillGalleryProps {
  initialData?: InitialSkillGalleryData;
  category?: string;
  sort?: 'newest' | 'popular' | 'downloads';
}

// ==================== Constants ====================

const LIMIT = 12;

// ==================== Animation ====================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

// ==================== Component ====================

export function SkillGallery({
  initialData,
  category,
  sort = 'newest',
}: SkillGalleryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [skills, setSkills] = useState<SkillCardData[]>(initialData?.skills || []);
  const [page, setPage] = useState(initialData?.pagination.page || 1);
  const [totalPages, setTotalPages] = useState(initialData?.pagination.totalPages || 1);
  const [loading, setLoading] = useState(!initialData);
  const [loadingMore, setLoadingMore] = useState(false);

  // Track initial SSR values to detect URL param changes
  const [initialCategory] = useState(category);
  const [initialSort] = useState(sort);

  // Current filter values from URL
  const currentCategory = searchParams.get('category') || category || 'all';
  const currentSort = (searchParams.get('sort') as typeof sort) || sort;

  // ==================== Data Fetching ====================

  const fetchSkills = useCallback(
    async (pageNum: number, append: boolean = false) => {
      try {
        const params = new URLSearchParams({
          sort: currentSort,
          page: String(pageNum),
          limit: String(LIMIT),
        });

        // Filter by category (Skills typically have imageUrl as placeholder)
        // We'll filter on the server side if possible, or client-side
        if (currentCategory && currentCategory !== 'all') {
          params.append('category', currentCategory);
        }

        const resp = await fetch(`/api/skills?${params}`);
        if (!resp.ok) throw new Error('Failed to fetch skills');

        const { data }: any = await resp.json();

        // Transform skills to SkillCardData (API already returns proper format)
        const transformedSkills: SkillCardData[] = (data.skills || []).map((skill: any) => ({
          id: skill.id,
          title: skill.title || 'Untitled Skill',
          seoSlug: skill.seoSlug || skill.id,
          seoDescription: skill.seoDescription,
          visualTags: skill.visualTags || [],
          downloadCount: skill.downloadCount || 0,
          likeCount: skill.likeCount || 0,
          skillIcon: skill.skillIcon,
          createdAt: skill.createdAt,
        }));

        if (append) {
          setSkills((prev) => [...prev, ...transformedSkills]);
        } else {
          setSkills(transformedSkills);
        }

        setTotalPages(data.pagination?.totalPages || 1);
        return transformedSkills.length > 0;
      } catch (error) {
        console.error('Failed to fetch skills:', error);
        return false;
      }
    },
    [currentSort, currentCategory]
  );

  // Refetch when URL params change (even with SSR data)
  useEffect(() => {
    // Skip initial render if SSR data matches current params
    const categoryChanged = currentCategory !== (initialCategory || 'all');
    const sortChanged = currentSort !== initialSort;

    if (!categoryChanged && !sortChanged && initialData) {
      return; // Use SSR data for initial render
    }

    setLoading(true);
    setPage(1);
    fetchSkills(1, false).finally(() => setLoading(false));
  }, [currentSort, currentCategory, fetchSkills, initialData, initialCategory, initialSort]);

  // ==================== Filter Handlers ====================

  const handleCategoryChange = (newCategory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCategory === 'all') {
      params.delete('category');
    } else {
      params.set('category', newCategory);
    }
    // 切换主分类时清除子分类
    params.delete('subcategory');
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const handleSubcategoryChange = (newSubcategory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSubcategory) {
      params.set('subcategory', newSubcategory);
    } else {
      params.delete('subcategory');
    }
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const handleLoadMore = async () => {
    if (page >= totalPages || loadingMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    const hasMore = await fetchSkills(nextPage, true);
    if (hasMore) {
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  // ==================== Loading State ====================

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Filters skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-9 w-24 animate-pulse rounded-full bg-muted/40"
              />
            ))}
          </div>
          <div className="h-10 w-[140px] animate-pulse rounded-lg bg-muted/40" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[200px] animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      </div>
    );
  }

  // ==================== Render ====================

  // Get display name for current filter
  const currentFilterLabel = currentCategory === 'all'
    ? 'All Skills'
    : getCategoryName(currentCategory) || currentCategory;

  return (
    <div className="flex gap-8">
      {/* Sidebar Filter - Desktop */}
      <SkillFilterSidebar
        selectedCategory={currentCategory}
        selectedSubcategory={searchParams.get('subcategory') || undefined}
        onCategoryChange={handleCategoryChange}
        onSubcategoryChange={handleSubcategoryChange}
      />

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Top Bar: Mobile Filter + Current Filter + Sort */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <MobileFilterButton
              onClick={() => {/* TODO: Open mobile drawer */}}
              activeCount={currentCategory !== 'all' ? 1 : 0}
            />

            {/* Current Filter Display */}
            {currentCategory !== 'all' && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Showing:</span>
                <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                  {currentFilterLabel}
                </span>
                <button
                  onClick={() => handleCategoryChange('all')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕ Clear
                </button>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <Select value={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="downloads">Downloads</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty State */}
        {skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              No skills found. Be the first to share!
            </p>
          </div>
        ) : (
          <>
            {/* Skills Grid */}
            <m.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
            >
              {skills.map((skill, index) => (
                <SkillCard key={skill.id} skill={skill} index={index} />
              ))}
            </m.div>

            {/* Load More Button */}
            {page < totalPages && (
              <div className="flex justify-center pt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="min-w-[200px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${page}/${totalPages})`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==================== Helpers ====================

function parseJsonField(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Export loading component
export function SkillGalleryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 w-24 animate-pulse rounded-full bg-muted/40"
            />
          ))}
        </div>
        <div className="h-10 w-[140px] animate-pulse rounded-lg bg-muted/40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[200px] animate-pulse rounded-xl bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
