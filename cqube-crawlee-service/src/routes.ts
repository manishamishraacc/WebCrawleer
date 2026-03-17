import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ScrapeRequestSchema, isSafeUrl } from './validator';
import { runCrawler } from './crawler';
import { apiKeyAuth } from './middleware/auth';
import { logger } from './logger';

const router = Router();

// Apply auth middleware to all /api routes
router.use(apiKeyAuth);

router.post('/scrape', async (req: Request, res: Response) => {
  try {
    // 1. Validate request body
    const parseResult = ScrapeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        errors: parseResult.error.issues,
      });
    }

    const scrapeRequest = parseResult.data;

    // 2. Validate URLs for SSRF
    const unsafeUrls = scrapeRequest.urls.filter((url) => !isSafeUrl(url));
    if (unsafeUrls.length > 0) {
      logger.warn('SSRF validation failed', { unsafeUrls });
      return res.status(400).json({
        status: 'error',
        errors: [{ message: 'One or more URLs are unsafe or refer to private endpoints.' }],
      });
    }

    // 3. Optional Search integration (If 'query' is provided, we could hit a search API)
    // For this microservice, we will just log it and proceed to crawl `urls`.
    if (scrapeRequest.query) {
      logger.info(`Received search query: ${scrapeRequest.query}, but falling back to provided URLs.`);
    }

    // 4. Run crawler
    logger.info(`Starting crawler: ${scrapeRequest.crawlerType}`, { urls: scrapeRequest.urls });
    const scrapedData = await runCrawler(scrapeRequest);

    return res.json({
      status: 'success',
      data: scrapedData,
      errors: [],
    });
  } catch (error: any) {
    logger.error('Error in /scrape endpoint', { error: error.message });
    return res.status(500).json({
      status: 'error',
      errors: [{ message: 'Internal server error during scraping.' }],
    });
  }
});

export default router;
