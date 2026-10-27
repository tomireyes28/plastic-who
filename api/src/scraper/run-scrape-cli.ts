import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ScrapeExecutionSummary, ScraperService } from './scraper.service';

async function runCli() {
  const target = (process.argv[2] || 'all').toLowerCase();
  const maxProducts = process.argv[3] ? parseInt(process.argv[3], 10) : 30;

  const appContext = await NestFactory.createApplicationContext(AppModule);
  try {
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
    await appContext.close();
  }
}

runCli().catch((err) => {
  console.error('Error ejecutando el scraper:', err);
  process.exit(1);
});
