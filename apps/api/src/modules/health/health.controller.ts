import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowWithoutTenant } from '../../common/tenancy/tenant-required.guard';

// Fora do throttle global: uptime checks e probes do Cloud Run não podem
// tomar 429 (falso positivo de indisponibilidade).
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
  ) {}

  @Get()
  @AllowWithoutTenant()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
    ]);
  }
}
