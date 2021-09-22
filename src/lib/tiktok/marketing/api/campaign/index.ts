import { AbstractTikTokApi } from '../../abstract-tiktok-api'
import { TRequestCredentials } from '../../types'
import {
  TCampaignListPayload,
  TCampaignListResponse,
  TCampaignCreatePayload,
  TCampaignCreateResponse,
} from './types'

enum Endpoint {
  CampaignsList = '/v1.2/campaign/get/',
  CampaignCreate = '/v1.2/campaign/create/',
}

/**
 * Работа с рекламными кампаниями.
 * Рекламный аккаунт имеет ограничение на 999 РК.
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
export class TikTokCampaignApi extends AbstractTikTokApi {
  constructor() {
    super()
  }

  /**
   * Список кампаний для рекламного аккаунта.
   *
   * @param {TRequestCredentials} credentials
   * @param {TCampaignListPayload} payload
   */
  public list(credentials: TRequestCredentials, payload: TCampaignListPayload) {
    // Ставим 1000 элементов на страницу. При наличии этого параметра в пэйлоаде - переопределяем наше значение.
    payload = Object.assign({ page_size: 1000 }, payload)

    return this._callApi<TCampaignListResponse>('GET', Endpoint.CampaignsList, payload, credentials)
  }

  /**
   * Создание рекламной кампании.
   *
   * @param {TRequestCredentials} credentials
   * @param {TCampaignCreatePayload} payload
   */
  public create(credentials: TRequestCredentials, payload: TCampaignCreatePayload) {
    return this._callApi<TCampaignCreateResponse>(
      'POST',
      Endpoint.CampaignCreate,
      payload,
      credentials,
    )
  }

  /**
   * TODO Редактирование рекламной кампании.
   *
   * @todo Typings
   * @param {TRequestCredentials} credentials
   * @param {Object} payload
   */
  public edit(credentials: TRequestCredentials, payload: object) {
    return this._callApi('POST', '', payload, credentials)
  }

  /**
   * TODO Изменение статуса рекламной кампании.
   *
   * @todo Typings
   * @param {TRequestCredentials} credentials
   * @param {Object} payload
   */
  public changeStatus(credentials: TRequestCredentials, payload: object) {
    return this._callApi('POST', '', payload, credentials)
  }
}
