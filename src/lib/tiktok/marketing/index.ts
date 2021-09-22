import { TikTokAdsApi } from './api/ad'
import { TikTokAdGroupApi } from './api/adgroup'
import { TikTokCampaignApi } from './api/campaign'
import { TikTokCreativeApi } from './api/creative'
import { TikTokPixelApi } from './api/pixel'
import { TikTokOAuthApi } from './api/oauth'
import { TikTokUserApi } from './api/user'

/**
 * Класс для работы с TikTok Marketing API.
 *
 * Можно использовать в двух вариантах:
 * 1. Использовать этот глобальный класс, объединяющий под собой все интерфейсы;
 * 2. Подключать только нужные модули там, где это необходимо (например, только Ads или OAuth).
 *
 * Для начала работы необходимо зарегистрироваться как разработчик в TikTok, затем создать приложение и дождаться
 * его модерации. Зарегистрированное приложение - единственный способ взаимодействия с TikTok Marketing API.
 *
 * @constructor
 */
export class TikTokMarketingApi {
  // Модули (интерфейсы) TikTok Marketing API

  public ads: TikTokAdsApi
  public adGroups: TikTokAdGroupApi
  public campaigns: TikTokCampaignApi
  public creatives: TikTokCreativeApi
  public pixels: TikTokPixelApi
  public user: TikTokUserApi
  public oauth: TikTokOAuthApi

  constructor() {
    this.ads = new TikTokAdsApi()
    this.adGroups = new TikTokAdGroupApi()
    this.campaigns = new TikTokCampaignApi()
    this.creatives = new TikTokCreativeApi()
    this.pixels = new TikTokPixelApi()
    this.user = new TikTokUserApi()
    this.oauth = new TikTokOAuthApi()
  }
}
