import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { FadeIn } from '@/shared/components/ui/fade-in';
import { Section, Container } from '@/shared/components/ui/layout';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';
import type { FAQ as FaqType } from '@/shared/types/blocks/landing';

/**
 * FAQ component - Cyberpunk Style (v5.0)
 *
 * Features section gradient and center glow atmosphere.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 7, 8
 */
export function Faq({
  faq,
  className,
}: {
  faq: FaqType;
  className?: string;
}) {
  return (
    <Section
      id={faq.id}
      spacing="default"
      className={cn(faq.className, className, "py-24 relative overflow-hidden")}
    >
      {/* 8.1 Atmosphere: Center Glow with L3 slow animation */}
      <div className={cn(
        VS.atmosphere.glowCenter,
        "w-[500px] h-[300px] bg-blue-500/5 blur-[100px]",
        VS.motion.decorative.glowSlow
      )} />

      <Container className="max-w-4xl relative z-10">
        <FadeIn>
          <div className="text-center mb-16 space-y-4">
            {/* 7.1 Section Gradient: FAQ - Knowledge */}
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              <span className={VS.gradient.faq}>{faq.title}</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              {faq.description}
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Accordion type="single" collapsible className="space-y-4">
            {faq.items?.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`item-${idx}`}
                className={cn(
                  "border-none px-6 py-2",
                  VS.glass.base,
                  VS.glass.border,
                  "rounded-2xl transition-all duration-300 data-[state=open]:bg-glass-strong has-[data-state=open]:border-primary/30"
                )}
              >
                <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                  <div dangerouslySetInnerHTML={{ __html: item.answer ?? '' }} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </Container>
    </Section>
  );
}
