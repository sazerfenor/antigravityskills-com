import { FadeIn } from '@/shared/components/ui/fade-in';
import { Section, Container } from '@/shared/components/ui/layout';
import { cn } from '@/shared/lib/utils';
import { Logos as LogosType } from '@/shared/types/blocks/landing';
import { VS } from '@/shared/lib/design-tokens';

/**
 * Logos component - Cyberpunk Reskin
 * Full Color "Trust" Bar.
 */
export function Logos({
  logos,
  className,
}: {
  logos: LogosType;
  className?: string;
}) {
  return (
    <Section
      id={logos.id}
      spacing="default"
      className={cn(
        "py-12",
        logos.className,
        className
      )}
    >
      <Container>
        <FadeIn>
           <p className="text-xs font-mono uppercase text-muted-foreground mb-10 text-center tracking-widest opacity-60">
             Trusted by creators using top models
           </p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 sm:gap-x-16 px-4">
            {logos.items?.map((item, idx) => {
              const size = (item as any).size || 'h-8 w-auto sm:h-12';
              const url = (item as any).url;
              
              const content = (
                <div className={`flex items-center justify-center transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}>
                  <img
                    className={cn(size, "object-contain grayscale-0 opacity-100")}
                    src={item.image?.src ?? ''}
                    alt={item.image?.alt ?? ''}
                    width={120}
                    height={60}
                  />
                </div>
              );
              
              return url ? (
                <a 
                  key={idx} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                  title={item.title}
                >
                  {content}
                </a>
              ) : (
                <div key={idx}>{content}</div>
              );
            })}
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
