"use client";

import React, { useEffect, useState } from "react";
import { m, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

interface ScrollAnimationProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  stagger?: boolean;
}

/**
 * SSR-safe scroll animation component.
 * 
 * IMPORTANT: Content is VISIBLE by default on server render for:
 * - SEO (Lighthouse, crawlers see content without JS)
 * - Core Web Vitals (no CLS from hidden->visible)
 * - Accessibility (content visible if JS fails)
 * 
 * Animation only activates after client hydration.
 */
export function ScrollAnimation({
  children,
  className = "",
  delay = 0,
  direction = "up",
  stagger = false,
}: ScrollAnimationProps) {
  const ref = useRef(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px",
  });

  // Track client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Respect user's reduced motion preference
  const shouldReduceMotion = useReducedMotion();

  // SSR or reduced motion: show content directly without animation
  if (!isHydrated || shouldReduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: 30, x: 0 };
      case "down":
        return { y: -30, x: 0 };
      case "left":
        return { x: 30, y: 0 };
      case "right":
        return { x: -30, y: 0 };
      default:
        return { y: 30, x: 0 };
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      ...getInitialPosition(),
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  if (stagger) {
    return (
      <m.div
        ref={ref}
        variants={containerVariants}
        initial="visible"
        animate={isInView ? "visible" : "visible"}
        className={className}
      >
        {React.Children.map(children, (child) => (
          <m.div variants={itemVariants} initial="visible" animate="visible">{child}</m.div>
        ))}
      </m.div>
    );
  }

  // After hydration: animate from current position (already visible) to final
  // Use whileInView for smooth animation when scrolling
  return (
    <m.div
      ref={ref}
      initial={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)",
      }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}
