import { Module } from '@nestjs/common';
import { CompositionModule } from '../composition/composition.module';
import { FunkyMonkeysScraperAdapter } from './adapters/funky-monkeys-scraper.adapter';
import { IndiaStyleScraperAdapter } from './adapters/india-style-scraper.adapter';
import { KosiukoScraperAdapter } from './adapters/kosiuko-scraper.adapter';
import { MarkovaScraperAdapter } from './adapters/markova-scraper.adapter';
import { OnePlaceWorldScraperAdapter } from './adapters/one-place-world-scraper.adapter';
import { PaulaCahenDanversScraperAdapter } from './adapters/paula-cahen-danvers-scraper.adapter';
import { RapsodiaScraperAdapter } from './adapters/rapsodia-scraper.adapter';
import { ReirEnloquecerScraperAdapter } from './adapters/reir-enloquecer-scraper.adapter';
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
    PaulaCahenDanversScraperAdapter,
    RapsodiaScraperAdapter,
    KosiukoScraperAdapter,
    OnePlaceWorldScraperAdapter,
    ReirEnloquecerScraperAdapter,
    FunkyMonkeysScraperAdapter,
    {
      provide: STORE_SCRAPER_ADAPTERS,
      useFactory: (
        wanamaAdapter: WanamaScraperAdapter,
        markovaAdapter: MarkovaScraperAdapter,
        indiaStyleAdapter: IndiaStyleScraperAdapter,
        paulaAdapter: PaulaCahenDanversScraperAdapter,
        rapsodiaAdapter: RapsodiaScraperAdapter,
        kosiukoAdapter: KosiukoScraperAdapter,
        onePlaceWorldAdapter: OnePlaceWorldScraperAdapter,
        reirAdapter: ReirEnloquecerScraperAdapter,
        funkyMonkeysAdapter: FunkyMonkeysScraperAdapter,
      ) => [
        wanamaAdapter,
        markovaAdapter,
        indiaStyleAdapter,
        paulaAdapter,
        rapsodiaAdapter,
        kosiukoAdapter,
        onePlaceWorldAdapter,
        reirAdapter,
        funkyMonkeysAdapter,
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
        new VtexScraperAdapter({
          name: '47 Street',
          slug: '47-street',
          websiteUrl: 'https://www.47street.com.ar',
          platform: 'VTEX',
          isKnownBrand: true,
        }),
      ],
      inject: [
        WanamaScraperAdapter,
        MarkovaScraperAdapter,
        IndiaStyleScraperAdapter,
        PaulaCahenDanversScraperAdapter,
        RapsodiaScraperAdapter,
        KosiukoScraperAdapter,
        OnePlaceWorldScraperAdapter,
        ReirEnloquecerScraperAdapter,
        FunkyMonkeysScraperAdapter,
      ],
    },
    ScraperService,
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
