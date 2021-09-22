import { Router, Request, Response } from 'express'
import { initLogger } from '../../util'
import { TikTokAccountMdl } from '../../model'
import { TikTokUserApi } from '../../lib/tiktok/marketing/api/user'
import { TikTokOAuthApi } from '../../lib/tiktok/marketing/api/oauth'
import { TikTokApiError } from '../../lib/tiktok/marketing/exceptions'
import { respondPayload, respondClientError, respondServerError } from '../util'

export const TikTokAccountsRouter = Router()
const log = initLogger('Router.TikTokAccounts')
const UserApi = new TikTokUserApi()
const OAuthApi = new TikTokOAuthApi()

// Список всех подключённых аккаунтов TikTok
TikTokAccountsRouter.get('/', async (request: Request, response: Response) => {
  const { user } = response.locals

  if (!user) {
    return respondClientError(response, new Error('Unauthorized.'), log, 401)
  }

  // Если удобно - можно в стиле async/await писать, но мне больше нравится формат промис-чейна.
  try {
    const accounts = await TikTokAccountMdl.find(
      { owner: user.username },
      // Включаем нужное, а не исключаем ненужное, чтобы, если в будущем появится другая sensitive data, мы не отдавали её автоматом
      {
        '_id': 0,
        'id': 1,
        'email': 1,
        'displayName': 1,
        'description': 1,
        'tiktokApp.id': 1,
        'advertisers.id': 1,
        'advertisers.name': 1,
        'advertisers.status': 1,
      },
    ).lean()

    return respondPayload(response, true, { list: accounts })
  } catch (error) {
    return respondServerError(response, error, log)
  }
})

// Обновление актуального списка аккаунтов (т.к. сейчас они получаются только в момент подключения).
TikTokAccountsRouter.post('/', async (request: Request, response: Response) => {
  const { user } = response.locals

  if (!user) {
    return respondClientError(response, new Error('Unauthorized.'), log, 401)
  }

  // TODO а если в разных приложениях авторизованы? Когда буду делать поддержку множества приложений, это нужно будет переписать.
  const appId = user.tiktokApp?.id
  const appSecret = user.tiktokApp?.secret

  if (!appId || !appSecret) {
    return respondClientError(
      response,
      new Error(
        'Для привязки аккаунта необходимо указать App ID и App Secret приложения TikTok в настройках профиля.',
      ),
      log,
    )
  }

  const databaseWrites = [] as any[]

  try {
    const accs = await TikTokAccountMdl.find(
      { owner: user.username },
      { _id: 0, id: 1, accessToken: 1 },
    ).lean()
    for (const accumulator of accs) {
      const { id, accessToken } = accumulator
      const advList = await OAuthApi.getAdvertiserList(appId, appSecret, accessToken)
      const advInfo = await UserApi.getAdvertisersInfo(
        { appId, accessToken },
        advList.data.list.map(({ advertiser_id }) => advertiser_id),
      )

      // Аккаунты с такими id могут быть и у других пользователей системы. Апдейтим все, всё-равно это один и тот же акк.
      databaseWrites.push({
        updateMany: {
          filter: { id },
          update: {
            $set: {
              advertisers: advInfo.data.map(({ id, status, currency, name }) => ({
                id,
                name,
                status,
                currency,
              })),
            },
          },
        },
      })
    }

    await TikTokAccountMdl.bulkWrite(databaseWrites)
    return respondPayload(response)
  } catch (error) {
    return respondServerError(response, error, log)
  }
})

// Подключение нового аккаунта с помощью авторизационного кода
TikTokAccountsRouter.post('/connect', (request: Request, response: Response) => {
  const { user } = response.locals
  const { authCode } = request.body

  if (!user) {
    return respondClientError(response, new Error('Unauthorized.'), log, 401)
  }

  let accessToken: string
  const appId = user.tiktokApp?.id
  const appSecret = user.tiktokApp?.secret

  if (!appId || !appSecret) {
    return respondClientError(
      response,
      new Error(
        'Для привязки аккаунта необходимо указать App ID и App Secret приложения TikTok в настройках профиля.',
      ),
      log,
    )
  }

  return OAuthApi.auth(appId, appSecret, authCode)
    .then(({ data }) => {
      accessToken = data.access_token
      return UserApi.getUserInfo({ appId, accessToken })
    })
    .then(({ data }) => {
      const { id, email, display_name: displayName } = data

      // Если подключаем тот же аккаунт повторно - не дублируем запись в БД
      return TikTokAccountMdl.findOneAndUpdate(
        { id: id.toString() },
        {
          email,
          displayName,
          accessToken,
          owner: user.username,
          tiktokApp: {
            id: appId,
            secret: appSecret,
          },
        },
        {
          upsert: true,
          new: true,
        },
      )
    })
    .then((account) => {
      return OAuthApi.getAdvertiserList(appId, appSecret, accessToken).then(({ data }) => {
        account.advertisers = data.list.map((item) => ({
          id: item.advertiser_id,
          name: item.advertiser_name,
        }))

        return account
      })
    })
    .then((account) => {
      return UserApi.getAdvertisersInfo(
        { appId, accessToken },
        account.advertisers.map(({ id }) => id),
      ).then(({ data }) => {
        account.advertisers = data.map(({ id, status, currency, name }) => ({
          id,
          name,
          status,
          currency,
        }))

        return account.save()
      })
    })
    .then((account) => {
      // TODO тайпинги ответа
      return respondPayload(response, true, {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        advertisers: account.advertisers.length,
        description: account.description,
        tiktokApp: {
          id: account.tiktokApp.id,
        },
      })
    })
    .catch((error) => {
      // TODO нужно ли возвращать ошибку ТикТока клиенту?
      return error instanceof TikTokApiError
        ? respondClientError(response, error, log)
        : respondServerError(response, error, log)
    })
})
