import { createLogger, format, transports } from 'winston'

const { combine, printf, colorize, timestamp } = format

const logger = createLogger({
  level: 'debug',
  format: combine(
    colorize(),
    timestamp(),
    printf(i => `${i.timestamp} ${i.level} ${i.message}`)
  ),
  transports: [
    new transports.Console()
  ]
})

export default logger
