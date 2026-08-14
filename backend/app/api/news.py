import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any

import feedparser
from bs4 import BeautifulSoup
from fastapi import APIRouter

router = APIRouter(prefix="/news", tags=["News"])

# Simple in-memory cache
_NEWS_CACHE: Dict[str, Any] = {
    "data": [],
    "last_fetched": None
}
CACHE_TTL = timedelta(minutes=30)

RSS_FEEDS = [
    # Google News Agriculture India
    "https://news.google.com/rss/search?q=agriculture+india&hl=en-IN&gl=IN&ceid=IN:en",
    # The Print Agriculture
    "https://theprint.in/category/economy/agriculture/feed/",
    # Krishi Jagran General News
    "https://krishijagran.com/feeds/?cat=1",
    # The Hindu Agriculture
    "https://www.thehindu.com/sci-tech/agriculture/feeder/default.rss",
]

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    return soup.get_text(separator=" ", strip=True)

def parse_date(date_str: str) -> datetime:
    try:
        from email.utils import parsedate_to_datetime
        if date_str:
            return parsedate_to_datetime(date_str)
    except Exception:
        pass
    return datetime.now()

def time_ago(dt: datetime) -> str:
    now = datetime.now(dt.tzinfo)
    diff = now - dt
    if diff.days > 0:
        return f"{diff.days} days ago" if diff.days > 1 else "1 day ago"
    hours = diff.seconds // 3600
    if hours > 0:
        return f"{hours} hours ago" if hours > 1 else "1 hour ago"
    minutes = (diff.seconds % 3600) // 60
    return f"{minutes} minutes ago" if minutes > 1 else "just now"

def fetch_and_parse_feeds() -> List[Dict[str, str]]:
    articles = []
    for url in RSS_FEEDS:
        feed = feedparser.parse(url)
        source_title = feed.feed.get("title", "Agri News")
        # Fetch up to 40 articles per feed to build a large pool
        for entry in feed.entries[:40]:
            raw_summary = entry.get("summary", "") or entry.get("description", "")
            excerpt = clean_html(raw_summary)
            if len(excerpt) > 150:
                excerpt = excerpt[:147] + "..."
            
            published_date = entry.get("published", "") or entry.get("updated", "")
            dt = parse_date(published_date)
            date_str = time_ago(dt)

            articles.append({
                "title": entry.get("title", "No Title"),
                "source": source_title,
                "date": date_str,
                "category": "News",
                "excerpt": excerpt,
                "link": entry.get("link", "#"),
                "timestamp": dt.timestamp()
            })
    
    # Sort by timestamp descending
    articles.sort(key=lambda x: x["timestamp"], reverse=True)
    
    # Clean up timestamp from output
    for article in articles:
        del article["timestamp"]
        
    return articles

@router.get("/")
async def get_news(page: int = 1, limit: int = 15):
    now = datetime.now()
    if _NEWS_CACHE["last_fetched"] is None or now - _NEWS_CACHE["last_fetched"] > CACHE_TTL:
        # Fetch synchronously in a thread pool to avoid blocking async loop
        articles = await asyncio.to_thread(fetch_and_parse_feeds)
        _NEWS_CACHE["data"] = articles
        _NEWS_CACHE["last_fetched"] = now
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    total = len(_NEWS_CACHE["data"])
    items = _NEWS_CACHE["data"][start_idx:end_idx]
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": end_idx < total
    }
