'use client';

/**
 * SkillCapabilities - Core capabilities grid
 *
 * Shows: Icon + Title + Description cards
 */

import {
  Zap,
  Code,
  Palette,
  Settings,
  FileText,
  Layout,
  Database,
  Globe,
  Shield,
  Sparkles,
} from 'lucide-react';

interface Capability {
  icon: string;
  title: string;
  description: string;
}

interface SkillCapabilitiesProps {
  capabilities: Capability[];
}

// Icon mapping for common capability icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  code: Code,
  palette: Palette,
  settings: Settings,
  file: FileText,
  layout: Layout,
  database: Database,
  globe: Globe,
  shield: Shield,
  sparkles: Sparkles,
};

export function SkillCapabilities({ capabilities }: SkillCapabilitiesProps) {
  if (!capabilities || capabilities.length === 0) {
    return null;
  }

  const getIcon = (iconName: string) => {
    const normalizedName = iconName.toLowerCase().replace(/[-_]/g, '');
    const IconComponent = iconMap[normalizedName] || Sparkles;
    return IconComponent;
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Core Capabilities
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {capabilities.map((cap, idx) => {
          const IconComponent = getIcon(cap.icon);
          return (
            <div
              key={idx}
              className="rounded-xl border border-border-subtle bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground mb-1">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
