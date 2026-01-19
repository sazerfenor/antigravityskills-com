# Brand Guidelines

Apply consistent brand identity across all design outputs—colors, typography, and visual styling rules for any brand.

## 🚀 Quick Start

1. Tell the agent: "Apply our brand colors to this document"
2. Provide your brand colors and fonts when asked
3. Get consistent, on-brand outputs

## ✨ What It Does

- **Color System Enforcement**: Apply primary, secondary, and accent colors consistently
- **Typography Management**: Match fonts to element hierarchy (headings, body, captions)
- **Style Guide Compliance**: Ensure all outputs follow brand standards
- **Cross-Format Support**: Works with presentations, documents, and design files

## 🔧 How It Works

1. Loads your brand definition (colors, fonts, rules)
2. Identifies target elements that need styling
3. Applies brand colors and typography systematically
4. Verifies consistency across the output

## 🔔 When to Use

- Creating presentations that need corporate styling
- Formatting documents to match brand guidelines
- Setting up brand standards for a new project
- Ensuring visual consistency across team outputs

## 📝 Examples

**Example 1: Apply Brand to Presentation**
```
"Apply our brand colors to this presentation"
→ Loads brand config
→ Applies colors and fonts
→ Returns styled presentation
```

**Example 2: Setup Brand Config**
```
"Set up brand colors for our new project"
→ Collects color palette
→ Documents typography rules
→ Creates reusable brand config
```

**Example 3: Corporate Document**
```
"Make this document match our corporate style"
→ Identifies brand guide
→ Applies heading and body fonts
→ Uses accent colors for emphasis
```

## 🎨 Creating Your Brand Config

Create a `references/brand-config.yaml` file:

```yaml
brand_name: "Your Company"

colors:
  primary:
    dark: "#141413"
    light: "#FAF9F5"
  accent:
    - "#D97757"
    - "#6A9BCC"
    - "#788C5D"

typography:
  heading: "Poppins"
  body: "Lora"
```
