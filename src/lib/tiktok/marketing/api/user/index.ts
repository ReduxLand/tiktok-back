import { AbstractTikTokApi } from '../../abstract-tiktok-api'
import { TRequestCredentials } from '../../types'
import { TAdvertisersInfo, TUserInfoResponse } from './types'

enum Endpoint {
  UserInfo = '/v1.2/user/info/',
  AdvertiserInfo = '/v1.2/advertiser/info/',
}

/**
 * Информация о глобальном пользователе приложения.
 *
 * @constructor
 */
export class TikTokUserApi extends AbstractTikTokApi {
  constructor() {
    super()
  }

  /**
   * Получаем инфо о юзере сразу после OAuth, чтобы записать всё в БД.
   *
   * @param {TRequestCredentials} credentials
   */
  getUserInfo(credentials: TRequestCredentials) {
    return this._callApi<TUserInfoResponse>('GET', Endpoint.UserInfo, null, credentials)
  }

  /**
   * Получение информации о рекламных аккаунтах.
   *
   * @param {TRequestCredentials} credentials
   * @param {string[]} advertiserIds
   */
  getAdvertisersInfo(credentials: TRequestCredentials, advertiserIds: string[]) {
    const calls = []
    for (let index = 0; advertiserIds.length > index; index += 100) {
      const advs = advertiserIds.slice(index, index + 100)
      calls.push(
        this._callApi<TAdvertisersInfo>(
          'GET',
          Endpoint.AdvertiserInfo +
            `?advertiser_ids=[${advs.join(',')}]&fields=["id","status","currency","name"]`,
          null,
          credentials,
        ),
      )
    }

    return Promise.all(calls).then((res) =>
      // TODO переделать reduce
      res.reduce((previous, current) => {
        previous.data.push(...current.data)
        return {
          code: previous.code,
          message: previous.message,
          data: previous.data,
          request_id: previous.request_id,
        }
      }),
    )
  }
}
