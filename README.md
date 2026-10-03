# 📰 AI News Summarizer

An AI-powered News Aggregator and Summarizer built with Flask and local LLMs (via LM Studio or OpenAI-compatible endpoints).

## ✨ Features

- 🔍 **Live News Search**: Fetches recent articles by topic using NewsAPI.
- ⚡ **Dynamic Real-Time Streaming**: Streams AI-generated summaries token-by-token with live markdown formatting and typing indicators.
- 📋 **Copy to Clipboard**: Instant one-click copying of generated summaries.
- 🔒 **Local & Private LLMs**: Seamlessly connects to local models (e.g. Qwen, Llama, Mistral) running on LM Studio.

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- LM Studio (or an OpenAI-compatible LLM server) running locally

### 2. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/Shivam-Kumbhar/ai_summerizer.git
cd ai_summerizer
pip install -r requirements.txt
```

### 3. Environment Setup
Create a `.env` file in the root directory (based on `env.txt`):
```env
LM_API_KEY=your_lm_studio_api_key
BASE_URL=http://127.0.0.1:1234/v1
NEWS_API=your_newsapi_org_api_key
# Optional: MODEL_NAME=qwen/qwen3-4b-thinking-2507
```

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to `http://localhost:5000`.

## 📁 Project Structure
```
├── app.py                     # Flask application & streaming API routes
├── news_summarizer/          # Core package
│   ├── news_fetcher.py       # NewsAPI client
│   └── llm_summarizer.py     # LLM integration & streaming summarizer
├── static/                   # Frontend assets (CSS & JS)
│   ├── script.js             # SSE streaming reader & dynamic UI
│   └── style.css             # Responsive styling
├── templates/                # HTML templates
│   └── index.html            # Main UI
├── requirements.txt          # Python dependencies
└── env.txt                   # Environment template
```
