import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CompositionParserService } from '../composition/composition-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScrapeOptions,
  STORE_SCRAPER_ADAPTERS,
  StoreScraperAdapter,
} from './interfaces/store-scraper-adapter.interface';

export interface ScrapeExecutionSummary {
  brand: string;
  scrapedCount: number;
  withCompositionCount: number;
  withoutCompositionCount: number;
  updatedAt: string;
}

@Injectable()
export class ScraperService implements OnModuleInit {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly compositionParser: CompositionParserService,
    @Inject(STORE_SCRAPER_ADAPTERS)
    private readonly adapters: StoreScraperAdapter[],
  ) {}

  async onModuleInit() {
    await this.ensureRegisteredBrandsExist();
  }

  /**
   * Registra en la base de datos todas las marcas que tienen un Adapter configurado.
   */
  async ensureRegisteredBrandsExist(): Promise<void> {
    for (const adapter of this.adapters) {
      const meta = adapter.brandMetadata;
      await this.prisma.brand.upsert({
        where: { slug: meta.slug },
        update: {
          name: meta.name,
          websiteUrl: meta.websiteUrl,
          platform: meta.platform,
          isKnownBrand: meta.isKnownBrand,
        },
        create: {
          name: meta.name,
          slug: meta.slug,
          websiteUrl: meta.websiteUrl,
          platform: meta.platform,
          isKnownBrand: meta.isKnownBrand,
        },
      });
    }
  }

  /**
   * Ejecuta el scraper para una marca específica, analiza su composición y guarda en Supabase.
   */
  async scrapeBrandBySlug(
    brandSlug: string,
    options?: ScrapeOptions,
  ): Promise<ScrapeExecutionSummary> {
    const adapter = this.adapters.find(
      (a) => a.brandMetadata.slug === brandSlug.toLowerCase(),
    );

    if (!adapter) {
      throw new NotFoundException(
        `No existe un adaptador de scraping configurado para la marca "${brandSlug}"`,
      );
    }

    const brand = await this.prisma.brand.upsert({
      where: { slug: adapter.brandMetadata.slug },
      update: {},
      create: {
        name: adapter.brandMetadata.name,
        slug: adapter.brandMetadata.slug,
        websiteUrl: adapter.brandMetadata.websiteUrl,
        platform: adapter.brandMetadata.platform,
        isKnownBrand: adapter.brandMetadata.isKnownBrand,
      },
    });

    const rawProducts = await adapter.scrapeCatalog(options);
    const now = new Date();

    let withCompositionCount = 0;
    let withoutCompositionCount = 0;

    for (const item of rawProducts) {
      const analysis = this.compositionParser.parseFromText(item.description);

      // Solo guardamos como activas en el catálogo las prendas que declaran composición
      const hasValidComposition = analysis.fibers.length > 0;
      if (hasValidComposition) {
        withCompositionCount++;
      } else {
        withoutCompositionCount++;
      }

      await this.prisma.$transaction(async (tx) => {
        const upsertedProduct = await tx.product.upsert({
          where: {
            brandId_externalId: {
              brandId: brand.id,
              externalId: item.externalId,
            },
          },
          update: {
            name: item.name,
            slug: item.slug,
            productUrl: item.productUrl,
            imageUrl: item.imageUrl,
            price: item.price,
            specialPrice: item.specialPrice,
            category: item.category,
            description: item.description,
            rawComposition: analysis.rawComposition,
            naturalPercentage: analysis.naturalPercentage,
            semiSyntheticPercentage: analysis.semiSyntheticPercentage,
            syntheticPercentage: analysis.syntheticPercentage,
            trafficLight: analysis.trafficLight,
            hasSyntheticLining: analysis.hasSyntheticLining,
            inStock: item.inStock,
            isActive: item.inStock && hasValidComposition,
            lastSeenAt: now,
          },
          create: {
            brandId: brand.id,
            externalId: item.externalId,
            name: item.name,
            slug: item.slug,
            productUrl: item.productUrl,
            imageUrl: item.imageUrl,
            price: item.price,
            specialPrice: item.specialPrice,
            category: item.category,
            description: item.description,
            rawComposition: analysis.rawComposition,
            naturalPercentage: analysis.naturalPercentage,
            semiSyntheticPercentage: analysis.semiSyntheticPercentage,
            syntheticPercentage: analysis.syntheticPercentage,
            trafficLight: analysis.trafficLight,
            hasSyntheticLining: analysis.hasSyntheticLining,
            inStock: item.inStock,
            isActive: item.inStock && hasValidComposition,
            lastSeenAt: now,
          },
        });

        await tx.productFiber.deleteMany({
          where: { productId: upsertedProduct.id },
        });

        if (analysis.fibers.length > 0) {
          await tx.productFiber.createMany({
            data: analysis.fibers.map((f) => ({
              productId: upsertedProduct.id,
              fiberName: f.fiberName,
              category: f.category,
              percentage: f.percentage,
              isLining: f.isLining,
            })),
          });
        }
      });
    }

    await this.prisma.brand.update({
      where: { id: brand.id },
      data: { lastScrapedAt: now },
    });

    this.logger.log(
      `Scraping finalizado para ${brand.name}: ${withCompositionCount} con composición, ${withoutCompositionCount} sin composición.`,
    );

    return {
      brand: brand.name,
      scrapedCount: rawProducts.length,
      withCompositionCount,
      withoutCompositionCount,
      updatedAt: now.toISOString(),
    };
  }
}
