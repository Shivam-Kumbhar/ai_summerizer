import os

from dotenv import load_dotenv

load_dotenv()


class LLMSummarizer:
    def __init__(self):
        self._setup_client()

    def _setup_client(self):
        from openai import OpenAI

        api_key = os.getenv("LM_API_KEY")
        base_url = os.getenv("BASE_URL")

        if not api_key:
            raise ValueError("LM_API_KEY not found in environment variables")

        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = os.getenv("MODEL_NAME", "qwen/qwen3-4b-thinking-2507")

    def summarize_stream(self, article: dict):
        """Stream summary chunks for an article using LLM."""
        title = article.get("title", "") or ""
        description = article.get("description", "") or ""
        content = article.get("content", "") or ""

        text_to_summarize = f"Title: {title}\nDescription: {description}\nContent: {content}"

        prompt = f"""You are an insightful and thorough news summarizer. Provide a well-structured, clear, and comprehensive summary of the following news article.
Cover the main story, key facts, background context, and major takeaways.

Article Details:
{text_to_summarize}

Summary:"""

        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional news analyst. Output informative, clearly structured summaries directly without conversational filler.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=2048,
            temperature=0.3,
            stream=True,
        )

        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            content_chunk = getattr(delta, "content", None)
            if content_chunk:
                yield content_chunk

    def summarize(self, article: dict) -> str:
        """Summarize a single article using LLM."""
        return "".join(self.summarize_stream(article)).strip()


def get_llm_summarizer() -> LLMSummarizer:
    """Factory function to create LLMSummarizer."""
    return LLMSummarizer()
