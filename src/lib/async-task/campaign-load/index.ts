import moment from 'moment'
import Bluebird from 'bluebird'
import { AsyncTask } from '../index'
import { CurrencyConverter } from '../../currency-converter'
import { TikTokMarketingApi } from '../../tiktok/marketing'
import { TAdGroupCreatePayload } from '../../tiktok/marketing/api/adgroup/types'
import { ICampaignLoad } from '../../../model'
import {
  EAdvertisingObjective,
  EBudgetMode,
  ECreativeUploadType,
  EPixelEvent,
} from '../../tiktok/marketing/types/enums'

export class CampaignLoadTask extends AsyncTask<ICampaignLoad> {
  private readonly _ttAPI: TikTokMarketingApi
  private readonly _currencyConv: CurrencyConverter
  protected _payload: {
    [advertiserId: string]: {
      appId: string
      accessToken: string
    }
  }

  constructor(name: string, type: string, stepsCount = 1) {
    super(name, type, stepsCount)

    this._ttAPI = new TikTokMarketingApi()
    this._currencyConv = CurrencyConverter.getInstance()
  }

  async run() {
    const advertiserCredentials = this._payload
    const { advertisers, campaign, adGroup, ads } = this._model
    const isVideoPreviewsTaken = false
    const adsAdditional: {
      profileImageId?: string
      videoId?: string
      videoCoverId?: string
      videoPreviewUrl?: string
    }[] = []

    this.emit('run') // TODO а в ретрае же получается опять стрельнёт? И когда стрелять done после run?

    // TODO заюзать порождающий паттерн (фабрику campaign-load или даже абстрактную фабрику async-task).
    //  Это сейчас есть только залив РК из бэкграунд задач и 2 типа залива. Потом, возможно, будет больше.
    // TODO и всю эту простыню тоже по функциям распилить, есть ряд логически связанных кусков.
    // Проходимся по всем адвертам
    for (const advertiser of advertisers) {
      // Получаем appId и accessToken адверта
      const { appId, accessToken } = advertiserCredentials[advertiser]
      const advSubtaskIndex = this.logStartSubtask('Залив на аккаунт ' + advertiser)

      // Смотрим параметры заливаемой рекламной кампании
      const { name, objective } = campaign
      let pixelId: string // ID пикселя, если понадобится
      let pixelCode: string
      let externalAction: EPixelEvent // Событие пикселя

      // Получаем валюту аккаунта
      const advInfo = await this._ttAPI.user.getAdvertisersInfo({ appId, accessToken }, [
        advertiser,
      ])
      if (!advInfo.data[0]) {
        // TODO проверить // TODO отфильтровать одним запросом сразу всех до начала итераций
        this.logUpdateSubtask(advSubtaskIndex, false, 'Нет доступа к аккаунту')
        this.addFailureProgress()
        continue
      }
      const { currency } = advInfo.data[0]
      this.logStartSubtask('Валюта аккаунта ' + currency, true)

      // Если залив за конверсии - проверяем и запоминаем пиксели с событиями
      if (objective === EAdvertisingObjective.Conversions) {
        const pixelSubtaskIndex = this.logStartSubtask('Проверка наличия 1 пикселя и 1 эвента')
        const pixelRes = await this._ttAPI.pixels.list(
          { appId, accessToken },
          { advertiser_id: advertiser },
        )
        const { pixels } = pixelRes.data

        // Если нет строгой связи 1 пиксель -> 1 эвент на аккаунте - пропускаем его (пока что)
        if (pixels.length !== 1) {
          this.logUpdateSubtask(
            pixelSubtaskIndex,
            false,
            'На аккаунте больше 1 пикселя, пропускаем аккаунт',
          )
          this.logUpdateSubtask(
            advSubtaskIndex,
            false,
            'Аккаунт не удовлетворяет правилу 1 пиксель -> 1 эвент',
          )
          this.addFailureProgress()
          continue
        }

        const { events, pixel_id, pixel_code } = pixels[0]
        pixelId = pixel_id
        pixelCode = pixel_code

        if (events.length !== 1) {
          this.logUpdateSubtask(
            pixelSubtaskIndex,
            false,
            'Пиксель содержит больше 1 эвента, пропускаем аккаунт',
          )
          this.logUpdateSubtask(
            advSubtaskIndex,
            false,
            'Аккаунт не удовлетворяет правилу 1 пиксель -> 1 эвент',
          )
          this.addFailureProgress()
          continue
        }

        const { external_action } = events[0]
        externalAction = external_action as EPixelEvent
        this.logUpdateSubtask(pixelSubtaskIndex, true)
      }

      // Заливаем креативы, т.к. в них больше шансов напороться на ошибку.
      // Использование заголовка Host вместо установленного домена чревато потенциальной уязвимостью, но если на уровне
      // веб-сервера запросы к приложению проксируются не с wildcard, а с vhost, соответствующему домену(ам), то всё ОК.
      // Идём от лёгкого к тяжелому, т.к. если изображение профиля не подойдёт - нет смысла грузить видос.
      let adIndex = 0
      const isSuccessfulExecution = true
      for (const ad of ads) {
        adsAdditional[adIndex] = {}
        let attempt = 0
        let temporaryError: Error
        const timestamp = Date.now()
        const adSubtaskIndex = this.logStartSubtask(
          `Залив медиа для объявления ${ad.name} (${adIndex + 1}/${ads.length})`,
        )

        if (!ad.creative) {
          this.logUpdateSubtask(
            adSubtaskIndex,
            false,
            'Отсутствует видеокреатив, пропускаем объявление',
          )
          continue
        }

        // Изображение профиля необязательное
        if (ad.profileImage) {
          const profileImgSubtaskIndex = this.logStartSubtask('Загрузка изображения профиля')

          // При этом пробуем грузить 3 раза
          do {
            try {
              temporaryError = undefined
              const profileImageRes = await this._ttAPI.creatives.uploadImage(
                { appId, accessToken },
                {
                  advertiser_id: advertiser,
                  upload_type: ECreativeUploadType.Url,
                  file_name: 'Profile_Image_' + timestamp + '.jpg',
                  image_url:
                    process.env.BACKEND_API_HOST +
                    '/api/v1/media-library/profile-image/' +
                    ad.profileImage,
                },
              )
              const { image_id } = profileImageRes.data
              adsAdditional[adIndex].profileImageId = image_id
              this.logUpdateSubtask(profileImgSubtaskIndex, true)
            } catch (error) {
              temporaryError = error
            }
          } while (temporaryError && ++attempt < 3)

          if (temporaryError && attempt >= 3) {
            this.logUpdateSubtask(profileImgSubtaskIndex, false, temporaryError.message)
          }
        }

        // TODO если грузиться будет дольше часа - не пройдёт такой трюк из-за времени жизни ссылки ТТ в час
        attempt = 0
        const videoSubtaskIndex = this.logStartSubtask('Загрузка видео креатива')
        do {
          try {
            temporaryError = undefined
            const videoCreativeRes = await this._ttAPI.creatives.uploadVideo(
              { appId, accessToken },
              {
                advertiser_id: advertiser,
                upload_type: ECreativeUploadType.Url,
                file_name: 'Video_Creative_' + timestamp + '.mp4', // TODO именование загружаемого в ТТ видео
                video_url: adsAdditional[adIndex].videoPreviewUrl
                  ? adsAdditional[adIndex].videoPreviewUrl
                  : process.env.BACKEND_API_HOST +
                    '/api/v1/media-library/video-creative/' +
                    ad.creative,
              },
            )
            const { video_id, url } = videoCreativeRes.data[0]
            adsAdditional[adIndex].videoId = video_id
            // Пока без оптимизации по уже загруженным видео
            // if (url) {
            //   adsAdditional[adIdx].videoPreviewUrl = url
            // }
            this.logUpdateSubtask(videoSubtaskIndex, true)
          } catch (error) {
            temporaryError = error
          }
        } while (temporaryError && ++attempt < 3)

        if (temporaryError && attempt >= 3) {
          this.logUpdateSubtask(videoSubtaskIndex, false, temporaryError.message)
        }

        // Запрашиваем обложку видео. // TODO вынести это на фронт, чтобы можно было выбрать обложку самому.
        attempt = 0
        const thumbsSubtaskIndex = this.logStartSubtask('Получение обложки видео')
        do {
          temporaryError = undefined
          await Bluebird.delay(1000)
          // TODO timeout дать и повторные попытки + использовать метод getVideoInfo
          try {
            const videoCoverResponse = await this._ttAPI.creatives.getVideoThumbnail(
              { appId, accessToken },
              {
                video_id: adsAdditional[adIndex].videoId,
                advertiser_id: advertiser,
                poster_number: 1,
              },
            )
            const { id: video_cover_id } = videoCoverResponse.data.list[0]
            adsAdditional[adIndex].videoCoverId = video_cover_id
            this.logUpdateSubtask(thumbsSubtaskIndex, true)
          } catch (error) {
            temporaryError = error
          }
        } while (temporaryError && ++attempt < 5)

        if (temporaryError && attempt >= 5) {
          this.logUpdateSubtask(thumbsSubtaskIndex, false, temporaryError.message)
        }

        adIndex++
      }

      if (!isSuccessfulExecution) {
        this.addFailureProgress()
        // TODO а пропускаем или нет? Если нет, то надо как-то поудачнее придумать добавление фейло прогресса, может быть больше 100 в итоге
      }

      // TODO пока убираем это дело
      // Получаем превью ссылки видео от ТТ, чтобы следующие загрузки проходили не через наш сервер для экономии трафа
      // if (!isVideoPreviewsTaken) {
      //   const videoPreviewSubtaskIndex = this.logStartSubtask('Получение превью видео креативов')
      //
      //   try {
      //     const videoPreviewResponse = await this._ttAPI.creatives.searchVideos(
      //       { appId, accessToken },
      //       {
      //         advertiser_id: advertiser,
      //         filtering: {
      //           video_ids: adsAdditional
      //             .filter(({ videoPreviewUrl }) => !!videoPreviewUrl)
      //             .map(({ videoId }) => videoId),
      //         },
      //       },
      //     )
      //     const videos = videoPreviewResponse.data.list
      //     const videosMap: {
      //       [videoId: string]: string
      //     } = {}
      //
      //     for (const { url, video_id } of videos) {
      //       videosMap[video_id] = url
      //     }
      //
      //     for (const index in ads) {
      //       if (videosMap[adsAdditional[index].videoId]) {
      //         adsAdditional[index].videoPreviewUrl = videosMap[adsAdditional[index].videoId]
      //       }
      //     }
      //
      //     if (videos.length < ads.length) {
      //       this.logUpdateSubtask(videoPreviewSubtaskIndex, false, 'Не все превью были получены')
      //     } else {
      //       isVideoPreviewsTaken = true
      //       this.logUpdateSubtask(videoPreviewSubtaskIndex, true)
      //     }
      //   } catch (error) {
      //     this.logUpdateSubtask(videoPreviewSubtaskIndex, false, error.message)
      //     // Тут наверн не пропускаем, пофиг, это для внутренней оптимизации, на некст итерациях мб выправится
      //   }
      // }

      // Заливаем РК
      let campaignId
      const campaignSubtaskIndex = this.logStartSubtask('Создание рекламной кампании')
      try {
        const campaignResponse = await this._ttAPI.campaigns.create(
          { appId, accessToken },
          {
            campaign_name: name,
            objective_type: objective,
            advertiser_id: advertiser,
            budget_mode: EBudgetMode.Infinite,
            budget: 0,
          },
        )
        const { campaign_id } = campaignResponse.data
        campaignId = campaign_id
        this.logUpdateSubtask(campaignSubtaskIndex, true)
      } catch (error) {
        this.logUpdateSubtask(campaignSubtaskIndex, false, error.message)
        this.addFailureProgress()
        continue
      }

      // Заливаем Адсет
      const scheduleTime = moment()
      const budget = adGroup.budget || 2000
      const adGroupSubtaskIndex = this.logStartSubtask('Создание группы объявлений')
      const adGroupPayload: TAdGroupCreatePayload = {
        campaign_id: campaignId,
        advertiser_id: advertiser,
        age: adGroup.age,
        adgroup_name: adGroup.name.toString(),
        placement: adGroup.placement,
        placement_type: adGroup.placementType,
        bid: currency === 'RUB' ? adGroup.bid : this._currencyConv.convert(adGroup.bid, currency),
        conversion_bid:
          currency === 'RUB'
            ? adGroup.conversionBid
            : this._currencyConv.convert(adGroup.conversionBid, currency),
        bid_type: adGroup.bidType,
        budget_mode: adGroup.budgetMode,
        budget: currency === 'RUB' ? budget : this._currencyConv.convert(budget, currency), // TODO если null - тикток плюнет ошибку
        billing_event: adGroup.billingEvent,
        creative_material_mode: adGroup.creativeMaterialMode,
        external_type: adGroup.promotedObjectType,
        optimize_goal: adGroup.optimizationGoal,
        languages: adGroup.languages,
        location: adGroup.location,
        gender: adGroup.gender,
        skip_learning_phase: adGroup.skipLearningPhase,
        is_comment_disable: adGroup.isCommentDisable,
        pacing: adGroup.pacing,
        schedule_type: adGroup.scheduleType,
        video_download: adGroup.videoDownloadPermissions,
        schedule_start_time: scheduleTime.format('YYYY-MM-DD hh:mm:ss'),
        schedule_end_time: scheduleTime.add(10, 'year').format('YYYY-MM-DD hh:mm:ss'),
      }

      // Если заливаем за конверсии - ставим пиксель (а если за траф, почему-то нельзя передавать pixel_id: null)
      if (objective === EAdvertisingObjective.Conversions) {
        adGroupPayload.pixel_id = pixelId
        adGroupPayload.external_action = externalAction
      }

      // TODO проверить конверт валют
      let adGroupId
      try {
        const adGroupResponse = await this._ttAPI.adGroups.create(
          { appId, accessToken },
          adGroupPayload,
        )
        const { adgroup_id } = adGroupResponse.data
        adGroupId = adgroup_id
        this.logUpdateSubtask(adGroupSubtaskIndex, true)
      } catch (error) {
        this.logUpdateSubtask(adGroupSubtaskIndex, false, error.message)
        this.addFailureProgress()
        continue
      }

      // Заливаем объявления
      const adsSubtaskIndex = this.logStartSubtask('Загрузка объявлений')
      try {
        await this._ttAPI.ads.create(
          { appId, accessToken },
          {
            adgroup_id: adGroupId,
            advertiser_id: advertiser,
            creatives: ads.map((ad, index) => {
              // Только для конверсий
              const url = new URL(ad.landingPageUrl)

              // TODO макросы на фронте
              if (objective === EAdvertisingObjective.Conversions) {
                url.search += url.search.length === 0 ? 'pixel=' + pixelCode : '&pixel=' + pixelCode
              }

              return {
                ad_name: ad.name || '',
                ad_text: ad.text || '',
                ad_format: ad.format,
                display_name: ad.title,
                avatar_icon_web_uri: adsAdditional[index].profileImageId,
                call_to_action: ad.callToAction,
                landing_page_url: url.toString(),
                video_id: adsAdditional[index].videoId,
                image_ids: [adsAdditional[index].videoCoverId],
              }
            }),
          },
        )
        this.logUpdateSubtask(adsSubtaskIndex, true)
      } catch (error) {
        this.logUpdateSubtask(adsSubtaskIndex, false, error.message)
        this.addFailureProgress()
        continue
      }

      this.logUpdateSubtask(advSubtaskIndex, true)
      this.addSuccessProgress()
    }

    this.emit('done')
  }
}
