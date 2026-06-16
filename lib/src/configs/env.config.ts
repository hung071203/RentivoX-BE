import 'dotenv/config';
import * as Joi from 'joi';

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().optional().allow(''),
  DB_NAME: Joi.string().required(),

  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(6).required(),

  CORS_ORIGIN: Joi.string().default('http://localhost:3001'),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string().required(),
  MAIL_PASS: Joi.string().required(),
  MAIL_FROM: Joi.string().required(),
}).unknown(true);

const { error, value } = schema.validate(process.env);
if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

export const ENV = {
  nodeEnv: value.NODE_ENV as string,
  port: value.PORT as number,
  db: {
    host: value.DB_HOST as string,
    port: value.DB_PORT as number,
    username: value.DB_USERNAME as string,
    password: value.DB_PASSWORD as string,
    name: value.DB_NAME as string,
  },
  corsOrigin: value.CORS_ORIGIN as string,
  jwt: {
    secret: value.JWT_SECRET as string,
    expiresIn: value.JWT_EXPIRES_IN as string,
  },
  admin: {
    email: value.ADMIN_EMAIL as string,
    password: value.ADMIN_PASSWORD as string,
  },
  redis: {
    host: value.REDIS_HOST as string,
    port: value.REDIS_PORT as number,
    password: value.REDIS_PASSWORD as string,
  },
  mail: {
    host: value.MAIL_HOST as string,
    port: value.MAIL_PORT as number,
    user: value.MAIL_USER as string,
    pass: value.MAIL_PASS as string,
    from: value.MAIL_FROM as string,
  },
};
