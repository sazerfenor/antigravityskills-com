'use client';

import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';

import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { Section, Container } from '@/shared/components/ui/layout';
import { Features as FeaturesType } from '@/shared/types/blocks/landing';

export function FeaturesAccordion({
  features,
  className,
}: {
  features: FeaturesType;
  className?: string;
}) {
  const [activeItem, setActiveItem] = useState<string>('item-1');

  // Get the active item's details
  const activeFeature = features.items?.find(
    (_, idx) => `item-${idx + 1}` === activeItem
  );

  return (
    <Section spacing="default" className={`overflow-x-hidden ${className}`}>
      <div className="absolute inset-0 -z-10 bg-linear-to-b sm:inset-6 sm:rounded-b-3xl dark:block dark:to-[color-mix(in_oklab,var(--color-zinc-900)_75%,var(--color-background))]"></div>
      <Container className="space-y-8 overflow-x-hidden md:space-y-16 lg:space-y-20 dark:[--color-border:color-mix(in_oklab,var(--color-white)_10%,transparent)]">
        <ScrollAnimation>
          <div className="mx-auto max-w-4xl text-center text-balance">
            <h2 className="text-foreground mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
              {features.title}
            </h2>
            <p className="text-muted-foreground mb-6 md:mb-12 lg:mb-16">
              {features.description}
            </p>
          </div>
        </ScrollAnimation>

        <div className="grid min-w-0 gap-8 md:gap-12 sm:px-6 md:grid-cols-2 lg:gap-16 lg:px-0">
          {/* Left: Accordion List */}
          <ScrollAnimation delay={0.1} direction="left">
            <Accordion
              type="single"
              value={activeItem}
              onValueChange={(value) => setActiveItem(value as string)}
              className="w-full"
            >
              {features.items?.map((item, idx) => (
                <AccordionItem value={`item-${idx + 1}`} key={idx}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3 text-base font-medium">
                      {item.icon && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <SmartIcon name={item.icon as string} size={18} />
                        </span>
                      )}
                      {item.title}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pl-11">
                    {item.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollAnimation>

          {/* Right: Detailed Explanation Panel */}
          <ScrollAnimation delay={0.2} direction="right">
            <div className="relative rounded-2xl border bg-card/50 backdrop-blur-sm p-8 min-h-[300px]">
              <AnimatePresence mode="wait">
                <m.div
                  key={activeItem}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Feature Title */}
                  <div className="flex items-center gap-3">
                    {activeFeature?.icon && (
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <SmartIcon name={activeFeature.icon as string} size={22} />
                      </span>
                    )}
                    <h3 className="text-xl font-semibold text-foreground">
                      {activeFeature?.title}
                    </h3>
                  </div>

                  {/* Detailed Description */}
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>{activeFeature?.description}</p>

                    {/* Extended details if available */}
                    {activeFeature?.details && (
                      <div className="mt-4 space-y-3">
                        {(activeFeature.details as string[]).map((detail, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visual accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-b-2xl" />
                </m.div>
              </AnimatePresence>
            </div>
          </ScrollAnimation>
        </div>
      </Container>
    </Section>
  );
}
