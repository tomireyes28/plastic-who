import { Module } from '@nestjs/common';
import { CompositionParserService } from './composition-parser.service';
import { TrafficLightService } from './traffic-light.service';

@Module({
  providers: [TrafficLightService, CompositionParserService],
  exports: [TrafficLightService, CompositionParserService],
})
export class CompositionModule {}
