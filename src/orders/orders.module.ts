import { Module } from '@nestjs/common'
import { NatsModule } from 'src/transports/nats.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    NatsModule,
    // ClientsModule.register([
    //   {
    //     name: PRODUCT_SERVICE,
    //     // transport: Transport.TCP,
    //     // options: { port: envs.productsMicroservicePort, host: envs.productsMicroserviceHost },
    //   },
    // ]),
  ],
})
export class OrdersModule {}
