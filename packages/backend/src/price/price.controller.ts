import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PriceService } from './price.service';

@ApiTags('prices')
@Controller('prices')
export class PriceController {
  constructor(private priceService: PriceService) {}

  @Get()
  @ApiOperation({ summary: 'Get token prices in USD' })
  @ApiResponse({
    status: 200,
    description: 'Token prices',
    schema: {
      example: {
        ethereum: 3500.25,
        'usd-coin': 0.999,
        tether: 0.998,
        dai: 1.0,
      },
    },
  })
  async getPrices() {
    return this.priceService.getPrices();
  }
}
