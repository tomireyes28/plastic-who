import { Controller, Get, Query } from '@nestjs/common';
import { TrafficLightColor } from '@prisma/client';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('brands')
  getBrands() {
    return this.catalogService.getBrands();
  }

  @Get('categories')
  getCategories(@Query('brand') brandSlug?: string) {
    return this.catalogService.getCategories(brandSlug);
  }

  @Get('products')
  getProducts(
    @Query('brand') brandSlug?: string,
    @Query('fiber') fiber?: string,
    @Query('trafficLight') trafficLight?: string,
    @Query('minNaturalPct') minNaturalPct?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const validTrafficLight =
      trafficLight && ['GREEN', 'YELLOW', 'RED'].includes(trafficLight.toUpperCase())
        ? (trafficLight.toUpperCase() as TrafficLightColor)
        : undefined;

    const parsedMinPct = minNaturalPct ? parseFloat(minNaturalPct) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    return this.catalogService.getProducts({
      brandSlug,
      fiber,
      trafficLight: validTrafficLight,
      minNaturalPct: Number.isFinite(parsedMinPct) ? parsedMinPct : undefined,
      category,
      search,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }
}
