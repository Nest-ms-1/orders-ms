import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { PaginationDto } from 'src/common'
import { PrismaClient } from '@prisma/client'
import { RpcException } from '@nestjs/microservices'
import { OrderPagintationDto } from './dto/order-pagination.dto'
import { ChangeOrderStatusDto } from './dto'

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  logger = new Logger('OrdersServices')
  async onModuleInit() {
    await this.$connect()
    this.logger.log('Connected to database')
  }

  create(createOrderDto: CreateOrderDto) {
    return this.order.create({
      data: createOrderDto,
    })
  }

  async findAll(orderPagintationDto: OrderPagintationDto) {
    const { page, limit, status } = orderPagintationDto
    const totalPage = await this.order.count({ where: { status } })
    const lastPage = Math.ceil(totalPage / limit)
    return {
      data: await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { status: status },
      }),
      meta: {
        totalPage,
        page,
        lastPage,
      },
    }
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
    })

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      })
    }

    return order
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto
    const order = await this.findOne(id)

    if (order.status === status) {
      return order
    }

    return this.order.update({
      where: { id },
      data: { status },
    })
  }
}
