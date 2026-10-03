import os

from flask import Flask, Response, jsonify, render_template, request, stream_with_context

from news_summarizer import LLMSummarizer, NewsSummarizer

app = Flask(__name__)

news_summarizer = NewsSummarizer(os.getenv("NEWS_API", "").strip())
llm_summarizer = LLMSummarizer()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/search", methods=["POST"])
def search_news():
    data = request.get_json()
    topic = data.get("topic", "")

    if not topic:
        return jsonify({"error": "Topic is required"}), 400

    try:
        articles = news_summarizer.fetch_news(topic)
        summaries = news_summarizer.summarize_articles(articles)
        return jsonify({"articles": summaries})
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 500


@app.route("/api/summarize-stream", methods=["POST"])
def summarize_stream_news():
    data = request.get_json() or {}
    article = data.get("article", {})

    if not article:
        return jsonify({"error": "Article is required"}), 400

    def generate():
        import json

        try:
            for chunk in llm_summarizer.summarize_stream(article):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.route("/api/summarize", methods=["POST"])
def summarize_article():
    data = request.get_json() or {}
    article = data.get("article", {})

    if not article:
        return jsonify({"error": "Article is required"}), 400

    try:
        summary = llm_summarizer.summarize(article)
        return jsonify({"summary": summary})
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    import os

    app.run(debug=True, host="0.0.0.0", port=5000)
