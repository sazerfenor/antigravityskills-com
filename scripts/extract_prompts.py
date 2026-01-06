#!/usr/bin/env python3
"""
Extract AI image generation prompts from YouMind HTML file.

Usage:
    python extract_prompts.py

Output:
    prompts_extracted.json - JSON array of prompt objects
"""

import json
import re
from pathlib import Path
from bs4 import BeautifulSoup

# Configuration
HTML_FILE = Path(__file__).parent.parent / "logs" / "Nano Banana Pro Prompts - 高质量 AI 提示词与图像生成 - YouMind.html"
OUTPUT_FILE = Path(__file__).parent.parent / "prompts_extracted.json"


def extract_prompts(html_path: Path) -> list[dict]:
    """Parse HTML and extract all prompt entries."""
    print(f"Loading HTML file: {html_path}")
    
    with open(html_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")
    
    # Find all prompt entry divs - specifically those with the prompt card class
    # This excludes "AI shortcut" cards which have UUID data-ids
    entries = soup.find_all("div", class_=re.compile(r"group\s+relative\s+flex\s+flex-col\s+mt-12"), attrs={"data-id": True})
    print(f"Found {len(entries)} prompt entries")
    
    prompts = []
    for entry in entries:
        try:
            prompt_data = extract_single_prompt(entry)
            if prompt_data:
                prompts.append(prompt_data)
        except Exception as e:
            data_id = entry.get("data-id", "unknown")
            print(f"Error extracting prompt {data_id}: {e}")
    
    return prompts


def extract_single_prompt(entry) -> dict | None:
    """Extract data from a single prompt entry div."""
    data_id = entry.get("data-id")
    if not data_id:
        return None
    
    prompt = {"id": data_id}
    
    # Extract title from h3
    h3 = entry.find("h3")
    if h3:
        prompt["title"] = h3.get_text(strip=True)
    
    # Extract author (usually a link to x.com/twitter)
    author_link = entry.find("a", href=re.compile(r"(x\.com|twitter\.com)"))
    if author_link:
        author_text = author_link.get_text(strip=True)
        prompt["author"] = author_text.lstrip("@")
    
    # Extract description from p.text-gray-800
    desc_p = entry.find("p", class_=re.compile(r"text-gray-800"))
    if desc_p:
        prompt["description"] = desc_p.get_text(strip=True)
    
    # Extract prompt text from div.font-mono
    prompt_div = entry.find("div", class_=re.compile(r"font-mono"))
    if prompt_div:
        prompt_text = prompt_div.get_text(strip=True)
        
        # Check if it's embedded JSON
        if prompt_text.startswith("```json") or prompt_text.startswith("{"):
            prompt["prompt_text"] = prompt_text
            prompt["is_json"] = True
            # Try to parse embedded JSON
            try:
                json_match = re.search(r"\{.*\}", prompt_text, re.DOTALL)
                if json_match:
                    prompt["prompt_json"] = json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        else:
            prompt["prompt_text"] = prompt_text
            prompt["is_json"] = False
        
        # Extract variable parameters (highlighted spans)
        var_spans = prompt_div.find_all("span", class_=re.compile(r"bg-blue-200"))
        if var_spans:
            prompt["variable_params"] = [span.get_text(strip=True) for span in var_spans]
    
    # Extract images
    images = []
    for img in entry.find_all("img"):
        img_data = {}
        
        if img.get("src"):
            img_data["src"] = img["src"]
        
        if img.get("srcset"):
            img_data["srcset"] = img["srcset"]
        
        if img.get("alt"):
            img_data["alt"] = img["alt"]
        
        if img_data:
            images.append(img_data)
    
    if images:
        prompt["images"] = images
    
    return prompt


def main():
    """Main entry point."""
    if not HTML_FILE.exists():
        print(f"Error: HTML file not found: {HTML_FILE}")
        return
    
    prompts = extract_prompts(HTML_FILE)
    
    # Save to JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(prompts, f, ensure_ascii=False, indent=2)
    
    print(f"\nExtracted {len(prompts)} prompts to: {OUTPUT_FILE}")
    
    # Print sample
    if prompts:
        print("\n--- Sample Entry ---")
        sample = prompts[0]
        for key, value in sample.items():
            if key == "images":
                print(f"  {key}: [{len(value)} images]")
            elif isinstance(value, str) and len(value) > 100:
                print(f"  {key}: {value[:100]}...")
            else:
                print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
