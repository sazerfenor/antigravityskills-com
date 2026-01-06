import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { FadeIn } from '@/shared/components/ui/fade-in';
import { Section, Container } from '@/shared/components/ui/layout';
import { Button } from '@/shared/components/ui/button';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';
import { CTA as CtaType } from '@/shared/types/blocks/landing';
import { Link } from '@/core/i18n/navigation';

/**
 * CTA component - "Neon Beacon" Cyberpunk Style (v5.0)
 *
 * The ONLY section allowed to use L1 Signature animation (glow-pulse).
 * Visual climax designed to draw user attention to conversion.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 6.1, 7, 8
 */
export function Cta({
  cta,
  className,
}: {
  cta: CtaType;
  className?: string;
}) {
  return (
    <Section
      id={cta.id}
      spacing="default"
      className={cn(cta.className, className, "py-24 relative overflow-hidden")}
    >
      {/* 8.1 Atmosphere: Radial glow behind CTA card */}
      <div className={cn(
        VS.atmosphere.glowCenter,
        "w-[700px] h-[400px] bg-primary/10 blur-[150px]",
        VS.motion.decorative.glowMedium
      )} />

      <Container className="relative z-10">
        {/* Glass Container with L1 Signature glow animation - "Neon Beacon" */}
        <div className={cn(
          "relative max-w-5xl mx-auto overflow-hidden rounded-[2rem]",
          VS.glass.base,
          "border border-primary/20",
          "backdrop-blur-xl",
          // L1 Signature Animation - ONLY allowed here per Motion Discipline
          VS.motion.signature.glowPulse
        )}>

          {/* Shimmer effect overlay */}
          <div className={cn(
            "absolute inset-0 pointer-events-none",
            VS.motion.signature.shimmer
          )} />

          {/* Radial gradient top highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.08),transparent_60%)] pointer-events-none" />

          <div className="relative px-6 py-20 sm:px-12 sm:py-24 text-center">
            <FadeIn>
              {/* 7.1 Section Gradient: CTA - Solar Burst (warmest gradient) */}
              <h2 className="text-3xl font-bold tracking-tight md:text-5xl mb-6">
                <span className={VS.gradient.cta}>{cta.title}</span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed">
                {cta.description}
              </p>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {cta.buttons?.map((button, idx) => {
                  const isPrimary = button.variant === 'default' || !button.variant;
                  return (
                    <Button
                      asChild
                      size="lg"
                      variant={button.variant || 'default'}
                      className={cn(
                        "h-14 px-8 text-lg rounded-full transition-all duration-300 hover:scale-105",
                        isPrimary
                          ? cn(
                              "bg-primary text-primary-foreground font-bold",
                              // Enhanced glow for primary CTA button
                              "shadow-[0_0_50px_-5px_var(--color-primary)]",
                              "hover:shadow-[0_0_60px_-5px_var(--color-primary)]"
                            )
                          : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
                      )}
                      key={idx}
                    >
                      <Link href={button.url ?? ''}>
                        {button.icon && <SmartIcon name={button.icon as string} className="mr-2 h-5 w-5" />}
                        {button.title}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </FadeIn>
          </div>
        </div>
      </Container>
    </Section>
  );
}
