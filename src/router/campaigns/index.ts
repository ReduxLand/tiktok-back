import _ from 'lodash'
import { Router, Request, Response } from 'express'
import { initLogger } from '../../util'
import { respondClientError, respondPayload, respondServerError } from '../util'
import { CampaignMdl, CampaignLoadMdl, TikTokAccountMdl } from '../../model'
import { CampaignLoadTask } from '../../lib/async-task/campaign-load'
import { AsyncTaskStorage } from '../../lib/async-task/storage'
import {
  EAdvertisingObjective,
  EAudienceLanguage,
  EBudgetMode,
  EOptimizationGoal,
} from '../../lib/tiktok/marketing/types/enums'

export const CampaignsRouter = Router()
const log = initLogger('Router.Campaigns')
const taskStorage = AsyncTaskStorage.getInstance()
const ALLOWED_CAMPAIGN_TYPES = new Set([
  EAdvertisingObjective.Traffic,
  EAdvertisingObjective.Conversions,
])

// Список сохранённых рекламных кампаний
CampaignsRouter.get('/', (request: Request, response: Response) => {
  const { user } = response.locals
  if (!user) {
    return respondClientError(response, new Error('Unauthorized'), log, 401)
  }

  return CampaignMdl.find({ owner: user.username }, { _id: 0, owner: 0 })
    .limit(50)
    .lean()
    .then((campaigns) => respondPayload(response, true, campaigns))
    .catch((error) => respondServerError(response, error, log))
})

// Список состоявшихся заливов
CampaignsRouter.get('/loads', (request: Request, response: Response) => {
  const { user } = response.locals
  if (!user) {
    return respondClientError(response, new Error('Unauthorized'), log, 401)
  }

  return CampaignLoadMdl.find({ owner: user.username }, { _id: 0, owner: 0 })
    .limit(50)
    .lean()
    .then((campaignLoads) => respondPayload(response, true, campaignLoads))
    .catch((error) => respondServerError(response, error, log))
})

// Создание новой рекламной кампании
// TODO вынести загрузку отдельно, и при загрузке сначала создать РК, а потом зарузить
CampaignsRouter.post('/', async (request: Request, response: Response) => {
  const { user } = response.locals
  const { ads, adGroup, campaign, advertisers } = request.body

  if (!user) {
    return respondClientError(response, new Error('Unauthorized'), log, 401)
  }

  // Валидация полезной нагрузки (базовая, дальше идёт полная валидация через модель)
  if (!advertisers || !_.isArray(advertisers) || advertisers.length === 0) {
    return respondClientError(
      response,
      new Error('Необходимо выбрать рекламные аккаунты для загрузки.'),
      log,
    )
  } else if (!campaign || !campaign.objective || !ALLOWED_CAMPAIGN_TYPES.has(campaign.objective)) {
    return respondClientError(response, new Error('Неверная конфигурация рекламной кампании.'), log)
  } else if (!adGroup || !adGroup.optimizationGoal || !adGroup.bidType) {
    return respondClientError(response, new Error('Неверная конфигурация группы объявлений.'), log)
  } else if (!ads || !_.isArray(ads) || ads.length === 0) {
    return respondClientError(response, new Error('Неверная конфигурация рекламных объявлений.'), log)
  }

  // Если пришло больше 100 объявлений - убираем лишние
  if (ads.length > 100) {
    ads.length = 100
  }

  try {
    const advertiserCredentials: {
      [advertiserId: string]: {
        appId: string
        accessToken: string
      }
    } = {}

    // Собираем модель по полезной нагрузке и проводим валидацию // TODO а чё doc:any? Где тайпинги?
    const campaignLoad = new CampaignLoadMdl({
      advertisers: advertisers,
      owner: user.username,
      log: [],
      campaign: {
        name: campaign.name,
        objective: campaign.objective,
      },
      adGroup: {
        name: adGroup.name,
        budget: adGroup.budget,
        budgetMode: EBudgetMode.Day,
        bid: 0,
        conversionBid: 0,
        bidType: adGroup.bidType,
        optimizationGoal: adGroup.optimizationGoal,
        age: adGroup.age[0] === 0 ? [] : adGroup.age,
        languages: <EAudienceLanguage[]>adGroup.languages,
        location: adGroup.location,
        gender: adGroup.gender,
        // Остальные нужные поля ставятся по-умолчанию при создании модели.
        // Если эти умолчания изменятся в будущем - нужно будет здесь прописать нужные параметры.
      },
      ads: ads.map((ad) => ({
        name: ad.name,
        text: ad.text,
        title: ad.title,
        creative: ad.videoCreative,
        profileImage: ad.profileImage,
        callToAction: ad.callToAction,
        landingPageUrl: ad.landingPageUrl,
      })),
    })

    if (campaignLoad.adGroup.optimizationGoal === EOptimizationGoal.Conversion) {
      campaignLoad.adGroup.conversionBid = adGroup.bid
    } else {
      campaignLoad.adGroup.bid = adGroup.bid
    }

    const validationErrors = campaignLoad.validateSync()

    // Если есть ошибки валидации - возвращаем первую из них (пока что, потом будем всё отдавать).
    if (validationErrors) {
      const errorKeys = Object.keys(validationErrors.errors)
      return respondClientError(response, validationErrors.errors[errorKeys[0]], log)
    }

    // После успешной валидации модели сохраняем её в БД
    try {
      await campaignLoad.save()
    } catch (error) {
      return respondServerError(response, error, log)
    }

    // TODO определить типы тасков в enum
    const campaignLoadTask = new CampaignLoadTask(campaign.name, 'CampaignLoad', advertisers.length)
    if (!taskStorage.push(user.username, campaignLoadTask)) {
      return respondClientError(response, new Error('Задача уже выполняется.'), log)
    }

    try {
      // Забираем пока что все принадлежащие юзеру акки
      const accs = await TikTokAccountMdl.find(
        { owner: user.username }, // TODO только присутствующие в запросе advertisers? Через .populate()
        { '_id': 0, 'accessToken': 1, 'advertisers.id': 1, 'tiktokApp.id': 1 },
      ).lean()

      // Мэппим (пока ваще все) рекламные кабинеты в карту id -> accessToken
      accs.map((accumulator) => {
        accumulator.advertisers.map((adv) => {
          advertiserCredentials[adv.id] = {
            appId: accumulator.tiktokApp?.id,
            accessToken: accumulator.accessToken,
          }
        })
      })
    } catch (error) {
      taskStorage.remove(user.username, campaignLoadTask.name)
      return respondServerError(response, error, log)
    }

    // Отвечаем 200 и идём дальше в фоне
    respondPayload(response, true)

    campaignLoadTask.init(campaignLoad, advertiserCredentials)
    campaignLoadTask
      .run()
      .then(() => {
        campaignLoad.log = campaignLoadTask.log
        taskStorage.remove(user.username, campaignLoadTask.name)
        return campaignLoad.save()
      })
      .catch((error) => log.error('', error))
  } catch (error) {
    return respondServerError(response, error, log)
  }
})
