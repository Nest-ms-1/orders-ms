import { Controller, NotImplementedException, ParseUUIDPipe } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { PaginationDto } from 'src/common'
import { OrderPagintationDto } from './dto/order-pagination.dto'
import { ChangeOrderStatusDto } from './dto'

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('create_order')
  create(@Payload() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto)
  }

  @MessagePattern('find_all_orders')
  findAll(@Payload() orderPagintationDto: OrderPagintationDto) {
    return this.ordersService.findAll(orderPagintationDto)
  }

  @MessagePattern('find_one_order')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id)
  }

  @MessagePattern('change-order-status')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.changeOrderStatus(changeOrderStatusDto)
  }
}
