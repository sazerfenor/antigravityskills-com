import { CopyButton } from "@/shared/components/copy-button";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { AlertCircle, ChevronDown, Copy, Settings2 } from "lucide-react";

interface GenerationDataProps {
  generationParams?: any;
  modelName?: string;
}

export function GenerationData({ generationParams, modelName }: GenerationDataProps) {
  if (!generationParams) return null;

  // Helper to safely render params
  const renderParam = (label: string, value: any) => {
    if (!value) return null;
    return (
      <div className="flex flex-col gap-1 pb-3 border-b border-border/40 last:border-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-sm font-medium text-foreground break-words">{value}</span>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Generation Data</span>
         </div>
         {/* Copy All Logic Placeholder */}
         <Button variant="ghost" size="icon" className="h-6 w-6">
            <Copy className="h-3.5 w-3.5" />
         </Button>
      </div>
      
      <div className="p-4 space-y-4">
        {renderParam("Model", modelName || generationParams.model)}
        
        <div className="grid grid-cols-2 gap-4">
            {renderParam("Seed", generationParams.seed)}
            {renderParam("Steps", generationParams.steps)}
            {renderParam("Sampler", generationParams.sampler_name || generationParams.scheduler)}
            {renderParam("CFG Scale", generationParams.cfg_scale || generationParams.guidance_scale)}
        </div>

        {generationParams.lora && (
             <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LoRA / Add-ons</span>
                <div className="flex flex-wrap gap-2">
                    {/* Mock LoRA display - assuming object or string */}
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                        {/* Simplification: Just showing a badge if data exists */}
                        Custom LoRA
                    </Badge>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
