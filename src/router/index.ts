import { Router, Request, Response } from 'express'
import { initLogger } from '../util'
import { AuthRouter } from './auth'
import { UserRouter } from './user'
import { TikTokRouter } from './tiktok'
import { CampaignsRouter } from './campaigns'
import { MediaLibraryRouter } from './media-library'
import { MediaLibraryPublicRouter } from './media-library/public'
import { TikTokAccountsRouter } from './tiktok-accounts'
import {
  respondClientError,
  respondServerError,
} from './util'
import {
  checkAuth,
  publicAccess,
  restrictedAccess,
} from './middleware'

export const MainRouter = Router()
const log = initLogger('Router.Main')

export type TJwtPayload = {
  // ID сессии пользователя
  ssid: string

  // Username пользователя в системе (в lowercase)
  user: string
}

MainRouter.use('/api/v1/auth', checkAuth, AuthRouter)
MainRouter.use('/api/v1/user', restrictedAccess, UserRouter)
MainRouter.use('/api/v1/tiktok', restrictedAccess, TikTokRouter)
MainRouter.use('/api/v1/campaigns', restrictedAccess, CampaignsRouter)
MainRouter.use('/api/v1/media-library', publicAccess, MediaLibraryPublicRouter) // Порядок важен, сначала публичный
MainRouter.use('/api/v1/media-library', restrictedAccess, MediaLibraryRouter)
MainRouter.use('/api/v1/tiktok-accounts', restrictedAccess, TikTokAccountsRouter)

// Обработка несуществующих путей маршрутов.
MainRouter.use((request: Request, response: Response) => {
  log.error('Запрошен несуществующий endpoint.', { route: request.route })
  return respondClientError(
    response,
    new Error('Запрашиваемой конечной точки не существует.'),
    log,
    404,
  )
})

// Неотловленные ошибки в роутах, которые должны возвращать стандартную 500 ошибку, обрабатываются здесь.
MainRouter.use((error: Error, request: Request, response: Response) => {
  return respondServerError(response, error, log)
})
