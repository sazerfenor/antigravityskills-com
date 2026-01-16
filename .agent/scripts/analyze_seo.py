import csv
import re
import os
import json
from collections import Counter
from math import log

# Configuration
INPUT_CSV = '/Users/lixuanying/Documents/GitHub/nanobananaultra/docs/prompt-scoring/output/quality-filtered-prompts.csv'
OUTPUT_HTML = '/Users/lixuanying/Documents/GitHub/nanobananaultra/docs/prompt-scoring/output/seo_keyword_report.html'
STOP_WORDS = {
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
    'is', 'are', 'was', 'were', 'be', 'been', 'template', 'prompt', 'style', 'design', 'image',
    'photo', 'photography', 'art', 'illustration', 'render', 'rendering'
}

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower())

def get_ngrams(tokens, n):
    return [' '.join(tokens[i:i+n]) for i in range(len(tokens)-n+1)]

def analyze_keywords():
    print(f"Reading CSV: {INPUT_CSV}")
    
    phrases = []
    all_tokens = []
    
    try:
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Assuming 'search_keywords' is the column name based on previous context
                # If column name differs, we might need to adjust.
                # In previous turns, line 1 showed: ...,search_keywords,...
                keywords_raw = row.get('search_keywords', '')
                if not keywords_raw:
                    continue
                
                # Split by semicolon as seen in the screenshot/file
                parts = [p.strip() for p in keywords_raw.split(';') if p.strip()]
                
                for p in parts:
                    cleaned_phrase = clean_text(p)
                    tokens = [t for t in cleaned_phrase.split() if t and t not in STOP_WORDS]
                    
                    if tokens:
                        phrases.append(cleaned_phrase)
                        all_tokens.extend(tokens)

    except FileNotFoundError:
        print("Error: CSV file not found.")
        return

    # Frequency Analysis
    word_freq = Counter(all_tokens)
    
    # Generate Bigrams
    all_bigrams = []
    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            keywords_raw = row.get('search_keywords', '')
            parts = [p.strip() for p in keywords_raw.split(';') if p.strip()]
            for p in parts:
                tokens = [t for t in clean_text(p).split() if t and t not in STOP_WORDS]
                if len(tokens) >= 2:
                    all_bigrams.extend(get_ngrams(tokens, 2))
    
    bigram_freq = Counter(all_bigrams)

    top_words = word_freq.most_common(100)
    top_bigrams = bigram_freq.most_common(50)
    
    # Prepare data for word cloud (list of [string, size])
    word_cloud_data = [[word, count] for word, count in top_words]

    print(f"Top 10 Words: {top_words[:10]}")

    generate_html_report(top_words, top_bigrams, word_cloud_data)

def generate_html_report(top_words, top_bigrams, word_cloud_data):
    html_content = f"""
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Keyword Analysis Report</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js"></script>
    <style>
        body {{ font-family: -apple-system, system-ui, sans-serif; padding: 20px; background: #f9f9f9; color: #333; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
        h1, h2 {{ color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
        .flex-row {{ display: flex; gap: 30px; flex-wrap: wrap; }}
        .col {{ flex: 1; min-width: 300px; }}
        
        #canvas-container {{ width: 100%; height: 400px; position: relative; margin-bottom: 30px; border: 1px solid #eee; border-radius: 8px; }}
        
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        th, td {{ text-align: left; padding: 12px; border-bottom: 1px solid #eee; }}
        th {{ background-color: #f8f9fa; color: #666; font-weight: 600; }}
        tr:hover {{ background-color: #f5f5f5; }}
        
        .badge {{ background: #e1ecf4; color: #39739d; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; }}
        .stats-card {{ background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #eee; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>SEO Keyword Analysis Report</h1>
        <p>基于 <code>search_keywords</code> 列的深度拆解与重组分析。</p>
        
        <h2>☁️ SEO 核心词云 (Word Cloud)</h2>
        <div id="canvas-container">
            <canvas id="word_cloud_canvas" width="1100" height="400"></canvas>
        </div>

        <div class="flex-row">
            <div class="col stats-card">
                <h2>🔥 Top 50 高频词 (Core Keywords)</h2>
                <p>排除停用词 (template, design 等) 后的核心名词/形容词。</p>
                <table>
                    <thead><tr><th>Rank</th><th>Keyword</th><th>Count</th></tr></thead>
                    <tbody>
                        {''.join(f'<tr><td>{i+1}</td><td><b>{w}</b></td><td>{c}</td></tr>' for i, (w, c) in enumerate(top_words[:50]))}
                    </tbody>
                </table>
            </div>
            
            <div class="col stats-card">
                <h2>🔗 Top 50 黄金组合 (Bigrams)</h2>
                <p>最常一起出现的双词组合，通常是具体的细分利基 (Niche)。</p>
                <table>
                    <thead><tr><th>Rank</th><th>Phrase</th><th>Count</th></tr></thead>
                    <tbody>
                        {''.join(f'<tr><td>{i+1}</td><td>{w}</td><td>{c}</td></tr>' for i, (w, c) in enumerate(top_bigrams[:50]))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const list = {json.dumps(word_cloud_data)};
        
        // Scale factor to make the word cloud look good
        const maxFreq = list[0][1];
        const scaledList = list.map(item => [item[0], (item[1] / maxFreq) * 60 + 10]);

        WordCloud(document.getElementById('word_cloud_canvas'), {{ 
            list: scaledList,
            gridSize: 8,
            weightFactor: function (size) {{ return size; }},
            fontFamily: 'Impact, sans-serif',
            color: 'random-dark',
            rotateRatio: 0.5,
            rotationSteps: 2,
            backgroundColor: '#fff'
        }});
    </script>
</body>
</html>
    """
    
    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Report generated: {OUTPUT_HTML}")

if __name__ == "__main__":
    analyze_keywords()
