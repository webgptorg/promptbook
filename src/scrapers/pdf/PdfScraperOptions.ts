import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';

/**
 * Options for PdfScraper
 */
export type PdfScraperOptions = PrepareAndScrapeOptions; /*
                                  <- TODO: [🍇] Do not need all things from `PrepareAndScrapeOptions`,
                                          `Pick` just used in scraper
*/
