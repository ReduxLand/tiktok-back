import { Document, Schema, Model, model, models } from 'mongoose'
import { ECurrency } from '../lib/currency-converter/types'
import { EAdvertiserStatus } from '../lib/tiktok/marketing/types/enums'

/**
 * Сущность подключаемых ТикТок аккаунтов, которыми необходимо управлять.
 * Тут назревает вопрос. Access token привязан к конкретному приложению, которое авторизовал юзер.
 * Если его забанят вдруг - токен становится недействительным, и требуется новое приложение и новая авторизация.
 * Т.о., если в будущем узнаем, что есть вероятность бана приложений, то нужно будет продумать механизм управления
 * этими приложениями, и установкой зависимостей в этой сущности, от какого приложения тут токен сохранён.
 * То же самое касается ситуации, в которой мы будем упираться в лимиты ТикТока на одно приложение (QPS / QPM / QPD).
 * Ну и нужен функционал автоматической авторизации, в тиктоке + в приложении, антикапчу придётся подрубать и прокси.
 *
 * Пока же принимаем за данность, что приложения не банят, а сами App ID и секрет задаются в настройках профиля
 * пользователя (User) и хранятся там же.
 * Токен, соответственно, всегда относится именно к этому приложению. Впрочем, если приложение живёт, токены остались,
 * а в настройки задали новое приложение, старые токены остаются валидными, причём нам не нужно помнить, от какого они
 * приложения - они всё-равно продолжат работу.
 *
 * Возможно, нужно ещё будет придумать для удобства что-то с сохранением логина и пароля от аккаунта, т.к. в OAuth
 * мы их никогда не касаемся, но если возникнет необходимость в повторных подключениях аккаунтов - это будет удобно.
 *
 */
const TikTokAccountSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      trim: true,
      required: true,
      lowercase: true,
    },

    // Связь владелец->аккаунт через это поле
    owner: {
      type: String,
      trim: true,
      required: true,
      lowercase: true,
      index: true, // Индексируем поле, т.к. в основном именно по владельцу мы получаем нужные аккаунты
    },

    // Отображаемое имя
    displayName: {
      type: String,
      required: true,
    },

    // Токен доступа
    accessToken: {
      type: String,
      required: true,
    },

    // Поле описания аккаунта. Для удобства
    description: String,

    // Приложение, в котором активен Access Token. Нужен и здесь тоже для инвалидации токена в случае смены секрета
    tiktokApp: {
      // ID приложения
      id: {
        type: String,
        required: true,
        validate: {
          validator: (value: string) => /\d{19}/.test(value),
          message: (properties: any) => `${properties.value} is invalid App ID.`,
        },
      },
    },

    // Рекламные аккаунты
    advertisers: [
      new Schema({
        // Идентификатор. *Уникальность не работает для вложенных схем
        id: {
          type: String,
          required: true,
        },

        // Отображаемое имя в TikTok Ads Manager
        name: {
          type: String,
          required: true,
        },

        // Состояние аккаунта
        status: {
          type: String,
          required: true,
          enum: Object.values(EAdvertiserStatus),
        },

        // Валюта аккаунта
        currency: {
          type: String,
          enum: Object.values(ECurrency),
        },
      }),
    ],
  },
  { timestamps: {} },
)

interface ITikTokAccountSchema extends Document {
  id: string
  email: string
  owner: string
  displayName: string
  accessToken: string
  description?: string
  tiktokApp: {
    id: string
    secret: string
  }
  advertisers: {
    id: string
    name: string
    status?: EAdvertiserStatus // TODO enum https://ads.tiktok.com/marketing_api/docs?id=1701890985340929
    currency?: ECurrency
  }[]
  createdAt?: number
  updatedAt?: number
}

// Instance methods
export type ITikTokAccount = ITikTokAccountSchema

// Static methods
export interface ITikTokAccountModel extends Model<ITikTokAccount> {
  // У документа только атрибут с токеном
  getAccessToken: (accountId: string, owner: string) => Promise<Pick<ITikTokAccount, 'accessToken'>>
  getCredentials: (
    accountId: string,
    owner: string,
  ) => Promise<{ appId: string; accessToken: string }>
}

/**
 * NOTE:
 *
 * Covered Query for better performance (и использованной сервером монги памяти, и итоговым объёмом передаваемых данных).
 * По-умолчанию при обычных запросах на сервере монги в память загружается весь документ, а при наличии проджектинга
 * фильтруется, и отдаётся ответ. Но по факту обрабатывается весь документ, в этом случае при проджектинге идёт только
 * экономия по объёму передаваемых через сеть данных (т.е. ответа монги).
 * При использовании т.н. covered запросов же в память загружается не весь документ целиком, а только те поля, которые
 * указаны в проджектинге. В итоге получаем оптимизацию и по скорости обработки запроса + использованной сервером монги
 * оперативы, и по объёму данных, передаваемых в ответе (минимизируем).
 * Чтобы запрос стал "covered", нужно в проджектинге исключить из выдачи _id, т.е. { _id: 0 }. Пример в этом методе.
 * Ещё и lean() впридачу, чтобы возвращалась сырая структура, без дополнительной обработки.
 *
 * Используем поиск по двум параметрам (id и owner), чтобы юзер мог получить только свои аккаунты.
 */
TikTokAccountSchema.statics.getAccessToken = function getAccessToken(
  accountId: string,
  owner: string,
) {
  return this.findOne({ id: accountId, owner }, { _id: 0, accessToken: 1 }).lean()
}

// TODO а чё с тайпингами? Почему не подгружает, руками приходится прописывать
TikTokAccountSchema.statics.getCredentials = function getCredentials(
  accountId: string,
  owner: string,
) {
  return this.findOne({ id: accountId, owner }, { '_id': 0, 'accessToken': 1, 'tiktokApp.id': 1 })
    .lean()
    .then((credentials: { tiktokApp: { id: string }; accessToken: string }) => {
      const { tiktokApp, accessToken } = credentials
      return {
        accessToken,
        appId: tiktokApp?.id,
      }
    })
}

export const TikTokAccountMdl: ITikTokAccountModel =
  <ITikTokAccountModel>models['tiktok-accounts'] ||
  model<ITikTokAccount, ITikTokAccountModel>('tiktok-accounts', TikTokAccountSchema)
