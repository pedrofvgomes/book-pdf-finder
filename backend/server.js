import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const app = express();
const PORT = 3001;
const SEARCH_TIMEOUT_MS = 8000;
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const searchCache = new Map();

app.use(cors({
    origin: ['https://pedrofvgomes.github.io', 'http://localhost:5173'],
}));

const isPdfUrl = (rawUrl) => {
    if (!rawUrl) return false;

    try {
        const parsedUrl = new URL(rawUrl);
        return parsedUrl.pathname.toLowerCase().endsWith('.pdf');
    } catch {
        return false;
    }
};

const extractPdfResultUrl = (href) => {
    if (!href) return null;

    try {
        const duckDuckGoUrl = new URL(href, 'https://duckduckgo.com');
        const redirectedUrl = duckDuckGoUrl.searchParams.get('uddg');
        if (redirectedUrl && isPdfUrl(redirectedUrl)) return redirectedUrl;
    } catch {
        return null;
    }

    const absoluteUrl = href.startsWith('//') ? `https:${href}` : href;
    return isPdfUrl(absoluteUrl) ? absoluteUrl : null;
};

// PDF search endpoint
app.get('/search', async (req, res) => {
    const query = req.query.q?.trim();
    if (!query) return res.status(400).json({ error: 'Missing query parameter' });

    const normalizedQuery = query.toLowerCase();
    const cachedResult = searchCache.get(normalizedQuery);
    if (cachedResult && cachedResult.expiresAt > Date.now()) {
        return res.json({ results: cachedResult.results, cached: true });
    }

    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query + ' filetype:pdf')}`;
    console.log('Fetching DuckDuckGo URL:', url);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), SEARCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
            signal: abortController.signal,
        });

        if (!response.ok) {
            throw new Error(`DuckDuckGo response was ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const pdfLinks = new Set();

        $('a.result__a').each((i, el) => {
            const href = $(el).attr('href');
            const resolvedPdfUrl = extractPdfResultUrl(href);
            if (resolvedPdfUrl) pdfLinks.add(resolvedPdfUrl);
        });

        const results = [...pdfLinks];
        searchCache.set(normalizedQuery, {
            results,
            expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        });

        console.log('Final PDF links:', results);
        res.json({ results });
    } catch (err) {
        console.error('Error fetching/parsing DuckDuckGo:', err);
        if (cachedResult) {
            return res.json({ results: cachedResult.results, cached: true, stale: true });
        }

        res.status(200).json({
            results: [],
            error: 'Search is temporarily unavailable. Please try again.',
        });
    } finally {
        clearTimeout(timeoutId);
    }
});


// PDF proxy endpoint
app.get('/proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    try {
        const response = await fetch(url);
        if (!response.ok) return res.status(response.status).send('Error fetching PDF');

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(buffer));
    } catch (err) {
        console.error('Error fetching PDF:', err);
        res.status(500).json({ error: 'Error fetching PDF' });
    }
});


app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
