import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ScraperModule } from './scraper.module';

/** Write-capable scraping is initialized only by the CLI, never the HTTP API. */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ScraperModule],
})
export class ScraperCliModule {}
