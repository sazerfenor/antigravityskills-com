'use client';

import React, { useRef, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/shared/lib/utils';
import { m } from 'framer-motion';
import { Section, Container } from '@/shared/components/ui/layout';
import { VS } from '@/shared/lib/design-tokens';
import { Testimonials as TestimonialsType } from '@/shared/types/blocks/landing';

// Gradient colors for avatars (cycle through)
const AVATAR_GRADIENTS = [
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-purple-500 to-indigo-500"
];

/**
 * Testimonials component - Cyberpunk Style (v5.0)
 *
 * SEO-optimized: Uses JSON config for title, description and items
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

  // Use items from JSON config
  const items = testimonials.items || [];

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
            {/* SEO: Use title from JSON config for brand keyword inclusion */}
            <h2 className="text-3xl font-bold mb-4 tracking-tight md:text-5xl">
              <span className={VS.gradient.testimonials}>{testimonials.title}</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              {testimonials.description}
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
           {items.map((item, idx) => {
             const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
             return (
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
                    {[...Array(item.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>

                  <div className="relative flex-1 mb-6">
                      <p className={cn(
                          "text-lg text-foreground leading-relaxed transition-all duration-300",
                          expandedIndex === idx ? "" : "line-clamp-4"
                      )}>
                        "{item.quote}"
                      </p>
                  </div>

                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5 select-none">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} shadow-lg relative overflow-hidden shrink-0`}>
                       {item.image?.src && (
                         <Image
                            src={item.image.src}
                            alt={item.image.alt || item.name || ''}
                            fill
                            className="object-cover"
                         />
                       )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.role}</div>
                    </div>
                  </div>
               </m.div>
             );
           })}
        </div>
      </Container>
    </Section>
  );
}
