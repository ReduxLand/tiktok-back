import { Router, Request, Response, NextFunction } from 'express'
import { initLogger } from '../../util'
import { MediaAssetMdl } from '../../model'
import { MediaLibrary } from '../../lib/media-library'
import { EMediaLibraryObject } from '../../lib/media-library/types'

export const MediaLibraryPublicRouter = Router()
const log = initLogger('Router.MediaLibrary.Public')
const library = new MediaLibrary()

// Для сохранения CSS-styled маршрутов маппим типы ассетов к внутрисистемным
const ASSET_TYPE_MAP: {
  [type: string]: EMediaLibraryObject
} = {
  'video-creative': EMediaLibraryObject.VideoCreative,
  'profile-image': EMediaLibraryObject.ProfileImage,
}

// Отдача оригинала запрашиваемого файла (для загрузки ассетов в ТикТок через URL). Публичный доступ без авторизации.
MediaLibraryPublicRouter.get('/:type/:sha256', (request: Request, response: Response, next: NextFunction) => {
  const { type } = request.params
  let { sha256 } = request.params
  sha256 = sha256.toString().toLowerCase()

  // Если это не известные нам типы ассетов или вообще что-то другое - пропускаем дальше, скорее всего на 404
  if (!Object.keys(ASSET_TYPE_MAP).includes(type)) {
    return next()
  }

  // Для невалидного sha256 сразу бросаем 404
  if (!sha256 || !/[\da-f]{64}/i.test(sha256)) {
    return response.status(404).end()
  }

  // Тип медиа ассета
  const assetType = ASSET_TYPE_MAP[type]

  return MediaAssetMdl.findOne(
    { sha256, assetType },
    { _id: 0, md5: 1, fileSize: 1, contentType: 1 },
  )
    .lean()
    .then((creative) => {
      // Если запрошенного файла нет - отвечаем 404
      if (!creative) {
        return response.status(404).end()
      }

      try {
        const file = library.getFileStream(sha256, assetType)

        if (!file) {
          log.error('Файл найден в БД, но отсутствует в файловой системе.', { sha256 })
          return response.status(404).end()
        }

        // Ставим нужные заголовки. Т.к. виртуально файлов с таким хешем может быть больше 1, пока отдаём рандомное имя
        if (creative.md5) {
          response.set('Content-MD5', creative.md5) // Для валидации контента при загрузке в ТикТок
        }
        if (creative.fileSize) {
          response.set('Content-Length', creative.fileSize.toString())
        }
        if (creative.contentType) {
          response.set('Content-Type', creative.contentType.toString())
        }
        response.set('Content-Disposition', 'attachment; filename=MediaAsset_' + Date.now()) // creative.fileName

        // Стримим файл в ответ
        file.pipe(response)
      } catch (error) {
        // Если невалидный sha256 - логируем и отвечаем 404
        log.error('', error)
        return response.status(404).end()
      }
    })
})
