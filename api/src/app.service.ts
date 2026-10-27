import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'plastic-who-api',
      timestamp: new Date().toISOString(),
    };
  }
}
