import { AbstractTikTokApi } from '../../abstract-tiktok-api'
import { TRequestCredentials } from '../../types'
import {
  TAdGroupListPayload,
  TAdGroupListResponse,
  TAdGroupCreatePayload,
  TAdGroupCreateResponse,
} from './types'

enum Endpoint {
  AdGroupsList = '/v1.2/adgroup/get/',
  AdGroupCreate = '/v1.2/adgroup/create/',
}

/**
 * Работа с группами объявлений.
 * Рекламная кампания имеет ограничение на 999 групп объявлений.
 *
 * Minimum budget limits:
 * Campaign-level: 50$+/day
 * AdGroup-level: 20$+/day
 *
 * Дневные бюджеты для уровня Ad Group возможно установить в двух случаях:
 * 1. For ad groups with delivery mode (schedule_type) specified as continuous delivery (SCHEDULE_FROM_NOW).
 * 2. When the budget type for a campaign is daily budget. Please refer to the support situation:
 *  Total budget used by advertising group (BUDGET_MODE_TOTAL) | Daily budget of advertising group (BUDGET_MODE_DAY)
 *
 *  Unlimited budget for Campaign (BUDGET_MODE_INFINITE) : YES | YES
 *  Campaign total budget (BUDGET_MODE_TOTAL) : YES | YES
 *  Campaign daily budget (BUDGET_MODE_DAY) : YES | NO
 *
 * @constructor
 */
export class TikTokAdGroupApi extends AbstractTikTokApi {
  constructor() {
    super()
  }

  /**
   * Список групп объявлений.
   *
   * @param {TRequestCredentials} credentials
   * @param {TAdGroupListPayload} payload
   */
  public list(credentials: TRequestCredentials, payload: TAdGroupListPayload) {
    // Ставим 1000 элементов на страницу. При наличии этого параметра в пэйлоаде - переопределяем наше значение.
    payload = Object.assign({ page_size: 1000 }, payload)

    return this._callApi<TAdGroupListResponse>('GET', Endpoint.AdGroupsList, payload, credentials)
  }

  /**
   * Создание группы объявлений.
   *
   * @param {TRequestCredentials} credentials
   * @param {TAdGroupCreatePayload} payload
   */
  public create(credentials: TRequestCredentials, payload: TAdGroupCreatePayload) {
    return this._callApi<TAdGroupCreateResponse>(
      'POST',
      Endpoint.AdGroupCreate,
      payload,
      credentials,
    )
  }
}
