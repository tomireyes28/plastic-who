import { Module } from '@nestjs/common';
import { CompositionModule } from '../composition/composition.module';
import { IndiaStyleScraperAdapter } from './adapters/india-style-scraper.adapter';
import { MarkovaScraperAdapter } from './adapters/markova-scraper.adapter';
import { VtexScraperAdapter } from './adapters/vtex-scraper.adapter';
import { WanamaScraperAdapter } from './adapters/wanama-scraper.adapter';
import { STORE_SCRAPER_ADAPTERS } from './interfaces/store-scraper-adapter.interface';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

@Module({
  imports: [CompositionModule],
  controllers: [ScraperController],
  providers: [
    WanamaScraperAdapter,
    MarkovaScraperAdapter,
    IndiaStyleScraperAdapter,
    {
      provide: STORE_SCRAPER_ADAPTERS,
      useFactory: (
        wanamaAdapter: WanamaScraperAdapter,
        markovaAdapter: MarkovaScraperAdapter,
        indiaStyleAdapter: IndiaStyleScraperAdapter,
      ) => [
        wanamaAdapter,
        markovaAdapter,
        indiaStyleAdapter,
        new VtexScraperAdapter({
          name: 'Portsaid',
          slug: 'portsaid',
          websiteUrl: 'https://www.portsaid.com.ar',
          platform: 'VTEX',
          isKnownBrand: true,
        }),
        new VtexScraperAdapter({
          name: 'Desiderata',
          slug: 'desiderata',
          websiteUrl: 'https://www.desiderata.com.ar',
          platform: 'VTEX',
          isKnownBrand: true,
        }),
      ],
      inject: [
        WanamaScraperAdapter,
        MarkovaScraperAdapter,
        IndiaStyleScraperAdapter,
      ],
    },
    ScraperService,
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
