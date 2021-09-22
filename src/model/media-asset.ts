import { Document, Schema, Model, model, models } from 'mongoose'
import { EMediaLibraryObject } from '../lib/media-library/types'

/**
 * Сущность медиа ассетов для использования в рекламных кампаниях TikTok.
 * TODO Uploaded from ... url? Imported from ... account?
 *
 * Папки для креативов созданы для удобства доступа и имеют лишь виртуальное значение. Вложенность любая, записываем
 * путь через /. Корневая папка - "/". Физически файлы креативов хранятся в @/media-library/username/sha256
 * без расширений, по папкам не раскидываются. Т.о. избегаем дубликатов креативов при одинаковых хеш-суммах.
 *
 */
const MediaAssetSchema = new Schema(
  {
    // Тип медиа ассета (видео креатив/изображения профиля/etc.)
    assetType: {
      type: String,
      required: true,
      enum: Object.values(EMediaLibraryObject),
    },

    // Название креатива (для отображения). По-умолчанию имя оригинального файла
    displayName: {
      type: String,
      required: true,
      default: function () {
        return this.fileName
      },
    },

    // Оригинальное имя файла
    fileName: {
      type: String,
      required: [true, 'Имя файла не может быть пустым.'],
      validate: {
        // Имя файла не должно содержать запрещённых символов
        validator: (v: string) => !/["*/:<>?\\|]/.test(v),
        message: (properties) => 'Задано некорректное имя файла.',
      },
    },

    // Размер файла в байтах
    fileSize: {
      type: Number,
      required: [true, 'Нельзя загружать пустые файлы.'],
    },

    // Тип контента. // TODO enum разрешённых типов
    contentType: {
      type: String,
      trim: true,
      required: true,
      lowercase: true,
      default: 'application/octet-stream',
    },

    // Виртуальный путь к файлу
    folder: {
      type: String,
      trim: true,
      default: '',
      text: true, // Индекс полнотекстового поиска для быстрого доступа к подпапкам (часть строки)
      validate: {
        // Путь не должен начинаться с /, а также не должно быть больше одного / подряд и запрещённых символов.
        validator: (v: string) => !/^\//.test(v) && !/\/{2,}/.test(v) && !/["*:<>?\\|]/.test(v), // TODO unicode?
        message: () => 'Указан некорректный путь.',
      },
      // TODO если заканчивается на / или их серию - то удаляем его/их. Это задача контроллера, поэтому делаем это там.
    },

    // MD5-сумма (для совместимости с ТикТок)
    md5: {
      type: String,
      required: true,
      lowercase: true,
      index: true, // Индексируем для совместимости с ТикТок
      validate: {
        validator: (v: string) => /[\da-f]{32}/i.test(v),
        message: (properties) => properties.value + ' не соответствует валидному хэшу MD5.',
      },
    },

    // SHA256-сумма
    sha256: {
      type: String,
      required: true,
      lowercase: true,
      index: true, // Индексируем для нас
      validate: {
        validator: (v: string) => /[\da-f]{64}/i.test(v),
        message: (properties) => properties.value + ' не соответствует валидному хэшу SHA256.',
      },
    },

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

// Собираем уникальный композитный индекс на sha256 + owner (порядок важен).
MediaAssetSchema.index({ sha256: 1, owner: 1 }, { unique: true })

interface IMediaAssetSchema extends Document {
  assetType: EMediaLibraryObject
  displayName: string
  fileName: string
  fileSize: number
  contentType: string
  folder: string
  md5: string
  sha256: string
  owner: string
  description: string
  createdAt?: number
  updatedAt?: number
}

// Instance methods
export type IMediaAsset = IMediaAssetSchema

// Static methods
export interface IMediaAssetModel extends Model<IMediaAssetSchema> {
  getFolderTree: () => void // TODO Model.distinct('folder').then(create nested object)
  getFolderContent: () => void // TODO contains folders and files
}

export const MediaAssetMdl: IMediaAssetModel =
  <IMediaAssetModel>models['media-assets'] ||
  model<IMediaAsset, IMediaAssetModel>('media-assets', MediaAssetSchema)
