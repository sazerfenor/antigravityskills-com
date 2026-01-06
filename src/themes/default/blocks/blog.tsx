import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Calendar, Sparkles, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Container, Section } from '@/shared/components/ui/layout';
import { cn } from '@/shared/lib/utils';
import {
  Blog as BlogType,
  Category as CategoryType,
} from '@/shared/types/blocks/blog';
import { Tab } from '@/shared/types/blocks/common';

// ==================== Blog Category Tabs ====================

function BlogCategoryTabs({
  categories,
  currentCategory,
}: {
  categories: CategoryType[];
  currentCategory?: CategoryType;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {categories.map((category, idx) => {
        const isActive = currentCategory?.slug === category.slug;
        const href =
          !category.slug || category.slug === 'all'
            ? '/blog'
            : `/blog/category/${category.slug}`;

        return (
          <Link
            key={idx}
            href={href}
            className={cn(
              // Base: Floating Glass Capsule
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
              'border',
              // Inactive state
              !isActive && [
                'bg-transparent border-border/50 text-muted-foreground',
                'hover:text-foreground hover:border-primary/50 hover:bg-primary/5',
              ],
              // Active state: Neon Glow
              isActive && [
                'bg-primary/10 border-primary text-primary',
                'shadow-[0_0_15px_rgba(var(--color-primary),0.3)]',
              ]
            )}
          >
            {category.title}
          </Link>
        );
      })}
    </div>
  );
}

// ==================== Blog Card ====================

function BlogCard({
  post,
}: {
  post: {
    url?: string;
    target?: string;
    image?: string;
    title?: string;
    description?: string;
    created_at?: string;
    author_name?: string;
    author_image?: string;
  };
}) {
  return (
    <Link
      href={post.url || ''}
      target={post.target || '_self'}
      className="group block h-full"
    >
      <article
        className={cn(
          // Base: Glass Card with full height flex column
          'relative overflow-hidden rounded-2xl h-full flex flex-col',
          'border border-border/50 bg-card/40 backdrop-blur-sm',
          // Hover: Neon Glow Effect
          'hover:border-primary/50 hover:bg-primary/5',
          'transition-all duration-300'
        )}
      >
        {/* Image */}
        {post.image && (
          <div className="overflow-hidden flex-shrink-0">
            <img
              src={post.image}
              alt={post.title || ''}
              className={cn(
                'aspect-video w-full object-cover object-center',
                // Hover: Subtle zoom
                'group-hover:scale-105 transition-transform duration-500'
              )}
            />
          </div>
        )}

        {/* Content - Takes remaining space */}
        <div className="p-5 flex flex-col flex-1">
          {/* Title & Description - Growable area */}
          <div className="flex-1 space-y-3">
            {/* Title */}
            <h3
              className={cn(
                'text-xl font-semibold text-foreground',
                'group-hover:text-primary transition-colors duration-300',
                'line-clamp-2'
              )}
            >
              {post.title}
            </h3>

            {/* Excerpt */}
            {post.description && (
              <p className="text-muted-foreground text-sm line-clamp-3">
                {post.description}
              </p>
            )}
          </div>

          {/* Meta: Date & Author - Anchored to bottom */}
          <div className="flex items-center justify-between pt-4 mt-auto text-xs border-t border-border/30">
            {/* Date */}
            {post.created_at && (
              <div className="flex items-center gap-1.5 font-mono text-primary/80">
                <Calendar className="size-3.5" />
                {post.created_at}
              </div>
            )}

            {/* Author */}
            {(post.author_name || post.author_image) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                {post.author_image ? (
                  <Avatar className="size-5">
                    <AvatarImage
                      src={post.author_image}
                      alt={post.author_name || ''}
                      className="size-5 rounded-full"
                    />
                    <AvatarFallback className="size-5 text-[10px]">
                      {post.author_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <User className="size-3.5" />
                )}
                <span>{post.author_name}</span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

// ==================== Empty State ====================

function BlogEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 rounded-full bg-card/50 p-4">
        <Sparkles className="size-10 text-muted-foreground/30" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">No Signal</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

// ==================== Main Blog Component ====================

export function Blog({
  blog,
  className,
}: {
  blog: BlogType;
  className?: string;
}) {
  const t = useTranslations('blog.page');

  return (
    <Section spacing="loose" id={blog.id} className={cn('pt-24', blog.className, className)}>
      <Container>
        {/* Header */}
        <div className="mx-auto mb-12 text-center max-w-3xl">
          {blog.sr_only_title && (
            <h1 className="sr-only">{blog.sr_only_title}</h1>
          )}

          {/* Title with subtle glow pill */}
          <h2 className="mb-6 text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            {blog.title}
          </h2>

          {/* Subtitle */}
          {blog.description && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {blog.description}
            </p>
          )}
        </div>

        {/* Category Tabs: Floating Glass Capsules */}
        {blog.categories && blog.categories.length > 0 && (
          <div className="mb-10">
            <BlogCategoryTabs
              categories={blog.categories}
              currentCategory={blog.currentCategory}
            />
          </div>
        )}

        {/* Blog Grid */}
        {blog.posts && blog.posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blog.posts.map((post, idx) => (
              <BlogCard key={idx} post={post} />
            ))}
          </div>
        ) : (
          <BlogEmptyState message={t('no_content')} />
        )}
      </Container>
    </Section>
  );
}
