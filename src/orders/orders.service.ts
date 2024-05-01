import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ClientProxy, RpcException } from '@nestjs/microservices'
import { PrismaClient } from '@prisma/client'
import { firstValueFrom } from 'rxjs'
import { PRODUCT_SERVICE } from 'src/config'
import { ChangeOrderStatusDto } from './dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderPagintationDto } from './dto/order-pagination.dto'

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  logger = new Logger('OrdersServices')

  constructor(@Inject(PRODUCT_SERVICE) private readonly productsClient: ClientProxy) {
    super()
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Connected to database')
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      // 1. confirmar los productos
      const productsIds = createOrderDto.items.map((item) => item.productId)
      const products = await firstValueFrom(
        this.productsClient.send({ cmd: 'validate_products' }, productsIds)
      )

      // 2. calcular el total
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find((product) => product.id === orderItem.productId).price
        return price * orderItem.quantity
      }, 0)

      // 3. totalItems
      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity
      }, 0)

      //  4. crear transaccion de bd
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find((product) => product.id === orderItem.productId).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      })
      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId).name,
        })),
      }
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check products failed',
      })
    }
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
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    })

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      })
    }

    const productsIds = order.OrderItem.map((orderItem) => orderItem.productId)

    const products: any[] = await firstValueFrom(
      this.productsClient.send({ cmd: 'validate_products' }, productsIds)
    )

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId).name,
      })),
    }
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
