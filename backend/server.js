import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const app = express();
const PORT = 3001;

app.use(cors({
    origin: ['https://pedrofvgomes.github.io', 'http://localhost:5173'],
}));

// PDF search endpoint
app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing query parameter' });

    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query + ' filetype:pdf')}`;
    console.log('Fetching DuckDuckGo URL:', url);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        const pdfLinks = [];

        $('a.result__a').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                // DuckDuckGo redirects PDF links with 'uddg' param
                if (href.includes('/l/?uddg=')) {
                    const urlObj = new URL('https://duckduckgo.com' + href);
                    const realUrl = urlObj.searchParams.get('uddg');
                    if (realUrl && realUrl.endsWith('.pdf')) {
                        pdfLinks.push(realUrl);
                    }
                } else if (href.endsWith('.pdf')) {
                    pdfLinks.push(href);
                }
            }
        });

        console.log('Final PDF links:', pdfLinks);
        res.json({ results: pdfLinks });
    } catch (err) {
        console.error('Error fetching/parsing DuckDuckGo:', err);
        res.status(500).json({ error: 'Error fetching search results' });
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
