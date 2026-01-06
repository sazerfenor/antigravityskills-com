# Pain Miner Changelog

All notable changes to this workflow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [10.0.0] - 2025-12-28

### Added
- Chain-of-Thought (CoT) for Filter/Insight Prompts in post-analyzer.md
- Explicit loop control with checklist pattern in subreddit-miner.md
- Error recovery mechanism (retry_count + failed status)
- Unified version management (VERSION + CHANGELOG.md)
- Schema version check at workflow start
- Schema migration script (migrations/v10_schema.sql)

### Changed
- Restructured post-analyzer.md with RCOT pattern (Role → Context → Output → Think)
- Reduced Few-Shot examples from 3 to 1 + boundary table
- Moved Schema migration DDL out of workflow into separate script
- gold-curator.md Action Plan Prompt with explicit reasoning steps

### Removed
- Inline version annotations (v8.0 变更, v8.1 修复, etc.) - moved to CHANGELOG

### Fixed
- Loop execution completion rate (30% → target 80%+) via explicit checklist
- Prompt output consistency via mandatory CoT steps

## [9.1.0] - 2025-12-26

### Added
- MCP integration (reddit-mcp-buddy as primary data source)
- Semantic feature recognition (pain_pattern field)
- Language Protocol enforcement

### Changed
- Hybrid Scraper prioritizes MCP over browser scraping

## [9.0.0] - 2025-12-25

### Added
- pain_pattern, pattern_evidence, data_source fields to leads table
- Three pain pattern types: frustration, alternative_seeking, feature_gap

## [8.1.0] - 2025-12-24

### Added
- post_content and author fields to leads table
- Top 10 comments extraction in Post Analyzer

### Fixed
- Lead data completeness for deep analysis

## [8.0.0] - 2025-12-23

### Added
- Dual-layer Prompt system (Filter + Insight) in post-analyzer.md
- action_plan and market_opportunity fields to gold_leads table
- lead_type and pain_signals fields to leads table

### Changed
- Gold Curator generates actionable plans instead of just scores

---

**Maintainer**: Pain Miner Team
**Repository**: agents/.agent/workflows/pain-miner/
