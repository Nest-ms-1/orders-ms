import 'dotenv/config'
import * as Joi from 'joi'

interface EnvVars {
  PORT: number

  PRODUCTS_MICROSERVICE_PORT: number
  PRODUCTS_MICROSERVICE_HOST: string
}

const envsSchema = Joi.object({
  PORT: Joi.number().required(),

  PRODUCTS_MICROSERVICE_PORT: Joi.number().required(),
  PRODUCTS_MICROSERVICE_HOST: Joi.string().required(),
}).unknown(true)

const { error, value } = envsSchema.validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}
const envsVars: EnvVars = value
export const envs = {
  port: envsVars.PORT,

  productsMicroservicePort: envsVars.PRODUCTS_MICROSERVICE_PORT,
  productsMicroserviceHost: envsVars.PRODUCTS_MICROSERVICE_HOST,
}
