import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompositionModule } from './composition/composition.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CompositionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
