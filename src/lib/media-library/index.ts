import fs from 'fs'
import path from 'path'
import { createHash, Hash } from 'crypto'
import { initLogger } from '../../util'
import { EMediaLibraryObject } from './types'

const log = initLogger('MediaLibrary')

// Корневая директория
const ROOT = './media-library'

// Директория с видео креативами
const VIDEO_CREATIVE_FOLDER = path.join(ROOT, 'creatives', 'video')

// Временная директория видео креативов (на время процедуры загрузки)
const VIDEO_CREATIVE_TMP_FOLDER = path.join(VIDEO_CREATIVE_FOLDER, 'tmp')

// Директория с изображениями профиля
const PROFILE_IMAGE_FOLDER = path.join(ROOT, 'profile-images')

// Временная директория изображений профиля (на время процедуры загрузки)
const PROFILE_IMAGE_TMP_FOLDER = path.join(PROFILE_IMAGE_FOLDER, 'tmp')

// Создаём при необходимости нужные папки в момент старта приложения (темпы лежат внутри основных папок)
for (const folder of [VIDEO_CREATIVE_TMP_FOLDER, PROFILE_IMAGE_TMP_FOLDER]) {
  if (!fs.existsSync(folder)) {
    // Права 777 избыточны, а 644 (rw- r-- r--) должны быть в самый раз
    fs.mkdir(folder, { mode: 644, recursive: true }, (error) => {
      if (error) {
        throw error
      }
    })
  }
}

/**
 * Класс для работы с медиа файлами в контексте файловой системы.
 * Временные файлы именуются временной меткой.
 * Постоянные файлы именуются значением sha256 хэш-суммы в нижнем регистре.
 * Все файлы записываются как бинарники, без расширений.
 *
 * NOTE:
 * При работе с путями ВСЕГДА нужно использовать пакет path и функцию path.join() в частности для безопасной работы
 * с файловой системой. Единственное, что нужно делать помимо этого - вручную проверять, чтобы итоговые пути не
 * содержали уязвимости path traversal, которая позволяет совершить побег из "песочницы". Т.е. нужно убедиться в
 * отсутствии конструкций вида "../" в итоговом пути.
 *
 */
export class MediaLibrary {
  // Пул загружаемых файлов
  private _uploadPool: {
    [key: number]: {
      type: EMediaLibraryObject
      stream: fs.WriteStream
      sha256: Hash
      md5: Hash
    }
  } = {}

  // TODO проверка на sandbox escape
  // TODO тип - видеокреатив и изображение профиля
  // TODO темпы и конечный файл
  // TODO чистка темпов
  // TODO хеш суммы
  constructor() {}

  /**
   * Инициализация процесса загрузки файла. Создание временного файла и стрима до него.
   *
   * @param {EMediaLibraryObject} type - Тип ассета медиа библиотеки
   */
  public initUpload(type: EMediaLibraryObject) {
    let temporaryPath: string
    let timestamp: number

    // Генерим новые временные метки до тех пор, пока не найдём такую, которая не сущетсвует как файл и не присутсвует в пуле загружаемых файлов
    do {
      timestamp = Date.now()
      temporaryPath = getTemporaryPathByFileType(timestamp.toString(), type)
    } while (fs.existsSync(temporaryPath) && !!this._uploadPool[timestamp])

    // Формируем стрим и хэши для новой загрузки и закидываем в пул
    this._uploadPool[timestamp] = {
      type,
      stream: fs.createWriteStream(temporaryPath),
      sha256: createHash('sha256'),
      md5: createHash('md5'),
    }

    // Возвращаем ID стрима (временную метку)
    return timestamp
  }

  /**
   * Запись чанка данных в предварительно инциированную загрузку.
   *
   * @param {number} uploadId - Timestamp инициированной загрузки
   * @param {Buffer} chunk - Чанк бинарных данных
   * @throws Error
   */
  public uploadChunk(uploadId: number, chunk: Buffer) {
    const upload = this._uploadPool[uploadId]
    if (!upload) {
      const error = new Error('Запись по несуществующему ID загрузки.')
      log.error('', error)
      throw error
    }

    upload.md5.update(chunk)
    upload.sha256.update(chunk)
    return upload.stream.write(chunk)
  }

  /**
   * Остановка и отмена загрузки с чисткой временных данных.
   *
   * @param {number} uploadId - Timestamp инициированной загрузки
   */
  public abortUpload(uploadId: number) {
    const upload = this._uploadPool[uploadId]
    if (upload) {
      upload.stream.destroy()
      delete this._uploadPool[uploadId]

      // Удаляем временный файл
      try {
        fs.rmSync(getTemporaryPathByFileType(uploadId.toString(), upload.type))
      } catch (error) {
        // Просто логируем ошибку, она никак не влияет на финальный результат
        log.error('', error)
      }
    }
  }

  /**
   * Завершение загрузки и перемещение файла из временного в постоянный (если такого ещё не существует).
   *
   * @param {number} uploadId - Timestamp инициированной загрузки
   */
  public finishUpload(uploadId: number) {
    const upload = this._uploadPool[uploadId]
    if (upload) {
      const { type, stream, sha256, md5 } = upload
      stream.end()
      const hashSum = {
        md5: md5.digest('hex'),
        sha256: sha256.digest('hex'),
      }

      const sourcePath = getTemporaryPathByFileType(uploadId.toString(), type)
      const destinationPath = getPathByFileType(hashSum.sha256, type)

      // Смотрим, существует ли файл с такой хэш-суммой, и если не существует - копируем его.
      if (!fs.existsSync(destinationPath)) {
        const source = fs.createReadStream(sourcePath)
        const destination = fs.createWriteStream(destinationPath)
        source.pipe(destination)
      }

      // Удаляем временный файл
      try {
        fs.rmSync(sourcePath)
      } catch (error) {
        // Просто логируем ошибку, она никак не влияет на финальный результат
        log.error('', error)
      }

      return hashSum
    }
  }

  /**
   * Геттер стрима файла по SHA-256 хэшу.
   *
   * @param {string} sha256 - SHA-256 хэш файла
   * @param {EMediaLibraryObject} type - Тип ассета медиа библиотеки
   * @throws Error
   */
  public getFileStream(sha256: string, type: EMediaLibraryObject) {
    // Приводим хэш в нижний регистр, как и именуются файлы
    sha256 = sha256.toLowerCase()

    // Предотвращаем возможный path traversal здесь (при наличии потенциальных логических уязвимостей уровнями выше)
    if (!/[\da-f]{64}/i.test(sha256)) {
      const error = new Error('Невалидный SHA-256 хэш.')
      log.error('', error)
      throw error
    }

    const sourcePath = getPathByFileType(sha256, type)
    if (!fs.existsSync(sourcePath)) {
      return null
    }

    return fs.createReadStream(sourcePath)
  }
}

function getPathByFileType(fileName: string, type: EMediaLibraryObject) {
  switch (type) {
    case EMediaLibraryObject.ProfileImage:
      return path.join(PROFILE_IMAGE_FOLDER, fileName)
    case EMediaLibraryObject.VideoCreative:
    default:
      return path.join(VIDEO_CREATIVE_FOLDER, fileName)
  }
}

function getTemporaryPathByFileType(fileName: string, type: EMediaLibraryObject) {
  switch (type) {
    case EMediaLibraryObject.ProfileImage:
      return path.join(PROFILE_IMAGE_TMP_FOLDER, fileName)
    case EMediaLibraryObject.VideoCreative:
    default:
      return path.join(VIDEO_CREATIVE_TMP_FOLDER, fileName)
  }
}
