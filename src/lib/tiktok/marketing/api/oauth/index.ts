import { AbstractTikTokApi } from '../../abstract-tiktok-api'
import { TOAuthResponse, TAdvertisersListResponse } from './types'

enum Endpoint {
  GetAccessToken = '/v1.2/oauth2/access_token/',
  AdvertiserList = '/oauth2/advertiser/get/',
}

/**
 * Класс со всем, что связано с OAuth авторизацией ТикТок аккаунтов.
 * Получение долгоживущих токенов, обновление токенов, отзыв токенов и т.д.
 *
 * @constructor
 * @param {string} appId
 * @param {string} appSecret
 */
export class TikTokOAuthApi extends AbstractTikTokApi {
  constructor() {
    super()
  }

  /**
   * Получение долгосрочного Access Token из кода авторизации (10 минут TTL).
   *
   * @param {string} appId - Идентификатор приложения
   * @param {string} appSecret - Секрет приложения
   * @param {string} code - Код авторизации
   */
  auth(appId: string, appSecret: string, code: string) {
    return this._callApi<TOAuthResponse>('POST', Endpoint.GetAccessToken, {
      app_id: appId,
      secret: appSecret,
      auth_code: code,
    })
  }

  /**
   * Получение списка рекламных аккаунтов, доступных к управлению нашим приложением.
   *
   * @param {string} appId - Идентификатор приложения
   * @param {string} appSecret - Секрет приложения
   * @param {string} token - Токен доступа
   */
  getAdvertiserList(appId: string, appSecret: string, token: string) {
    return this._callApi<TAdvertisersListResponse>('POST', Endpoint.AdvertiserList, {
      app_id: appId,
      secret: appSecret,
      access_token: token,
    })
  }
}
