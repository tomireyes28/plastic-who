import { Module } from '@nestjs/common';
import { CompositionModule } from '../composition/composition.module';
import { WanamaScraperAdapter } from './adapters/wanama-scraper.adapter';
import { STORE_SCRAPER_ADAPTERS } from './interfaces/store-scraper-adapter.interface';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

@Module({
  imports: [CompositionModule],
  controllers: [ScraperController],
  providers: [
    WanamaScraperAdapter,
    {
      provide: STORE_SCRAPER_ADAPTERS,
      useFactory: (wanamaAdapter: WanamaScraperAdapter) => [wanamaAdapter],
      inject: [WanamaScraperAdapter],
    },
    ScraperService,
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
