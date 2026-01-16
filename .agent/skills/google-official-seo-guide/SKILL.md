---
name: google-official-seo-guide
description: Use this skill when implementing SEO best practices, fixing crawling/indexing issues, adding structured data for rich results, or optimizing website visibility in Google Search. Triggers on requests like "improve my SEO", "add schema markup", "fix indexing issues", "implement video structured data", or "optimize for Google Search".
metadata:
  version: "1.0.0"
  author: "claude-plugins"
  original_source: ".agent/knowledge/claude-plugins/google-official-seo-guide"
---

# Google Official SEO Guide

## Overview

Comprehensive SEO assistance based on official Google documentation. Covers the three stages of Google Search (Crawling → Indexing → Serving), structured data implementation, and technical SEO best practices.

## When to Use

| Category | Trigger Examples |
|:---|:---|
| **SEO Optimization** | Improving ranking, meta tags, title optimization |
| **Structured Data** | VideoObject, BroadcastEvent, Clip, schema.org markup |
| **Technical SEO** | Mobile-first indexing, JavaScript SEO, canonical tags |
| **Search Console** | Debugging visibility, crawl errors, performance metrics |
| **Links & Content** | Anchor text, internal linking, avoiding spam violations |

## Key Concepts

### The Three Stages of Google Search
1. **Crawling**: Googlebot discovers and fetches pages
2. **Indexing**: Google analyzes and stores content
3. **Serving**: Google returns relevant results for queries

### Important Principles
- **Mobile-First Indexing**: Google uses mobile version for ranking
- **Canonical URLs**: Specify preferred version of duplicate pages
- **Structured Data**: Use schema.org for rich results
- **Search Essentials**: Technical, content, and spam requirements

## Quick Reference

### VideoObject Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Video title",
  "description": "Video description",
  "thumbnailUrl": ["https://example.com/photo.jpg"],
  "uploadDate": "2024-03-31T08:00:00+08:00",
  "duration": "PT1M54S",
  "contentUrl": "https://example.com/video.mp4"
}
```

---

### LIVE Badge with BroadcastEvent

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Livestream title",
  "publication": {
    "@type": "BroadcastEvent",
    "isLiveBroadcast": true,
    "startDate": "2024-10-27T14:00:00+00:00",
    "endDate": "2024-10-27T14:37:14+00:00"
  }
}
```

---

### Good Anchor Text

```html
<!-- Bad: Too generic -->
<a href="https://example.com">Click here</a>

<!-- Good: Descriptive -->
<a href="https://example.com">list of cheese types</a>
```

---

### robots meta tags

```html
<meta name="robots" content="noindex">          <!-- Don't index -->
<meta name="robots" content="nofollow">         <!-- Don't follow links -->
<meta name="robots" content="noindex, nofollow"> <!-- Both -->
```

## Reference Files

> [!TIP]
> **按需加载**: 详细文档存放在 `references/` 目录，请根据具体任务加载相关文件。

| File | Pages | Use When |
|:---|:---|:---|
| [fundamentals.md](references/fundamentals.md) | Core | Learning SEO basics, starting new projects |
| [crawling.md](references/crawling.md) | Tech | Debugging crawl issues, robots.txt |
| [indexing.md](references/indexing.md) | Tech | Canonical URLs, sitemaps, redirects |
| [appearance.md](references/appearance.md) | 58p | Rich results, search UI optimization |
| [specialty.md](references/specialty.md) | Data | Video structured data, schema.org |
| [guides.md](references/guides.md) | How-to | Links, mobile-first, i18n, migrations |
| [apis.md](references/apis.md) | Tools | Search Console setup and reports |
| [other.md](references/other.md) | Policy | Spam policies, algorithm updates |

## Common Pitfalls

| Category | ❌ Avoid | ✅ Do Instead |
|:---|:---|:---|
| **Spam** | Keyword stuffing, hidden text | Natural language, visible content |
| **Mobile** | Different content on mobile/desktop | Same content, responsive design |
| **Structured Data** | Missing required fields | Validate with Rich Results Test |
| **Links** | Generic "click here" anchor text | Descriptive, contextual anchor text |

## Official Tools

- **Google Search Console**: Monitor and optimize search presence
- **Rich Results Test**: Validate structured data markup
- **Mobile-Friendly Test**: Check mobile optimization
- **Page Speed Insights**: Analyze performance
