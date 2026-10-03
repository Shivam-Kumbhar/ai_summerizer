const API_BASE = window.location.origin;

const elements = {
    topicInput: document.getElementById('topicInput'),
    searchBtn: document.getElementById('searchBtn'),
    loading: document.getElementById('loading'),
    resultsSection: document.getElementById('resultsSection'),
    articlesList: document.getElementById('articlesList'),
    articleCount: document.getElementById('articleCount'),
    summarySection: document.getElementById('summarySection'),
    summaryBadge: document.getElementById('summaryBadge'),
    summaryTitle: document.getElementById('summaryTitle'),
    summarySource: document.getElementById('summarySource'),
    summaryDate: document.getElementById('summaryDate'),
    summaryBody: document.getElementById('summaryBody'),
    summaryContent: document.getElementById('summaryContent'),
    summaryLink: document.getElementById('summaryLink'),
    copySummaryBtn: document.getElementById('copySummaryBtn'),
    closeSummary: document.getElementById('closeSummary'),
    errorSection: document.getElementById('errorSection'),
    errorMessage: document.getElementById('errorMessage')
};

let currentArticles = [];
let currentAbortController = null;
let currentRawSummary = '';

elements.searchBtn.addEventListener('click', searchNews);
elements.topicInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchNews();
});
elements.closeSummary.addEventListener('click', closeSummary);
elements.summarySection.addEventListener('click', (e) => {
    if (e.target === elements.summarySection) closeSummary();
});

if (elements.copySummaryBtn) {
    elements.copySummaryBtn.addEventListener('click', async () => {
        if (!currentRawSummary) return;
        try {
            await navigator.clipboard.writeText(currentRawSummary);
            const originalHtml = elements.copySummaryBtn.innerHTML;
            elements.copySummaryBtn.innerHTML = '<span class="btn-icon">✅</span> Copied!';
            setTimeout(() => {
                elements.copySummaryBtn.innerHTML = originalHtml;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    });
}

async function searchNews() {
    const topic = elements.topicInput.value.trim();
    if (!topic) {
        showError('Please enter a topic to search');
        return;
    }

    setLoading(true);
    hideError();
    hideResults();
    hideSummary();

    try {
        const response = await fetch(`${API_BASE}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch news');
        }

        currentArticles = data.articles || [];
        displayArticles(currentArticles);
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

function displayArticles(articles) {
    elements.articleCount.textContent = `(${articles.length})`;
    elements.articlesList.innerHTML = '';

    if (articles.length === 0) {
        elements.articlesList.innerHTML = '<p class="no-results">No articles found for this topic.</p>';
    } else {
        articles.forEach((article, index) => {
            const card = createArticleCard(article, index);
            elements.articlesList.appendChild(card);
        });
    }

    elements.resultsSection.classList.remove('hidden');
}

function createArticleCard(article, index) {
    const card = document.createElement('div');
    card.className = 'article-card' + (article.url_to_image ? '' : ' no-image');
    card.dataset.index = index;

    const imageHtml = article.url_to_image
        ? `<img src="${article.url_to_image}" alt="" class="article-image" loading="lazy">`
        : '';

    const date = article.published_at
        ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Unknown date';

    card.innerHTML = `
        ${imageHtml}
        <div class="article-content">
            <h4 class="article-title">${escapeHtml(article.title || 'No title')}</h4>
            <div class="article-meta">
                <span class="article-source">${escapeHtml(article.source || 'Unknown source')}</span>
                <span>${date}</span>
            </div>
            <button class="btn btn-summarize" data-index="${index}">Summarize</button>
        </div>
    `;

    const summarizeBtn = card.querySelector('.btn-summarize');
    summarizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSummary(article, summarizeBtn);
    });
    return card;
}

async function openSummary(article, btn) {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    elements.summaryTitle.textContent = article.title || 'No title';
    elements.summarySource.textContent = article.source || 'Unknown source';
    elements.summaryDate.textContent = article.published_at
        ? new Date(article.published_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'Unknown date';
    elements.summaryLink.href = article.url || '#';

    if (elements.summaryBadge) {
        elements.summaryBadge.textContent = 'Generating summary...';
        elements.summaryBadge.className = 'summary-badge generating';
    }
    if (elements.copySummaryBtn) {
        elements.copySummaryBtn.style.display = 'none';
    }

    elements.summaryContent.innerHTML = `
        <div class="streaming-placeholder">
            <span class="spinner-small"></span>
            AI is analyzing and generating the summary...
        </div>
    `;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Summarizing...';
    }

    elements.summarySection.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    currentRawSummary = '';

    try {
        const response = await fetch(`${API_BASE}/api/summarize-stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ article }),
            signal: currentAbortController.signal
        });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let receivedFirstChunk = false;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop();

            for (const event of events) {
                const trimmed = event.trim();
                if (!trimmed.startsWith('data:')) continue;
                const jsonStr = trimmed.replace(/^data:\s*/, '');
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }
                    if (parsed.chunk) {
                        if (!receivedFirstChunk) {
                            receivedFirstChunk = true;
                            elements.summaryContent.innerHTML = '';
                        }
                        currentRawSummary += parsed.chunk;
                        renderLiveSummary(currentRawSummary, true);
                    }
                } catch (parseErr) {
                    if (parseErr.name === 'AbortError') throw parseErr;
                    console.warn('Error parsing stream event:', parseErr);
                }
            }
        }

        renderLiveSummary(currentRawSummary, false);

        if (elements.summaryBadge) {
            elements.summaryBadge.textContent = 'Summary Ready';
            elements.summaryBadge.className = 'summary-badge ready';
        }
        if (elements.copySummaryBtn) {
            elements.copySummaryBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Summarize Error:', error);
        if (elements.summaryBadge) {
            elements.summaryBadge.textContent = 'Error';
            elements.summaryBadge.className = 'summary-badge error';
        }
        elements.summaryContent.innerHTML = `
            <div style="color: var(--error); padding: 0.5rem 0;">
                ⚠️ Failed to generate summary: ${escapeHtml(error.message)}
            </div>
        `;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Summarize';
        }
    }
}

function renderLiveSummary(text, isStreaming) {
    const formatted = formatMarkdown(text);
    const cursor = isStreaming ? '<span class="typing-cursor"></span>' : '';
    elements.summaryContent.innerHTML = formatted + cursor;

    if (elements.summaryBody) {
        elements.summaryBody.scrollTop = elements.summaryBody.scrollHeight;
    }
}

function formatMarkdown(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);

    // Headings
    escaped = escaped.replace(/^### (.*$)/gim, '<h4 class="summary-heading">$1</h4>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h3 class="summary-heading">$1</h3>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h2 class="summary-heading">$1</h2>');

    // Bold & Italics
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Lists & Paragraphs
    const lines = escaped.split('\n');
    let inList = false;
    let formattedLines = [];

    for (let line of lines) {
        const trimmed = line.trim();
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);

        if (bulletMatch) {
            if (!inList) {
                formattedLines.push('<ul class="summary-bullets">');
                inList = true;
            }
            formattedLines.push(`<li>${bulletMatch[1]}</li>`);
        } else {
            if (inList) {
                formattedLines.push('</ul>');
                inList = false;
            }
            if (trimmed.length > 0) {
                if (!trimmed.startsWith('<h') && !trimmed.startsWith('</h')) {
                    formattedLines.push(`<p>${line}</p>`);
                } else {
                    formattedLines.push(line);
                }
            }
        }
    }

    if (inList) {
        formattedLines.push('</ul>');
    }

    return formattedLines.join('');
}

function closeSummary() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
    elements.summarySection.classList.add('hidden');
    document.body.style.overflow = '';
}

function setLoading(loading) {
    elements.searchBtn.disabled = loading;
    elements.searchBtn.textContent = loading ? 'Searching...' : 'Search News';
    elements.loading.classList.toggle('hidden', !loading);
}

function hideResults() {
    elements.resultsSection.classList.add('hidden');
}

function hideSummary() {
    closeSummary();
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorSection.classList.remove('hidden');
    setTimeout(hideError, 5000);
}

function hideError() {
    elements.errorSection.classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}