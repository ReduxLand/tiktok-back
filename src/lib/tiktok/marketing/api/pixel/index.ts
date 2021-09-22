import { AbstractTikTokApi } from '../../abstract-tiktok-api'
import { TRequestCredentials } from '../../types'
import {
  TPixelListPayload,
  TPixelListResponse,
  TPixelCreatePayload,
  TPixelCreateResponse,
} from './types'

enum Endpoint {
  PixelList = '/v1.1/pixel/list/',
  PixelCreate = '/v1.1/pixel/create/',
}

/**
 * Работа с пикселями ТикТок.
 *
 * @constructor
 * @todo Методы редактирования пикселя и CRUD событий пикселя
 * @see Типы эвентов https://ads.tiktok.com/marketing_api/docs?id=100640
 * @see Документация https://ads.tiktok.com/marketing_api/docs?rid=m3dqsotpxt&id=100515
 */
export class TikTokPixelApi extends AbstractTikTokApi {
  constructor() {
    super()
  }

  /**
   * Список пикселей.
   *
   * @param {TRequestCredentials} credentials
   * @param {TPixelListPayload} payload
   */
  list(credentials: TRequestCredentials, payload: TPixelListPayload) {
    payload = Object.assign({ page_size: 20 }, payload)

    return this._callApi<TPixelListResponse>('GET', Endpoint.PixelList, payload, credentials)
  }

  /**
   * Создание пикселя.
   *
   * @param {TRequestCredentials} credentials
   * @param {TPixelCreatePayload} payload
   */
  create(credentials: TRequestCredentials, payload: TPixelCreatePayload) {
    return this._callApi<TPixelCreateResponse>('POST', Endpoint.PixelCreate, payload, credentials)
  }
}
