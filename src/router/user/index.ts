import { Router, Request, Response } from 'express'
import { respondPayload, respondClientError, respondServerError } from '../util'
import { initLogger } from '../../util'
import { TUserSettings } from './types'

export const UserRouter = Router()
const log = initLogger('Router.User')

UserRouter.get('/settings', (request: Request, response: Response) => {
  const { user } = response.locals

  if (!user) {
    return respondClientError(response, new Error('Unauthorized.'), log, 401)
  }

  return respondPayload(response, true, {
    tiktokApp: {
      id: user.tiktokApp?.id || '',
      secret: user.tiktokApp?.secret || '',
      oauthUrl: user.tiktokApp?.oauthUrl || '',
    },
  })
})

// TODO здесь и везде воспользоваться пакетом joi для валидации полезной нагрузки
UserRouter.post('/settings', (request: Request, response: Response) => {
  const { user } = response.locals
  const { tiktokApp } = request.body as TUserSettings

  if (!user) {
    return respondClientError(response, new Error('Unauthorized.'), log, 401)
  } else if (!tiktokApp) {
    return respondClientError(response, new Error('Информации о приложении не было передано.'), log)
  }

  const { id: appId, secret: appSecret, oauthUrl: appOauth } = tiktokApp

  // Нам не нужно логировать такие ошибки, поэтому мы не передаём в функцию ответа объект логгера.
  if (!appId || appId.length !== 19 || !/^\d{19}$/.test(appId)) {
    return respondClientError(response, new Error('App ID должен состоять из 19 цифр.'))
  }
  if (!appSecret || appSecret.length !== 40 || !/^[\da-f]{40}$/i.test(appSecret)) {
    return respondClientError(response, new Error('App Secret должен состоять из 40 hex-символов.'))
  }
  // TODO проверка параметров и их значений
  if (!appOauth || !/^https:\/\/ads\.tiktok\.com\/marketing_api\/auth\?[^/]+/i.test(appOauth)) {
    return respondClientError(response, new Error('Невалидное значение OAuth URL.'))
  }

  // TODO проверка работоспособности полученных учётных данных

  user.tiktokApp = {
    id: appId,
    secret: appSecret,
    oauthUrl: appOauth,
  }

  user
    .save()
    .then(() => respondPayload(response, true))
    .catch((error: Error) => respondServerError(response, error, log))
})
