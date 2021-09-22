import moment from 'moment'
import { Document, Schema, Model, model, models } from 'mongoose'
import {
  EAdvertisingObjective,
  EAudienceAgeRange,
  EAudienceGender,
  EAudienceGeoLocation,
  EAudienceLanguage,
  EBiddingStrategy,
  EBillingEvent,
  EBudgetMode,
  ECallToAction,
  ECreativeDeliveryMode,
  ECreativeType,
  EOptimizationGoal,
  EPlacement,
  EPlacementType,
  EPromotedObjectType,
  EScheduledAdvertisingTime,
  ESpeedOfAdDelivery,
  EVideoDownloadPermissions,
} from '../lib/tiktok/marketing/types/enums'

/**
 * Сущность залива кампании по рекламным аккаунтам.
 * TODO вынести одинаковые подсхемы для Campaign и CampaignLoad
 *
 */
const CampaignLoadSchema = new Schema(
  {
    // Рекламные аккаунты, на которые производится залив
    advertisers: {
      type: Array,
      of: String,
      required: true,
      min: [1, 'Нужно выбрать аккаунты для залива.'],
    },

    // Параметры рекламной кампании
    campaign: {
      // Название кампании (для отображения)
      name: {
        type: String,
        required: [true, 'Название рекламной кампании должно быть задано.'],
        default: () => 'Рекламная кампания ' + moment().format('YYYYMMDDhhmmss'),
      },

      // Цель залива
      objective: {
        type: String,
        required: [true, 'Цель рекламной кампании должна быть задана.'],
        enum: [EAdvertisingObjective.Traffic, EAdvertisingObjective.Conversions],
      },

      budget: {
        type: Number,
        // required: true, // Валидатор mongoose приводит к boolean значения, и воспринимает 0, как его отсутствие.
        default: 0,
      },

      // У кампаний всегда неограниченный бюджет. Он настраивается на уровне адсета.
      budgetMode: {
        type: String,
        required: [true, 'Тип бюджета кампании должен быть задан.'],
        enum: Object.values(EBudgetMode),
        default: EBudgetMode.Infinite,
      },
    },

    // Параметры группы объявлений
    adGroup: {
      // Название группы объявлений
      name: {
        type: String,
        required: [true, 'Название группы объявлений должно быть задано.'],
        default: () => 'Группа объявлений ' + moment().format('YYYYMMDDhhmmss'),
      },

      // Пол аудитории
      gender: {
        type: String,
        required: [true, 'Пол аудитории должен быть задан.'],
        default: EAudienceGender.Mix,
        enum: [EAudienceGender.Mix, EAudienceGender.Male, EAudienceGender.Female],
      },

      // Возрастные категории аудитории
      age: {
        type: Array,
        of: String,
        enum: Object.values(EAudienceAgeRange),
        default: [],
      },

      // Гео аудитории
      location: {
        type: Array,
        of: String,
        required: [true, 'Необходимо выбрать гео.'],
        enum: Object.values(EAudienceGeoLocation),
        min: 1, // TODO мб и не надо
      },

      // Языки аудитории
      languages: {
        type: Array,
        of: String,
        enum: Object.values(EAudienceLanguage),
        default: [],
      },

      // Цель оптимизации (пока только конверсии или клики)
      optimizationGoal: {
        type: String,
        required: [true, 'Цель оптимизации должна быть задана.'],
        enum: [EOptimizationGoal.Click, EOptimizationGoal.Conversion],
      },

      // Стратегия ставок (bid strategy)
      bidType: {
        type: String,
        required: [true, 'Стратегия ставок должна быть задана.'],
        enum: [EBiddingStrategy.Manual, EBiddingStrategy.DisableBidControl],
      },

      // Ставка за клик (при оптимизиации по кликам)
      bid: {
        type: Number,

        // Bid нужен в любом случае, но для кликов и конверсий параметры разные
        // Не пишем здесь required т.к. выше уже писал, что 0 ошибочно воспринимается валидатором как отсутствие значения.
        // required: function () {
        //   return this.adGroup.optimizationGoal === EOptimizationGoal.Click
        // },

        default: 0,
      },

      // Ставка за конверсию (при оптимизации по конверсиям)
      conversionBid: {
        type: Number,

        // TODO попробовать задать message вместе с функцией проверки
        // required: function () {
        //   return this.adGroup.optimizationGoal === EOptimizationGoal.Conversion
        // },

        default: 0,
      },

      billingEvent: {
        type: String,
        required: true,
        enum: Object.values(EBillingEvent),
        default: function () {
          return this.adGroup.optimizationGoal === EOptimizationGoal.Conversion
            ? EBillingEvent.oCPM
            : EBillingEvent.CPC
        },
      },

      // Бюджет в рублях. Самый высокий порог - для России, на другие валюты переводим по курсу ЦБ
      budget: {
        type: Number,
        required: [true, 'Бюджет группы объявлений должен быть задан.'],
        min: [2000, 'Минимальный дневной бюджет 2000 рублей.'],
      },

      // Бюджет группы объявлений. Вроде, есть только один вариант - дневной бюджет.
      budgetMode: {
        type: String,
        required: [true, 'Тип бюджета группы объявлений должен быть задан.'],
        enum: [
          EBudgetMode.Day,
          // EBudgetMode.Infinite, // Это для кампаний, а не для адсетов
        ],
        default: EBudgetMode.Day,
      },

      // Плейсмент (площадки размещения)
      placement: {
        type: Array,
        of: String,
        required: true,
        enum: Object.values(EPlacement),
        default: [EPlacement.TikTok],
      },

      // Тип размещения
      placementType: {
        type: String,
        required: true,
        enum: EPlacementType,
        default: EPlacementType.Custom,
      },

      // Тип доставки креатива
      creativeMaterialMode: {
        type: String,
        required: true,
        enum: Object.values(ECreativeDeliveryMode),
        default: ECreativeDeliveryMode.Custom,
      },

      // Тип рекламируемого объекта
      promotedObjectType: {
        type: String,
        required: true,
        enum: Object.values(EPromotedObjectType),
        default: EPromotedObjectType.Website,
      },

      // Пропускать или нет фазу обучения алгоритма оптимизации ТТ
      skipLearningPhase: {
        type: Number,
        // required: true,
        enum: [0, 1],
        default: 0,
      },

      // Пермишшны комментирования
      isCommentDisable: {
        type: Number,
        // required: true,
        enum: [0, 1],
        default: 1,
      },

      // Скорость доставки рекламы. Максимально быстро открутить бюджет или растянуть по времени для большей эффективности.
      pacing: {
        type: String,
        required: true,
        enum: Object.values(ESpeedOfAdDelivery),
        default: ESpeedOfAdDelivery.Smooth,
      },

      // Тип расписания, когда начинать показ
      scheduleType: {
        type: String,
        required: true,
        enum: Object.values(EScheduledAdvertisingTime),
        default: EScheduledAdvertisingTime.FromNow,
      },

      // Пермишны на загрузку рекламного видео другими людьми
      videoDownloadPermissions: {
        type: String,
        required: true,
        enum: Object.values(EVideoDownloadPermissions),
        default: EVideoDownloadPermissions.Prevent,
      },
    },

    ads: [
      new Schema({
        // Название объявления
        name: {
          type: String,
          required: [true, 'Название объявление должно быть задано.'],
          default: () => 'Creative ' + moment().format('YYYYMMDDhhmmss'),
        },

        // Заголовок объявления
        title: {
          type: String,
          required: [true, 'Заголовок объявления должен быть задан.'],
        },

        // Текст объявления
        text: {
          type: String,
          required: [true, 'Текст объявления должен быть задан.'],
        },

        format: {
          type: String,
          required: true,
          enum: Object.values(ECreativeType),
          default: ECreativeType.Video,
        },

        // Креатив. Строковое значение ObjectId в библиотеке креативов (TODO возможно, нужно переделать на mongoose.ObjectId)
        // Пока это sha256, потом переделать на ObjectId.
        creative: {
          type: String,
          required: [true, 'Не выбран креатив объявления.'],
        },

        landingPageUrl: {
          type: String,
          required: true,
          validate: {
            validator: (v: string) => /^https?:\/\//i.test(v),
            message: () => 'Некорректный формат ссылки.',
          },
        },

        // Кнопка призыва к действию
        callToAction: {
          type: String,
          required: [true, 'Не выбрана кнопка призыва к действию.'],

          // TODO для заливов за трафик и конверсии доступны только определённые
          enum: {
            values: Object.values(ECallToAction),
            message: 'Призыв к действию {VALUE} не поддерживается.',
          },
        },

        profileImage: String,
      }),
    ],

    // Лог действий залива
    log: [
      new Schema({
        // Текстовое описание шага
        description: {
          type: String,
          required: true,
        },

        // Выполнен ли шаг
        isDone: {
          type: Boolean,
          required: true,
          default: false,
        },

        // Успешно ли выполнен шаг
        isSucceed: {
          type: Boolean,
          required: true,
          default: false,
        },

        // Если есть - пояснение, почему провалено выполнение шага
        error: String,
      }),
    ],

    // Владелец файла
    owner: {
      type: String,
      trim: true,
      required: true,
      lowercase: true,
    },

    // Описание (для удобства)
    description: String,
  },
  { timestamps: {} },
)

interface ICampaignLoadSchema extends Document {
  advertisers: string[]
  campaign: {
    name: string
    objective: EAdvertisingObjective
    budgetMode?: EBudgetMode
    budget?: number
  }
  adGroup: {
    name: string
    age: EAudienceAgeRange[]
    gender: EAudienceGender
    location: EAudienceGeoLocation[]
    languages: EAudienceLanguage[]
    optimizationGoal: EOptimizationGoal
    bid?: number
    bidType: EBiddingStrategy
    conversionBid?: number
    billingEvent?: EBillingEvent
    budget: number
    budgetMode?: EBudgetMode // На самом деле EBudgetMode.Day
    placement?: EPlacement[]
    placementType?: EPlacementType
    creativeMaterialMode?: ECreativeDeliveryMode
    promotedObjectType?: EPromotedObjectType
    skipLearningPhase?: 0 | 1
    isCommentDisable?: 0 | 1
    pacing?: ESpeedOfAdDelivery
    scheduleType?: EScheduledAdvertisingTime
    videoDownloadPermissions?: EVideoDownloadPermissions
  }
  ads: {
    name: string
    title: string
    text: string
    format?: ECreativeType
    creative: string
    profileImage?: string
    landingPageUrl: string
    callToAction: ECallToAction
  }[]
  log: {
    description: string
    isDone: boolean
    isSucceed: boolean
    error?: string
  }[]
  owner: string
  description: string
  createdAt?: number
  updatedAt?: number
}

// Instance methods
export type ICampaignLoad = ICampaignLoadSchema

// Static methods
export type ICampaignLoadModel = Model<ICampaignLoadSchema>

// export const CampaignLoadMdl = <ICampaignLoadModel>models['campaign-loads']
//   || model<ICampaignLoad, ICampaignLoadModel>('campaign-loads', CampaignLoadSchema)

// TODO попробовать экспортнуть ещё куда-нить. Будет ли конфликт?
export const CampaignLoadMdl = model<ICampaignLoad>('campaign-loads', CampaignLoadSchema)
