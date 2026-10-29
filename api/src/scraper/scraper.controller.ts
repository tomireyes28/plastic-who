import { Controller, Param, Post, Query } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('run-all')
  async runAllScrapers(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 30;
    const maxProducts =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 1000)
        : 30;

    return this.scraperService.scrapeAllBrands({ maxProducts });
  }

  @Post('run/:brandSlug')
  async runBrandScraper(
    @Param('brandSlug') brandSlug: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 30;
    const maxProducts =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 1000)
        : 30;

    return this.scraperService.scrapeBrandBySlug(brandSlug, { maxProducts });
  }
}
