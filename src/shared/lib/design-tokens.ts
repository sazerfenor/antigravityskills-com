import { cn } from "@/shared/lib/utils";

/**
 * Cyberpunk Design Token Map (VS = Visual System)
 * Source of truth for all Cyberpunk styling.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 5-9
 * @version 5.3
 */
export const VS = {
  // 5.1 The Glass System
  glass: {
    base: "bg-glass-subtle backdrop-blur-md",
    border: "border border-border-medium",
    hover: "hover:border-primary/50 transition-colors duration-300",
    container: "rounded-3xl",
    full: "bg-glass-subtle backdrop-blur-md border border-border-medium rounded-3xl",
  },

  // 5.2 The Neon System
  neon: {
    primary: "text-primary drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]",
    secondary: "text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.5)]",
    accent: "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]",
  },

  // 5.3 The Form System
  pill: "rounded-full",
  button: {
    base: "rounded-full h-12 px-8 transition-all duration-300 flex items-center justify-center font-medium",
    glow: "shadow-[0_0_30px_-10px_var(--color-primary)] hover:shadow-[0_0_40px_-5px_var(--color-primary)] hover:scale-105",
    ghost: "border-2 border-foreground/50 bg-transparent hover:bg-foreground/10 hover:border-foreground/70 text-foreground/90 font-medium shadow-sm",
  },

  // 5.4 The Poster Layout
  poster: {
    hero: "min-h-[65vh] flex flex-col justify-center items-center py-12 text-center",
    aurora: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none sticky top-0",
  },

  // 7. Section Gradient Palette - Unified Primary Yellow
  // All sections use consistent primary yellow for brand cohesion
  // No more rainbow gradients - clean, unified brand identity
  //
  gradient: {
    // Base classes for all gradients (legacy support)
    _base: "bg-clip-text text-transparent bg-gradient-to-r",

    // All sections now use primary yellow for consistency
    // Use text-primary for solid yellow
    hero: "text-primary",
    features: "text-primary",
    generator: "text-primary",
    gallery: "text-primary",
    coreModules: "text-primary",
    stats: "text-primary",
    testimonials: "text-primary",
    faq: "text-primary",
    cta: "text-primary",

    // Payment/Premium: Blue gradient for payment CTAs
    // 付费按钮专用：蓝色渐变
    // ⚠️ A11Y Note: Elements using this must have aria-label for screen readers
    premium: "bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-primary to-indigo-500",
  },

  // 10. Typography Scale (v5.1) - Unified sizing
  // Ensures consistent hierarchy across all sections
  typography: {
    h1: "text-5xl sm:text-7xl font-bold tracking-tight",
    h2: "text-3xl md:text-5xl font-bold tracking-tight",
    h3: "text-xl md:text-2xl font-bold tracking-tight",
    body: "text-base md:text-lg leading-relaxed",
    caption: "text-sm text-muted-foreground",
  },

  // 8. Atmosphere System (v5.0)
  // Background effects for different sections
  atmosphere: {
    // Hero: Top aurora glow
    auroraTop: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background",

    // Features/FAQ: Center glow (use with animate-glow-slow)
    glowCenter: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none",

    // Generator: Diagonal light band
    glowDiagonal: "bg-[linear-gradient(135deg,transparent_0%,rgba(37,99,235,0.05)_25%,transparent_50%,rgba(147,51,234,0.03)_75%,transparent_100%)]",

    // Generator: Matrix grid with radial mask
    matrixGrid: "bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]",

    // Gallery/Testimonials: Noise overlay
    noiseOverlay: "opacity-[0.02] pointer-events-none",

    // Stats: Scanline effect
    scanline: "bg-[linear-gradient(transparent_50%,rgba(37,99,235,0.02)_50%)] bg-[size:100%_4px]",

    // The Matrix Moment: Dark gradient for Generator
    matrixMoment: "bg-gradient-to-b from-background via-[hsl(0,0%,2%)] to-background",
  },

  // 6. Motion Discipline (v5.0)
  // Animation tokens organized by priority level
  motion: {
    // L1: Signature - Only for the most important CTA (limit: 1 per page)
    signature: {
      glowPulse: "animate-glow-pulse", // 2s, for hero CTA
      shimmer: "animate-shimmer",      // sweep effect
    },

    // L2: Functional - Loading, progress, active states (limit: 2-3 per page)
    functional: {
      spin: "animate-spin",
      ping: "animate-ping",
      bounce: "animate-bounce",
    },

    // L3: Decorative - Background, hover effects (no limit, but must be subtle)
    decorative: {
      glowSlow: "animate-glow-slow",     // 8s, for background
      glowMedium: "animate-glow-medium", // 4s, for decorative elements
      pulseOnce: "animate-pulse-once",   // one-time entrance
    },
  },
} as const;

// Helper to quickly apply glass effect
export const glass = (className?: string) => cn(VS.glass.full, className);

// Helper to get gradient for a specific section
export const getGradient = (section: keyof typeof VS.gradient) => VS.gradient[section];

// Helper to get atmosphere effect
export const getAtmosphere = (type: keyof typeof VS.atmosphere) => VS.atmosphere[type];
