---
name: reddit-lead-mining
description: Automated Reddit lead mining and demand discovery. This skill should be used when users want to scrape Reddit for marketing leads, analyze user pain points, discover product opportunities, or automate social listening for business intelligence.
---

# Reddit Lead Mining Skill

This skill provides guidance for building automated Reddit scraping and analysis systems for lead generation and demand discovery.

## Purpose

Help users build systems that:
1. Scrape relevant subreddits for discussions about specific topics
2. Identify posts expressing pain points or needs
3. Analyze posts with AI to find high-quality leads
4. Store and track results for marketing/sales follow-up

## Core Capabilities

### Reddit Data Extraction

#### Using Reddit API (Recommended for Production)
```python
import praw

reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="script:lead-miner:v1.0 (by /u/username)"
)

# Search subreddits
for submission in reddit.subreddit("all").search("your keyword", limit=100):
    print(submission.title, submission.selftext, submission.url)
```

#### Using JSON Endpoints (No API Key Required)
```python
import requests

def scrape_subreddit(subreddit: str, category: str = "hot", limit: int = 25):
    """Scrape Reddit without API key using JSON endpoints"""
    url = f"https://www.reddit.com/r/{subreddit}/{category}.json?limit={limit}"
    headers = {"User-Agent": "Mozilla/5.0 (compatible; LeadMiner/1.0)"}

    response = requests.get(url, headers=headers)
    data = response.json()

    posts = []
    for child in data["data"]["children"]:
        post = child["data"]
        posts.append({
            "id": post["id"],
            "title": post["title"],
            "selftext": post.get("selftext", ""),
            "url": f"https://reddit.com{post['permalink']}",
            "score": post["score"],
            "num_comments": post["num_comments"],
            "created_utc": post["created_utc"],
            "subreddit": post["subreddit"]
        })
    return posts
```

### AI-Powered Lead Analysis

#### GPT-based Lead Scoring
```python
from openai import OpenAI

client = OpenAI()

def analyze_post_for_leads(post: dict, product_context: str) -> dict:
    """Analyze a Reddit post to determine if it's a potential lead"""

    prompt = f"""Analyze this Reddit post for lead potential.

Product/Service Context: {product_context}

Post Title: {post['title']}
Post Content: {post['selftext'][:2000]}

Evaluate:
1. Pain Point Match (0-10): Does the user express a problem our product solves?
2. Intent Signal (0-10): How likely are they to be looking for a solution?
3. Engagement Potential (0-10): Would responding be appropriate and valuable?
4. Key Pain Points: List specific pain points mentioned
5. Suggested Response: If appropriate, draft a helpful (non-spammy) response

Return as JSON."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",  # Cost-effective for bulk analysis
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)
```

### Subreddit Discovery

#### Finding Relevant Subreddits
```python
def discover_subreddits(seed_keywords: list[str], limit: int = 10) -> list[str]:
    """Discover relevant subreddits based on keywords"""

    discovered = set()

    for keyword in seed_keywords:
        # Search for subreddits
        url = f"https://www.reddit.com/subreddits/search.json?q={keyword}&limit={limit}"
        headers = {"User-Agent": "Mozilla/5.0"}

        response = requests.get(url, headers=headers)
        data = response.json()

        for child in data["data"]["children"]:
            subreddit = child["data"]
            if subreddit["subscribers"] > 1000:  # Filter by size
                discovered.add(subreddit["display_name"])

    return list(discovered)
```

### Data Storage

#### SQLite for Lead Storage
```python
import sqlite3
from datetime import datetime

def init_database():
    conn = sqlite3.connect("leads.db")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            url TEXT,
            subreddit TEXT,
            score INTEGER,
            pain_score REAL,
            intent_score REAL,
            pain_points TEXT,
            suggested_response TEXT,
            status TEXT DEFAULT 'new',
            created_at TIMESTAMP,
            analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    return conn
```

## Best Practices

### Rate Limiting
- Reddit API: 60 requests per minute
- JSON endpoints: Use delays (2-5 seconds between requests)
- Use rotating proxies for large-scale scraping

### Ethical Guidelines
1. **Don't spam** - Only respond when genuinely helpful
2. **Disclose affiliation** - Be transparent about your product
3. **Add value first** - Help before promoting
4. **Respect subreddit rules** - Check each subreddit's policies
5. **Monitor shadowbans** - Check if your account is shadowbanned

### Post Age Strategy
- Focus on posts 1-7 days old for engagement
- Older posts (7-30 days) for research/analysis
- Very old posts for trend analysis only

## Pipeline Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Subreddit  │────▶│   Scraper   │────▶│  Raw Posts  │
│  Discovery  │     │  (PRAW/JSON)│     │  Database   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Output    │◀────│   Scoring   │◀────│  AI Filter  │
│  Dashboard  │     │  & Ranking  │     │  (GPT-4o)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Reference Projects

The following repositories contain working implementations:

1. **Reddit_Scrapper** - Full lead mining with GPT analysis
   - Location: `参考用github/Reddit_Scrapper/`
   - Features: Subreddit discovery, GPT scoring, SQLite storage

2. **YARS** - Lightweight scraper without API
   - Location: `参考用github/yars/`
   - Features: No API key needed, simple JSON scraping

3. **reddit-scraper-and-analyzer** - Airflow-based pipeline
   - Location: `参考用github/reddit-scraper-and-analyzer/`
   - Features: Scheduled workflows, enterprise-grade

## Quick Start

To create a basic lead mining script:

```python
# lead_miner.py
import requests
import json
from openai import OpenAI
import sqlite3
import time

class RedditLeadMiner:
    def __init__(self, product_context: str):
        self.product_context = product_context
        self.client = OpenAI()
        self.db = self._init_db()

    def _init_db(self):
        conn = sqlite3.connect("leads.db")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                title TEXT,
                url TEXT,
                score REAL,
                pain_points TEXT,
                created_at TEXT
            )
        """)
        return conn

    def scrape(self, subreddit: str, limit: int = 25):
        url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={limit}"
        headers = {"User-Agent": "LeadMiner/1.0"}
        response = requests.get(url, headers=headers)
        return response.json()["data"]["children"]

    def analyze(self, post: dict) -> dict:
        # Use GPT to analyze lead potential
        # ... (implementation above)
        pass

    def run(self, subreddits: list[str]):
        for subreddit in subreddits:
            posts = self.scrape(subreddit)
            for post in posts:
                result = self.analyze(post["data"])
                if result["score"] > 7:
                    self.save_lead(post["data"], result)
            time.sleep(2)  # Rate limiting

# Usage
miner = RedditLeadMiner("AI prompt marketplace for creators")
miner.run(["ChatGPT", "PromptEngineering", "ArtificialIntelligence"])
```
