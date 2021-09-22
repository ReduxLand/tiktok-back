import { Logger, format, transports, createLogger } from 'winston'
import { isProd as isProduction } from './index'

const { combine, timestamp, label, printf } = format

export function initLogger(module = 'App'): Logger {
  const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}] ${label} > ${message}`
  })

  const logger = createLogger({
    format: combine(label({ label: module }), timestamp(), myFormat),
    transports: [new transports.Console({ level: 'debug' })],
  })

  logger.add(
    new transports.File({
      filename: `logs/${module}.log`,
      level: isProduction() ? 'info' : 'debug',
      format: format.json(),
      maxsize: 10_485_760, // 10 метров максимальнй размер лога
    }),
  )

  return logger
}
