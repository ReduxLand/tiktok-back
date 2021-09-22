import { AbstractTikTokApi } from '../../abstract-tiktok-api'
import { TRequestCredentials } from '../../types'
import {
  TAdListPayload,
  TAdListResponse,
  TAdCreatePayload,
  TAdCreateResponse,
  TAdReviewInfoResponse,
  TAdReviewInfoPayload,
} from './types'

enum Endpoint {
  AdList = '/v1.2/ad/get/',
  AdCreate = '/v1.2/ad/create/',
  AdReviewStatus = '/v1.2/ad/review_info/',
}

/**
 * Работа с рекламными объявлениями.
 * Группа объявлений имеет ограничение на 20 рекламных объявлений.
 *
 * @constructor
 * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1675424575360006}
 * @see [Automated Optimization Ads]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1675425559596037}
 * @see [TikTok Ads Placement]{@link https://ads.tiktok.com/help/article?aid=9581}
 */
export class TikTokAdsApi extends AbstractTikTokApi {
  constructor() {
    super()
  }

  /**
   * Список рекламных объявлений.
   *
   * @param {TRequestCredentials} credentials
   * @param {TAdListPayload} payload
   */
  public list(credentials: TRequestCredentials, payload: TAdListPayload) {
    // Ставим 1000 элементов на страницу. При наличии этого параметра в пэйлоаде - переопределяем наше значение.
    payload = Object.assign({ page_size: 1000 }, payload)

    return this._callApi<TAdListResponse>('GET', Endpoint.AdList, payload, credentials)
  }

  /**
   * Создание рекламного объявления.
   *
   * @param {TRequestCredentials} credentials
   * @param {TAdCreatePayload} payload
   * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1675424575360006}
   * @see [Creative Specifications]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=100539}
   * @see [TikTok Ads Placement]{@link https://ads.tiktok.com/help/article?aid=9581}
   */
  public create(credentials: TRequestCredentials, payload: TAdCreatePayload) {
    return this._callApi<TAdCreateResponse>('POST', Endpoint.AdCreate, payload, credentials)
  }

  /**
   * Статус модерации рекламных объявлений.
   *
   * @param {TRequestCredentials} credentials
   * @param {TAdReviewInfoPayload} payload
   * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1693202518080514}
   */
  public getReviewStatus(credentials: TRequestCredentials, payload: TAdReviewInfoPayload) {
    return this._callApi<TAdReviewInfoResponse>(
      'GET',
      Endpoint.AdReviewStatus,
      payload,
      credentials,
    )
  }
}
