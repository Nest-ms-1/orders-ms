import 'dotenv/config'
import * as Joi from 'joi'

interface EnvVars {
  PORT: number

  // PRODUCTS_MICROSERVICE_PORT: number
  // PRODUCTS_MICROSERVICE_HOST: string
  NATS_SERVERS: string[]
}

const envsSchema = Joi.object({
  PORT: Joi.number().required(),

  // PRODUCTS_MICROSERVICE_PORT: Joi.number().required(),
  // PRODUCTS_MICROSERVICE_HOST: Joi.string().required(),
  NATS_SERVERS: Joi.array().items(Joi.string()).required(),
}).unknown(true)

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
})

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}
const envsVars: EnvVars = value
export const envs = {
  port: envsVars.PORT,

  natsServers: envsVars.NATS_SERVERS,
  // productsMicroservicePort: envsVars.PRODUCTS_MICROSERVICE_PORT,
  // productsMicroserviceHost: envsVars.PRODUCTS_MICROSERVICE_HOST,
}
