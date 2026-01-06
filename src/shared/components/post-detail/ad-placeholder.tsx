import { cn } from "@/shared/lib/utils";
import { getAllConfigs } from "@/shared/models/config";

interface AdPlaceholderProps {
  type: 'sidebar' | 'banner';
  className?: string;
}

/**
 * Conditionally renders an ad placeholder only if Adsense is configured.
 * When no ad ID is configured, returns null (renders nothing).
 */
export async function AdPlaceholder({ type, className }: AdPlaceholderProps) {
  // Check if ads are configured
  const configs = await getAllConfigs();
  
  // If no adsense code is configured, don't render anything
  if (!configs.adsense_code) {
    return null;
  }

  return (
    <div className={cn(
      "w-full flex flex-col items-center justify-center bg-transparent border-2 border-dashed border-border-medium rounded-xl overflow-hidden relative group transition-colors hover:border-border-strong",
      type === 'sidebar' ? 'aspect-[3/2]' : 'h-32 mb-8',
      className
    )}>
      <div className="text-center space-y-1 z-10">
           <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Advertisement</span>
           <span className="text-[10px] text-muted-foreground/50 block group-hover:text-muted-foreground transition-colors">
               {type === 'sidebar' ? 'Rectangular Ad' : 'Banner Ad'}
           </span>
      </div>
      {/* Subtle Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_25%,rgba(255,255,255,0.02)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.02)_75%,rgba(255,255,255,0.02)_100%)] bg-[length:24px_24px] opacity-50" />
    </div>
  );
}
