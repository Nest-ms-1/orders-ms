import { IsEnum, IsOptional } from 'class-validator'
import { PaginationDto } from 'src/common'
import { OrderStatusList } from '../enum/order.enum'
import { OrderStatus } from '@prisma/client'

export class OrderPagintationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: `Possible values are ${OrderStatusList}` })
  status: OrderStatus
}
