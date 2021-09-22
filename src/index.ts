import dotEnv from 'dotenv'

// Импортим переменные окружения
dotEnv.config()

// И только после них модули, где они используются
import App from './app'
import { ioCtrl } from './socket'
import { MainRouter } from './router'
import { initLogger } from './util'

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'SESSION_SECRET',
  'BACKEND_API_HOST',
  'CONTROL_PANEL_HOST',
]

for (const environmentVariable of REQUIRED_ENV_VARS) {
  if (!process.env[environmentVariable]) {
    throw new Error(`${environmentVariable} environment variable doesn't provided`)
  }
}

const log = initLogger()
const app = new App(Number.parseInt(process.env.PORT) || 3000, MainRouter, ioCtrl)
app.listen()

// TypeScript Workaround
;(<NodeJS.EventEmitter>process).on('uncaughtException', (error, origin) => {
  log.error('', error, origin)
})

process.on('unhandledRejection', (reason, promise) => {
  log.error('', reason)
})
