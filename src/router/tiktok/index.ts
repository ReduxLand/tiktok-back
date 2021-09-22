import { Request, Response, Router } from 'express'
import { TikTokAdsApi } from '../../lib/tiktok/marketing/api/ad'
import { TikTokAdGroupApi } from '../../lib/tiktok/marketing/api/adgroup'
import { TikTokCampaignApi } from '../../lib/tiktok/marketing/api/campaign'
import { TikTokAccountMdl } from '../../model'
import { respondPayload, respondClientError, respondServerError } from '../util'
import { initLogger } from '../../util'

export const TikTokRouter = Router()
const log = initLogger('Router.TikTok')
const TT_API = {
  ads: new TikTokAdsApi(),
  adGroups: new TikTokAdGroupApi(),
  campaigns: new TikTokCampaignApi(),
}

TikTokRouter.post('/ad', proxyApiHandler('ad'))
TikTokRouter.post('/adgroup', proxyApiHandler('adgroup'))
TikTokRouter.post('/campaign', proxyApiHandler('campaign'))

function proxyApiHandler(type: 'ad' | 'adgroup' | 'campaign') {
  let apiModule: TikTokAdsApi | TikTokAdGroupApi | TikTokCampaignApi
  switch (type) {
    case 'ad':
      apiModule = TT_API.ads
      break
    case 'adgroup':
      apiModule = TT_API.adGroups
      break
    case 'campaign':
      apiModule = TT_API.campaigns
      break
  }

  return async function (request: Request, response: Response) {
    const { user } = response.locals
    const { accountId, advertiserId } = request.body

    if (!user) {
      return respondClientError(response, new Error('Unauthorized.'), log, 401)
    } else if (!accountId || !advertiserId) {
      return respondClientError(response, new Error('Не указаны Account ID или Advertiser ID.'), log)
    }

    try {
      const { appId, accessToken } = await TikTokAccountMdl.getCredentials(
        accountId.toString(),
        user.username,
      )
      if (!accessToken) {
        return respondClientError(response, new Error('Выбранный аккаунт не подключен к системе.'))
      }
      const tiktokResponse = await apiModule.list(
        { appId, accessToken },
        { advertiser_id: advertiserId.toString() },
      )
      return respondPayload(response, true, tiktokResponse)
    } catch (error) {
      return respondServerError(response, error, log)
    }
  }
}
