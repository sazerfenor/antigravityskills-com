'use client';

import React, { useRef, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/shared/lib/utils';
import { m } from 'framer-motion';
import { Section, Container } from '@/shared/components/ui/layout';
import { VS } from '@/shared/lib/design-tokens';
import { Testimonials as TestimonialsType } from '@/shared/types/blocks/landing';

// TODO: 自定义你的用户评价内容和头像
// 替换为你自己的用户评价数据
const REVIEWS = [
  {
    name: "AdMaster Pro",
    role: "Commercial Visuals",
    avatar: "/avatars/placeholder-1.webp", // TODO: 替换为你的头像路径
    content: "The AI prompt generator nailed the lighting logic without me guessing keywords. It's not just a generator; it's a creative director.",
    rating: 5,
    gradient: "from-orange-500 to-amber-500"
  },
  {
    name: "Sarah Vogue",
    role: "Virtual Fashion Blogger",
    avatar: "/avatars/placeholder-2.webp", // TODO: 替换为你的头像路径
    content: "Achieving ultimate photorealism in digital fashion used to be hit-or-miss. With this tool, the fabric textures and skin tones are consistent across every shot.",
    rating: 5,
    gradient: "from-pink-500 to-rose-500"
  },
  {
    name: "Dr. Linus Graph",
    role: "Data Viz Specialist",
    avatar: "/avatars/placeholder-3.webp", // TODO: 替换为你的头像路径
    content: "I turn complex data into clear infographics. The AI understands abstract logical structures better than any other model. It respects the hierarchy of information perfectly.",
    rating: 5,
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    name: "Render Foundry",
    role: "3D Product Studio",
    avatar: "/avatars/placeholder-4.webp", // TODO: 替换为你的头像路径
    content: "For commercial assets, 'close enough' isn't enough. The Logic Engine gives us precise control over studio lighting and material properties.",
    rating: 5,
    gradient: "from-emerald-500 to-teal-500"
  },
  {
    name: "void_walker",
    role: "Digital Surrealist",
    avatar: "/avatars/placeholder-5.webp", // TODO: 替换为你的头像路径
    content: "Exploring the boundaries of reality requires a tool that understands dream logic. This allows me to mine deep subconscious intent and translate it into visual surrealism.",
    rating: 5,
    gradient: "from-purple-500 to-indigo-500"
  }
];

/**
 * Testimonials component - Cyberpunk Style (v5.0)
 *
 * Features section gradient and noise overlay atmosphere.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 7, 8, 9
 */
export function Testimonials({
  testimonials,
  className,
}: {
  testimonials: TestimonialsType;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Mouse Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <Section
      id={testimonials.id}
      spacing="default"
      className={cn("relative overflow-hidden", testimonials.className, className)}
    >
       {/* 8.1 Atmosphere: Center Glow with L3 slow animation */}
       <div className={cn(
         VS.atmosphere.glowCenter,
         "w-[600px] h-[300px] bg-rose-500/5 blur-[100px]",
         VS.motion.decorative.glowSlow
       )} />

      <Container className="relative z-10">
        <div className="mb-12 px-2 text-center md:text-left text-balance">
            {/* 7.1 Section Gradient: Testimonials - Trust */}
            <h2 className="text-3xl font-bold mb-4 tracking-tight md:text-5xl">
              Community <span className={VS.gradient.testimonials}>Feedback</span>
            </h2>
            {/* TODO: 自定义你的描述文案 */}
            <p className="text-muted-foreground text-lg">
              {testimonials.description || 'Top creators powering their workflow with our AI tools.'}
            </p>
        </div>

        {/* Scroll Container */}
        <div
            ref={scrollRef}
            className={cn(
                "flex gap-6 overflow-x-auto pb-12 pt-4 px-4 -mx-4 md:mx-0 md:px-0 scrollbar-hide cursor-grab active:cursor-grabbing",
                "snap-x snap-mandatory"
            )}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
           {REVIEWS.map((review, idx) => (
             <m.div
                key={idx}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                    // 9.2 Use min-h instead of fixed h
                    "min-w-[300px] md:min-w-[360px] snap-center relative p-8 rounded-2xl",
                    VS.glass.base,
                    VS.glass.border,
                    "backdrop-blur-md",
                    "flex flex-col transition-all duration-300 group hover:border-primary/30 hover:bg-glass-strong",
                    expandedIndex === idx ? "h-auto" : "min-h-[280px]"
                )}
                onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
             >
                {/* Quote Icon Decoration */}
                <Quote className="absolute top-6 right-6 w-8 h-8 text-white/5 group-hover:text-primary/10 transition-colors" />

                <div className="flex gap-1 mb-4 text-primary">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <div className="relative flex-1 mb-6">
                    <p className={cn(
                        "text-lg text-foreground leading-relaxed transition-all duration-300",
                        expandedIndex === idx ? "" : "line-clamp-4"
                    )}>
                      "{review.content}"
                    </p>
                </div>

                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5 select-none">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${review.gradient} shadow-lg relative overflow-hidden shrink-0`}>
                     <Image
                        src={review.avatar}
                        alt={review.name}
                        fill
                        className="object-cover"
                     />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{review.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{review.role}</div>
                  </div>
                </div>
             </m.div>
           ))}
        </div>
      </Container>
    </Section>
  );
}
