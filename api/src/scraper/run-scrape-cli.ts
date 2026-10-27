import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ScraperService } from './scraper.service';

async function runCli() {
  const brandSlug = process.argv[2] || 'wanama';
  const maxProducts = process.argv[3] ? parseInt(process.argv[3], 10) : 15;

  const appContext = await NestFactory.createApplicationContext(AppModule);
  try {
    const scraperService = appContext.get(ScraperService);
    const summary = await scraperService.scrapeBrandBySlug(brandSlug, {
      maxProducts,
    });
    console.log('Resumen de ejecución:', JSON.stringify(summary, null, 2));
  } finally {
    await appContext.close();
  }
}

runCli().catch((err) => {
  console.error('Error ejecutando el scraper:', err);
  process.exit(1);
});
