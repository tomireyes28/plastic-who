import { TrafficLightColor } from '@prisma/client';

export interface GetProductsQueryDto {
  brandSlug?: string;
  fiber?: string;
  trafficLight?: TrafficLightColor;
  minNaturalPct?: number;
  category?: string;
  search?: string;
  limit?: number;
}
