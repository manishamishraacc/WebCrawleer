import { PlaywrightCrawler, CheerioCrawler, log, enqueueLinks } from 'crawlee';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { ScrapeRequest } from './validator';
import { logger } from './logger';

export interface ScrapedData {
  url: string;
  title: string;
  textContent: string;
  metadata: Record<string, string>;
}

// Decrease internal crawlee logging noise
log.setLevel(log.LEVELS.ERROR);

export async function runCrawler(request: ScrapeRequest): Promise<ScrapedData[]> {
  const results: ScrapedData[] = [];

  const requestHandler = async ({ request: req, page, $, body, enqueueLinks }: any) => {
    let title = '';
    let textContent = '';
    let metadata: Record<string, string> = {};
    const url = req.loadedUrl || req.url;
    const currentDepth = req.userData.depth || 0;

    try {
      if (request.crawlerType === 'playwright' && page) {
        title = await page.title();
        
        const metaTags = await page.$$eval('meta', (elements: any[]) => {
          const meta: Record<string, string> = {};
          elements.forEach((el: HTMLMetaElement) => {
            const name = el.getAttribute('name') || el.getAttribute('property');
            const content = el.getAttribute('content');
            if (name && content) {
              meta[name] = content;
            }
          });
          return meta;
        });
        metadata = metaTags;

        const html = await page.content();
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        
        if (article && typeof article.textContent === 'string') {
          textContent = article.textContent.trim();
          if (!title && typeof article.title === 'string') title = article.title;
        } else {
          // Fallback
          textContent = await page.$eval('body', (el: HTMLElement) => el.innerText);
        }

      } else if (request.crawlerType === 'cheerio' && $) {
        title = $('title').text();
        
        $('meta').each((_: any, el: any) => {
          const name = $(el).attr('name') || $(el).attr('property');
          const content = $(el).attr('content');
          if (name && content) {
            metadata[name] = content;
          }
        });

        const html = $.html();
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        
        if (article && typeof article.textContent === 'string') {
          textContent = article.textContent.trim();
          if (!title && typeof article.title === 'string') title = article.title;
        } else {
          // Fallback: strip scripts and styles manually
          $('script, style, noscript, iframe, nav, footer, header').remove();
          textContent = $('body').text();
        }
      }

      textContent = textContent.replace(/\s+/g, ' ').trim(); // Clean extra spaces

      results.push({
        url,
        title,
        textContent,
        metadata,
      });

      // Enqueue links if depth allows
      if (currentDepth < request.maxDepth) {
        await enqueueLinks({
          userData: { depth: currentDepth + 1 },
        });
      }
    } catch (err: any) {
      logger.error('Error processing page', { url, error: err.message });
    }
  };

  const initialRequests = request.urls.map((url) => ({
    url,
    userData: { depth: 0 },
  }));

  if (request.crawlerType === 'playwright') {
    const crawler = new PlaywrightCrawler({
      requestHandler,
      maxRequestsPerCrawl: 50,
      maxConcurrency: 5,
      requestHandlerTimeoutSecs: Math.floor(request.timeoutMs / 1000) || 30,
      headless: true,
      navigationTimeoutSecs: 30,
    });
    
    await crawler.run(initialRequests);
  } else {
    const crawler = new CheerioCrawler({
      requestHandler,
      maxRequestsPerCrawl: 50,
      maxConcurrency: 10,
      requestHandlerTimeoutSecs: Math.floor(request.timeoutMs / 1000) || 30,
    });
    
    await crawler.run(initialRequests);
  }

  return results;
}
