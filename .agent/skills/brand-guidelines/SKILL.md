---
name: brand-guidelines
description: Use this skill when applying brand colors, typography, or visual identity standards to documents, slides, or design outputs. For brand compliance formatting, style guide enforcement, and corporate design consistency.
metadata:
  version: "1.0.0"
  author: "antigravity-skill-creator"
  license: "Apache-2.0"
---

# Brand Guidelines

## Overview

Apply consistent brand identity across all design outputs. This skill helps you enforce color palettes, typography systems, and visual styling rules for any brand.

## Protocols

1. **Load Brand Definition**: First, check if user has a brand config in `references/` or ask for brand colors and fonts
2. **Identify Target Elements**: Determine what needs styling (headings, body text, accents, shapes)
3. **Apply Color System**: Use primary colors for main elements, accent colors for emphasis
4. **Apply Typography**: Match fonts to element hierarchy (headings vs body)
5. **Verify Consistency**: Ensure all outputs follow the brand guide

## Color System Structure

Define your brand colors in this format:

```yaml
# Primary Colors
primary_dark: "#000000"      # Main text, dark backgrounds
primary_light: "#FFFFFF"     # Light backgrounds, text on dark
mid_gray: "#808080"          # Secondary elements
light_gray: "#F0F0F0"        # Subtle backgrounds

# Accent Colors (for emphasis and visual interest)
accent_primary: "#FF5733"    # Primary accent
accent_secondary: "#3498DB"  # Secondary accent
accent_tertiary: "#2ECC71"   # Tertiary accent
```

## Typography System

```yaml
# Font Hierarchy
headings:
  font: "Your Heading Font"
  fallback: "Arial, sans-serif"
  min_size: "24pt"

body:
  font: "Your Body Font"
  fallback: "Georgia, serif"

# Application Rules
- Headings (24pt+): Use heading font
- Body text: Use body font
- Smart fallback when custom fonts unavailable
```

## Usage Examples

**User**: "Apply our brand colors to this presentation"
**Action**: Load brand config → Apply primary colors to backgrounds → Apply accent colors to highlights → Apply typography hierarchy

**User**: "Make this document match our corporate style"
**Action**: Identify brand guide → Apply heading font to titles → Apply body font to paragraphs → Use accent colors for emphasis

**User**: "Set up brand colors for a new project"
**Action**: Ask for color palette → Create brand config file → Document typography rules → Provide usage examples

## Creating Your Brand Config

Create `references/brand-config.yaml` with your specific brand values:

```yaml
brand_name: "Your Company"

colors:
  primary:
    dark: "#141413"
    light: "#FAF9F5"
  accent:
    - "#D97757"  # Orange
    - "#6A9BCC"  # Blue
    - "#788C5D"  # Green

typography:
  heading: "Poppins"
  body: "Lora"

rules:
  - "Headings 24pt+ use heading font"
  - "Non-text shapes cycle through accent colors"
  - "Maintain visual hierarchy and formatting"
```

## Technical Notes

- Use RGB/Hex values for precise color matching
- Provide font fallbacks for cross-system compatibility
- Document all brand rules for team consistency
