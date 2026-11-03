import { NestFactory } from '@nestjs/core';
import { ScraperCliModule } from './scraper-cli.module';
import { ScrapeExecutionSummary, ScraperService } from './scraper.service';
import { resolve } from 'node:path';
import { acquireScrapeLock, parseScrapeArguments } from './scrape-execution';

async function runCli() {
  const { target, maxProducts } = parseScrapeArguments(process.argv[2], process.argv[3]);
  const release = acquireScrapeLock(resolve(__dirname, '../../.scrape.lock'));
  const stop = () => { console.error('Scrape interrupted; partial writes may exist.'); release(); process.exit(1); };
  const deadline = setTimeout(stop, 12 * 60 * 1000);
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  let appContext: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;
  try {
    appContext = await NestFactory.createApplicationContext(ScraperCliModule);
    const scraperService = appContext.get(ScraperService);
    if (target === 'all') {
      const summaries = await scraperService.scrapeAllBrands({ maxProducts });
      console.log(
        'Resumen de ejecución (todas las marcas):',
        JSON.stringify(summaries, null, 2),
      );
    } else if (target.includes(',')) {
      const slugs = target.split(',').map((s) => s.trim());
      const summaries: ScrapeExecutionSummary[] = [];
      for (const slug of slugs) {
        summaries.push(
          await scraperService.scrapeBrandBySlug(slug, { maxProducts }),
        );
      }
      console.log(
        'Resumen de ejecución:',
        JSON.stringify(summaries, null, 2),
      );
    } else {
      const summary = await scraperService.scrapeBrandBySlug(target, {
        maxProducts,
      });
      console.log('Resumen de ejecución:', JSON.stringify(summary, null, 2));
    }
  } finally {
    try { await appContext?.close(); } finally {
      clearTimeout(deadline); process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); release();
    }
  }
}

runCli().catch((err) => {
  console.error('Error ejecutando el scraper:', err);
  process.exit(1);
});
