import { Controller, Param, Post, Query } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('run/:brandSlug')
  async runBrandScraper(
    @Param('brandSlug') brandSlug: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const maxProducts =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20;

    return this.scraperService.scrapeBrandBySlug(brandSlug, { maxProducts });
  }
}
