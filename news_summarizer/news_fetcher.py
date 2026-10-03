import os
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv

load_dotenv()


class NewsSummarizer:
    def __init__(self, api_key: str):
        self.api_key = api_key.strip()
        self.base_url = "https://newsapi.org/v2/everything"

    def fetch_news(self, topic: str, language: str = "en", page_size: int = 10, days_back: int = 7) -> list[dict]:
        """Fetch news articles for a given topic."""
        from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")  # noqa: DTZ005

        params = {
            "q": topic,
            "from": from_date,
            "sortBy": "publishedAt",
            "language": language,
            "pageSize": page_size,
            "apiKey": self.api_key,
        }

        response = requests.get(self.base_url, params=params)
        response.raise_for_status()

        data = response.json()
        return data.get("articles", [])

    def summarize_articles(self, articles: list[dict]) -> list[dict]:
        """Extract key information from articles."""
        summarized = []
        for article in articles:
            summarized.append(
                {
                    "title": article.get("title"),
                    "description": article.get("description"),
                    "content": article.get("content"),
                    "url": article.get("url"),
                    "source": article.get("source", {}).get("name"),
                    "published_at": article.get("publishedAt"),
                    "url_to_image": article.get("urlToImage"),
                }
            )
        return summarized


def get_news_summarizer() -> NewsSummarizer:
    """Factory function to create NewsSummarizer with API key from env."""
    api_key = os.getenv("NEWS_API")
    if not api_key:
        raise ValueError("NEWS_API not found in environment variables")
    return NewsSummarizer(api_key)
