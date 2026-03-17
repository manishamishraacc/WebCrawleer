import { z } from 'zod';
import * as net from 'net';
import ipaddr from 'ipaddr.js';

export const ScrapeRequestSchema = z.object({
  query: z.string().optional(),
  urls: z.array(z.string().url()).min(1),
  crawlerType: z.enum(['playwright', 'cheerio']).default('cheerio'),
  maxDepth: z.number().int().min(0).max(10).default(1),
  timeoutMs: z.number().int().min(1000).max(300000).default(30000),
});

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;

export function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }

    if (net.isIP(hostname)) {
      const addr = ipaddr.parse(hostname);
      const range = addr.range();
      // Block private, loopback, linkLocal, multicast, broadcast, and reserved ranges
      if (range !== 'unicast') {
         return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
