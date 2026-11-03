import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { PrismaModule } from '../prisma/prisma.module';
import { CompositionModule } from '../composition/composition.module';

/** Deliberately excludes the write-capable scraping module and its startup hooks. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: resolve(process.cwd(), 'api/.env') }),
    PrismaModule, CompositionModule,
  ],
})
export class PreviewCompositionModule {}
