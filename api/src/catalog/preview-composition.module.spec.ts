import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CompositionParserService } from '../composition/composition-parser.service';
import { PreviewCompositionModule } from './preview-composition.module';

describe('Read-only preview bootstrap (H06)', () => {
  it('does not register brands or initialize a scraper at startup', async () => {
    const upsert = jest.fn();
    const context = await Test.createTestingModule({ imports: [PreviewCompositionModule] })
      .overrideProvider(PrismaService).useValue({ brand: { upsert } }).compile();
    try {
      await context.init();
      expect(context.get(CompositionParserService)).toBeInstanceOf(CompositionParserService);
      expect(upsert).not.toHaveBeenCalled();
    } finally { await context.close(); }
  });
});
