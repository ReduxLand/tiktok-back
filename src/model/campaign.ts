import { Document, Schema, Model, model, models } from 'mongoose'
import {
  EAdvertisingObjective,
  EAudienceAgeRange,
  EAudienceGender,
  EAudienceGeoLocation,
  EAudienceLanguage,
  EBiddingStrategy,
  EBudgetMode,
  ECallToAction,
  EOptimizationGoal,
} from '../lib/tiktok/marketing/types/enums'
import moment from 'moment'

/**
 * Сущность рекламной кампании.
 * Метаданные РК строятся на базе пресетов. Пока мы не учитываем это, а считаем, что пресет один, и он hardcoded.
 *
 */
const CampaignSchema = new Schema(
  {
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
    },

    // Параметры группы объявлений
    adGroup: {
      // Название группы объявлений
      name: {
        type: String,
        required: [true, 'Название группы объявлений должно быть задано.'],
        default: () => 'Группа объявлений #' + Date.now(),
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

      // Стратегия ставок
      bidStrategy: {
        type: String,
        required: [true, 'Стратегия ставок должна быть задана.'],
        enum: [EBiddingStrategy.Manual, EBiddingStrategy.DisableBidControl],
      },

      // Ставка за клик (при оптимизиации по кликам)
      bid: {
        type: Number,
        default: 0,
      },

      // Ставка за конверсию (при оптимизации по конверсиям)
      conversionBid: {
        type: Number,
        default: 0,
      },

      // Бюджет в рублях. Самый высокий порог - для России, на другие валюты переводим по курсу ЦБ
      budget: {
        type: Number,
        required: [true, 'Бюджет должен быть задан.'],
        min: [2000, 'Минимальный дневной бюджет 2000 рублей.'],
      },

      // Бюджет группы объявлений. Вроде, есть только один вариант - дневной бюджет.
      budgetMode: {
        type: String,
        required: [true, 'Тип бюджета должен быть задан.'],
        enum: [
          EBudgetMode.Day,
          // EBudgetMode.Infinite, // Это для кампаний, а не для адсетов
        ],
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

interface ICampaignSchema extends Document {
  campaign: {
    name: string
    objective: EAdvertisingObjective
  }
  adGroup: {
    name: string
    gender: EAudienceGender
    age: EAudienceAgeRange[]
    location: EAudienceGeoLocation[]
    languages: EAudienceLanguage[]
    optimizationGoal: EOptimizationGoal
    bidStrategy: EBiddingStrategy
    bid?: number
    conversionBid?: number
    budget: number
    budgetMode: EBudgetMode // На самом деле EBudgetMode.Day
  }
  ads: {
    name: string
    title: string
    text: string
    creative: string
    profileImage?: string
    landingPageUrl: string
    callToAction: ECallToAction
  }[]
  owner: string
  description: string
  createdAt?: number
  updatedAt?: number
}

// Instance methods
export type ICampaign = ICampaignSchema

// Static methods
export type ICampaignModel = Model<ICampaignSchema>

export const CampaignMdl: ICampaignModel =
  <ICampaignModel>models['campaigns'] ||
  model<ICampaign, ICampaignModel>('campaigns', CampaignSchema)
