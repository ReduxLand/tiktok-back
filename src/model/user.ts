import bcrypt from 'bcrypt'
import { Document, Schema, Model, model, models } from 'mongoose'

// TODO битовую маску на права сделать
export enum Roles {
  User = 'user',
  Admin = 'admin', // Пока неясно, нужны ли вообще права, или у нас равноправие
}

/**
 * Модель пользователя системы (владелец группы тикток аккаунтов).
 * Связь владелец->аккаунт через поле [owner] в модели TikTokAccount:
 * TikTokAccount.owner -> User.username
 * Можно сделать и на ObjectID (_id), но разницы нет особой т.к. так читаемость лучше, а логины меняться не будут.
 *
 */
const UserSchema = new Schema(
  {
    // Email. Пока что генерируется автоматически и нигде не используется
    email: {
      type: String,
      trim: true,
      unique: true,
      required: true,
      lowercase: true,
    },

    // Имя пользователя в lowercase для авторизации и прочих операций
    username: {
      type: String,
      trim: true,
      unique: true,
      required: true,
      lowercase: true,
      minLength: 5,
      maxLength: 20,
      // index: {
      //   unique: true,
      //   collation: { locale: 'en', strength: 2 } // Определяем для уникальности индекса case-insensitive
      // },
    },

    // Имя пользователя в оригинальной раскладке для отображения
    displayName: {
      type: String,
      trim: true,
      required: true,
    },

    // Bcrypt-hashed пароль
    password: {
      type: String,
      required: true,
    },

    // Токен для восстановления пароля/автоматической предрегистрации. На будущее
    recoveryToken: String,

    // Роли пользователя. По-дефолту [Roles.User]
    roles: [String],

    // Описание, для потенциальных админов
    description: String,

    // Приложение на платформе TikTok Ads, через которое получаем Access Token
    tiktokApp: new Schema({
      // ID приложения
      id: {
        type: String,
        required: true,
        validate: {
          validator: (v: string) => /^\d{19}$/.test(v),
          message: (properties: any) =>
            `${properties.value} не является валидным идентификатором приложения.`,
        },
      },

      // Секрет приложения
      secret: {
        type: String,
        trim: true,
        required: true,
        lowercase: true,
        validate: {
          validator: (v: string) => /^[\da-f]{40}$/i.test(v),
          message: (properties: any) =>
            `${properties.value} не является валидным секретом приложения.`,
        },
      },

      // URL-адрес OAuth авторизации приложения
      oauthUrl: {
        type: String,
        required: true,
        validate: {
          validator: (v: string) =>
            /^https:\/\/ads\.tiktok\.com\/marketing_api\/auth\?[^/]+/i.test(v),
          message: () => 'Неверный формат TikTok OAuth URL.',
        },
      },
    }),

    // Сессии пользователя
    sessions: [
      new Schema({
        // Уникальность вложенных схем не работает в монге, но индекс создаётся
        ssid: {
          type: String,
          required: true,
          lowercase: true,
        },
        userAgent: String,

        // TODO лучше хранить как 4х байтовое число для IPv4 или 16 байт IPv6
        ip: {
          type: String,
          required: true,
        },

        // TODO updatedAt (последняя активность)
        createdAt: {
          type: Date,
          default: Date.now,
        },
      }),
    ],
  },
  { timestamps: {} },
)

interface IUserSchema extends Document {
  email: string
  username: string
  password: string
  displayName: string
  roles?: Roles[]
  tiktokApp?: {
    id: string
    secret: string
    oauthUrl: string
  }
  sessions: {
    ssid: string
    ip: string
    userAgent?: string
    createdAt?: number
  }[]
  recoveryToken?: string
  description?: string
  createdAt?: number
  updatedAt?: number
}

// Instance methods
export interface IUser extends IUserSchema {
  validatePassword: (password: string) => boolean
}

UserSchema.methods.validatePassword = function validatePassword(password: string) {
  // @ts-ignore
  return bcrypt.compareSync(password, this.password) // TODO err handling
}

// Этот хук триггерит только на User.save(). Если вызывать напрямую UserMdl.updateOne(), хук не сработает.
UserSchema.pre<IUser>('save', function preSave(next) {
  if (!this.isModified('password')) {
    return next()
  }

  this.password = bcrypt.hashSync(this.password, 10) // TODO err handling
  next()
})

// Static methods
export type IUserModel = Model<IUser>

/**
 * При подключении ES6 модулей их компиляция происходит на каждом импорте, т.е. создаются новые инстансы.
 * Модели mongoose же, напротив, должны быть синглтонами, поэтому, если мы уже подключили модель ранее - берём готовую.
 * И чтобы Typescript не запутался, явно указываем тип модели.
 */
export const UserMdl: IUserModel =
  <IUserModel>models.User || model<IUser, IUserModel>('User', UserSchema)
