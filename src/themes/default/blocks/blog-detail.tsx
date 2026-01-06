'use client';

import { TOCItems, TOCProvider } from 'fumadocs-ui/components/layout/toc';
import { ArrowLeft, CalendarIcon, ListIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { MarkdownPreview } from '@/shared/blocks/common';
import { Section, Container } from '@/shared/components/ui/layout';
import { type Post as PostType } from '@/shared/types/blocks/blog';

export function BlogDetail({ post }: { post: PostType }) {
  const t = useTranslations('blog.page');

  // Check if TOC should be shown
  const showToc = post.toc && post.toc.length > 0;

  // Check if Author info should be shown
  const showAuthor = post.author_name || post.author_image;

  // Get cover image if available
  const coverImage = (post as any).image;

  return (
    <TOCProvider toc={post.toc || []}>
      <Section as="article" spacing="loose" id={post.id}>
        <Container size="default">
          {/* Background Glow Decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 blur-[100px] rounded-full" />
          </div>

          {/* Back Link */}
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 mb-8"
          >
            <ArrowLeft className="size-4" />
            <span>{t('crumb')}</span>
          </Link>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Table of Contents - Left Sidebar (Desktop) */}
            {showToc && (
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-24">
                  <div className="bg-card/40 backdrop-blur-xl border border-border-medium rounded-xl p-4">
                    <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
                      <ListIcon className="size-4 text-primary" />
                      {t('toc')}
                    </h2>
                    <nav className="text-sm">
                      <TOCItems />
                    </nav>
                  </div>
                </div>
              </aside>
            )}

            {/* Main Content - Center */}
            <div className={showToc ? 'lg:col-span-9' : 'lg:col-span-12'}>
              {/* Glass Paper Card */}
              <div className="relative bg-card/40 backdrop-blur-xl border border-border-medium rounded-2xl p-6 md:p-12 overflow-hidden">
                
                {/* Card Inner Glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                
                {/* Header Section */}
                <header className="relative mb-10">
                  {/* Title */}
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
                    {post.title}
                  </h1>

                  {/* Description */}
                  {post.description && (
                    <p className="text-lg text-muted-foreground mb-6 max-w-3xl">
                      {post.description}
                    </p>
                  )}

                  {/* Meta Row: Author & Date */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Author */}
                    {showAuthor && (
                      <div className="flex items-center gap-3">
                        {post.author_image && (
                          <Image
                            src={post.author_image}
                            alt={post.author_name || 'Author'}
                            width={40}
                            height={40}
                            className="rounded-full ring-2 ring-border-medium"
                          />
                        )}
                        <span className="text-sm text-muted-foreground font-medium">
                          {post.author_name}
                        </span>
                      </div>
                    )}

                    {/* Separator */}
                    {showAuthor && post.created_at && (
                      <span className="text-muted-foreground/50">•</span>
                    )}

                    {/* Date */}
                    {post.created_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="size-4" />
                        <time>{post.created_at}</time>
                      </div>
                    )}
                  </div>
                </header>

                {/* Cover Image */}
                {coverImage && (
                  <div className="relative mb-12">
                    <Image
                      src={coverImage}
                      alt={post.title || 'Cover image'}
                      width={1200}
                      height={630}
                      priority
                      className="w-full h-auto aspect-video object-cover rounded-xl border border-border-medium"
                    />
                  </div>
                )}

                {/* Article Content with Prose Styling */}
                <article className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-primary prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded-md prose-code:px-1 prose-img:rounded-xl">
                  {post.body ? (
                    post.body
                  ) : (
                    post.content && (
                      <MarkdownPreview content={post.content} />
                    )
                  )}
                </article>

                {/* Author Card (Bottom) */}
                {showAuthor && (
                  <div className="mt-12 pt-8 border-t border-border-medium">
                    <div className="flex items-center gap-4">
                      {post.author_image && (
                        <Image
                          src={post.author_image}
                          alt={post.author_name || 'Author'}
                          width={64}
                          height={64}
                          className="rounded-full ring-2 ring-border-medium"
                        />
                      )}
                      <div>
                        <p className="text-foreground font-semibold">
                          {post.author_name}
                        </p>
                        {post.author_role && (
                          <p className="text-sm text-muted-foreground">
                            {post.author_role}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </TOCProvider>
  );
}
