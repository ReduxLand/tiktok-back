import mongoose from 'mongoose'
import { Logger } from 'winston'
import http, { Server } from 'http'
import bodyParser from 'body-parser'
import { Connection } from 'mongoose'
import cors, { CorsOptions } from 'cors'
import { Server as SocketIOServer } from 'socket.io'
import express, { Application, Router } from 'express'
import { isProd as isProduction, initLogger } from './util'

export default class App {
  public port: number
  public logger: Logger
  public app: Application
  public httpServer: Server
  public socketIO: SocketIOServer
  public dbConnection: Connection

  private _dbInitPromise: Promise<void>

  constructor(port: number, router: Router, ioCtrlMiddleware?: (io: SocketIOServer) => void) {
    this.port = port
    this.app = express()
    this.logger = initLogger()
    this.httpServer = http.createServer(this.app)
    this.socketIO = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.CONRTOL_PANEL_HOST || '*',
        methods: ['GET', 'POST'],
      },
    })

    this._initMiddlewares()
    this._initRouter(router)

    if (ioCtrlMiddleware) {
      this._initSocketIO(ioCtrlMiddleware)
    }

    if (process.env.MONGODB_URI) {
      this._initDB()
    }
  }

  private _initMiddlewares() {
    const corsOptions: CorsOptions = {
      origin: process.env.CONRTOL_PANEL_HOST || '*', // На wildcard не работает передача credentials
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      // allowedHeaders: ['Authorization'], // TODO прописать нужные заголовки
      credentials: true,
    }

    /**
     * Nginx
     * proxy_set_header X-Forwarded-Proto $scheme;
     * proxy_set_header X-Forwarded-For $remote_addr;
     * proxy_set_header X-Client-IP $remote_addr;
     *
     */
    if (isProduction()) {
      this.app.enable('trust proxy') // Устанавливаем req.ip, т.о. req.connection.remoteAddress больше не актуален
    }

    this.app.use(cors(corsOptions))
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({ extended: false })) // Сложный парсинг не нужен, на выходе хотим строки и массивы
  }

  private _initRouter(router: Router) {
    this.app.use(router)
  }

  private _initSocketIO(ioCtrlMiddleware: (io: SocketIOServer) => void) {
    ioCtrlMiddleware(this.socketIO)
  }

  private _initDB() {
    mongoose.connect(process.env.MONGODB_URI, {
      // autoIndex: false, // Если мы внезапно добавим индекс на коллекцию с 1кк записей, старт приложения может затянуться
      useCreateIndex: true,
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
    })

    this._dbInitPromise = new Promise((resolve, reject) => {
      this.dbConnection = mongoose.connection
      this.dbConnection.on('error', () => {
        reject(new Error('MongoDB connection error'))
      })
      this.dbConnection.once('open', () => {
        resolve()
      })
    })
  }

  public async listen() {
    await this._dbInitPromise.catch((error) => {
      this.logger.error('', error)
      throw error
    })

    this.logger.debug('MongoDB connected')
    this.httpServer.listen(this.port, () => {
      this.logger.debug('Live')
    })
  }
}
