import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ClientProxy, RpcException } from '@nestjs/microservices'
import { PrismaClient } from '@prisma/client'
import { firstValueFrom } from 'rxjs'
import { NAST_SERVICE, PRODUCT_SERVICE } from 'src/config'
import { ChangeOrderStatusDto, OrderItemDto, PaidOrderDto } from './dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderPagintationDto } from './dto/order-pagination.dto'
import { OrderWithProducts } from './interfaces/order-with-products.interface'
import { IsCurrency } from 'class-validator'

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  logger = new Logger('OrdersServices')

  constructor(@Inject(NAST_SERVICE) private readonly client: ClientProxy) {
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
        this.client.send({ cmd: 'validate_products' }, productsIds)
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
      this.client.send({ cmd: 'validate_products' }, productsIds)
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

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map((orderItem) => ({
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
        })),
      })
    )
    return paymentSession
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    this.logger.log(`Order paid: ${{ paidOrderDto }}`)

    const order = await this.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,

        //Relacion
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl,
          },
        },
      },
    })
    return order
  }
}
