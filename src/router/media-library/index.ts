import Busboy from 'busboy'
import { Router, Request, Response } from 'express'
import { initLogger } from '../../util'
import { respondClientError, respondPayload, respondServerError } from '../util'
import { MediaAssetMdl } from '../../model'
import { MediaLibrary } from '../../lib/media-library'
import { EMediaLibraryObject } from '../../lib/media-library/types'
import { EMediaLibraryImageMimetype, EMediaLibraryVideoMimetype } from './types'

export const MediaLibraryRouter = Router()
const log = initLogger('Router.MediaLibrary')
const ALLOWED_VIDEO_MIMETYPES = Object.values(EMediaLibraryVideoMimetype)
const ALLOWED_IMAGE_MIMETYPES = Object.values(EMediaLibraryImageMimetype)
const library = new MediaLibrary()

// Список креативов
MediaLibraryRouter.get('/', (request: Request, response: Response) => {
  return respondClientError(response, new Error('API endpoint not implemented yet.'), null, 501)
})

// Загрузка нового креатива // TODO загрузка с указанного URL
MediaLibraryRouter.post('/', (request: Request, response: Response) => {
  const { user } = response.locals

  if (!user) {
    return respondClientError(response, new Error('Unauthorized.'), log, 401)
  }

  // Инициируем принимающий стрим парсера multipart/formdata
  try {
    const imageMaxSize = 50 * 1024 // Максимальный размер изображения профиля 50 КБ (строгое неравенство, т.е. < 50 КБ)
    const busboy = new Busboy({
      headers: request.headers,
      limits: {
        files: 1, // Разрешаем только 1 file per upload (возможно, в дальнейшем это изменится)
        fileSize: 100 * 1024 * 1024, // Максимальный размер видео-креатива 500 МБ (нестрогое неравенство, т.е. ≤ 500 МБ)
      },
    })

    // ID текущей загрузки
    let uploadId: number

    // Тип загружаемого ассета
    let assetType: EMediaLibraryObject

    // Mimetype файла
    let contentType: string

    // Имя оригинального файла
    let filename = ''

    // Размер оригинального файла
    let filesize = 0

    // Флаг превышения лимита на размер файла
    let isLimit = false

    /**
     * Название поля (fieldName), в котором пришёл файл, соответствует целевому объекту медиа библиотеки.
     * Т.е. если файл пришёл в поле video_creative - это видео, а если в profile_image - это изображение профиля.
     *
     * TODO проверка сигнатуры видеофайлов, пока что верим на слово mimetype.
     * TODO а если encoding !== binary, а, например, картинка в base64, это всё-равно переведётся в бинарник чи нет?
     *
     */
    busboy.on('file', (fieldName, file, fileName, encoding, mimetype) => {
      filename = fileName
      assetType = fieldName as EMediaLibraryObject
      contentType = mimetype

      // Проверяем разрешённые объекты медиа библиотеки и их mimetypes. Вешаем для видео и картинок разные обработчики.
      switch (fieldName) {
        // Обработка видео креатива
        case EMediaLibraryObject.VideoCreative:
          {
            // Если передан недопустимый для видеокреатива mimetype - прерываем обработку входящих данных
            if (!~ALLOWED_VIDEO_MIMETYPES.indexOf(<EMediaLibraryVideoMimetype>mimetype)) {
              terminateRequest(request)
              return respondClientError(response, new Error('Недопустимый формат видеокреатива.'), log)
            }

            // Инициируем новую загрузку
            uploadId = library.initUpload(EMediaLibraryObject.VideoCreative)

            file.on('data', (chunk: Buffer) => {
              filesize += chunk.length
              library.uploadChunk(uploadId, chunk)
            })
          }
          break

        // Обработка изображения профиля
        case EMediaLibraryObject.ProfileImage:
          {
            if (!~ALLOWED_IMAGE_MIMETYPES.indexOf(<EMediaLibraryImageMimetype>mimetype)) {
              terminateRequest(request)
              return respondClientError(response, new Error('Недопустимый формат изображения.'), log)
            }

            // Инициируем новую загрузку
            uploadId = library.initUpload(EMediaLibraryObject.ProfileImage)

            // В отличии от обработки видео, при превышении лимита размера цепочка вызовов заканчивается здесь
            file.on('data', (chunk: Buffer) => {
              filesize += chunk.length
              library.uploadChunk(uploadId, chunk)

              if (filesize >= imageMaxSize) {
                terminateRequest(request)
                library.abortUpload(uploadId)
                return respondClientError(
                  response,
                  new Error('Превышен максимальный размер изображения 50 КБ.'),
                  log,
                )
              }
            })
          }
          break

        // Всё остальное - глушим шарманку и трубим тревогу
        default:
          // Терминейтим дальнейшую обработку входящих данных
          request.unpipe(busboy)
          return respondClientError(response, new Error('Неизвестный объект медиа библиотеки.'), log)
      }

      // Событие превышения лимита на размер файла, следом за которым сразу срабатывает событие on.end
      file.on('limit', () => {
        isLimit = true
        // library.abortUpload(uploadId) // Перенесём это в busboy.finish, чтобы выполнилось синхронно с ответом
      })

      // Событие полной передачи файла (либо после превышения лимита на размер, т.е. после file.limit)
      file.on('end', () => {
        // if (!isLimit) {
        //   library.finishUpload(uploadId) // Перенесём это в busboy.finish, чтобы выполнилось синхронно с ответом
        // }
      })
    })

    // На будущее, когда мы в загрузке будем передавать папку назначения, ну и тип наверное отдельным параметром, и file.
    // busboy.on('field')

    // Обработка ошибок парсера
    busboy.on('error', (error: Error) => {
      log.error('', error)
      library.abortUpload(uploadId)
      return respondClientError(response, new Error('Непредвиденная ошибка загрузки файла.'), log)
    })

    // Обработка окончания парсинга. В нашем случае одного файла стреляет после file.end
    busboy.on('finish', () => {
      // Если не прервана в file.data (как для картинок), цепочка событий file.limit? -> file.end -> busboy.finish
      if (isLimit) {
        library.abortUpload(uploadId)
        return respondClientError(response, new Error('Превышен максимальный размер видео 100 МБ.'), log)
      }

      // Говорим либе заперзистить файл в основной библиотеке и вернуть нам хэш-суммы
      const { md5, sha256 } = library.finishUpload(uploadId)

      // return respondPayload(res, true)
      // Пишем всё в БД и возвращаем ответ клиенту
      // TODO сделать compoundIndex по owner и sha256, записывать только уникальные пары. Или же update с upsert'ом, но не забывать про овнера.
      return MediaAssetMdl.findOneAndUpdate(
        {
          sha256,
          owner: user.username,
        },
        {
          assetType,
          contentType,
          fileName: filename,
          fileSize: filesize,
          owner: user.username,
          sha256,
          md5,
        },
        {
          upsert: true,
          new: true, // Чтобы получать данные новых файлов, которых раньше не было
        },
      )
        .then((creative) => {
          if (!creative) {
            return respondClientError(response, new Error('Неизвестная ошибка регистрации файла.'), log)
          }

          const { _id: id, sha256, assetType, displayName, fileSize, folder } = creative
          return respondPayload(response, true, {
            id,
            sha256,
            folder,
            fileSize,
            assetType,
            contentType,
            displayName,
          })
        })
        .catch((error) => respondServerError(response, error, log))
    })

    // Стримим запрос в busboy
    return request.pipe(busboy)
  } catch {
    // Конструктор Busboy может выбросить 2 ошибки: неподдерживаемый Content-Type или его отсутствие
    return respondClientError(response, new Error('Недопустимый Content-Type.'), log)
  }
})

/**
 * Примечание: здесь немного коряво сделано, чтобы показать два возможных подхода.
 * 1. Как в случае с изображениями профиля, вручную считать количество переданных данных, и при превышении лимита
 *    прерывать дальнейшее выполнение и отдавать ответ сервера там же, в событии file.data (при этом дальнейшая цепочка
 *    событий не будет вызвана, всё заканчивается на file.data).
 * 2. Как в случае с видео креативами, можно задать лимит размера файла в конфигурации busboy, и не считать его руками.
 *    Тогда цепочка событий идёт дальше file.data -> file.limit? (при превышении лимита) -> file.end -> busboy.finish.
 *    И на протяжении всей этой цепочки нужно отслеживать и правильно обрабатывать два возможных состояния - когда лимит
 *    превышен и когда всё в порядке.
 */

function terminateRequest(request: Request) {
  request.unpipe()
  // req.socket.end()
}
