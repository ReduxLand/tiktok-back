import { AbstractTikTokApi } from '../../abstract-tiktok-api'
import { TRequestCredentials } from '../../types'
import {
  TAdPreviewPayload,
  TAdPreviewResponse,
  TCreativeAuditPayload,
  TCreativeAuditResponse,
  TImageUploadPayload,
  TImageUploadResponse,
  TMusicCopyrightCheckPayload,
  TMusicCopyrightCheckResponse,
  TTempFileUploadPayload as TTemporaryFileUploadPayload,
  TTempFileUploadResponse as TTemporaryFileUploadResponse,
  TVideoCoverPayload,
  TVideoCoverResponse,
  TVideoInfoPayload,
  TVideoInfoResponse,
  TVideoSearchPayload,
  TVideoSearchResponse,
  TVideoUpdatePayload,
  TVideoUploadPayload,
  TVideoUploadResponse,
} from './types'

enum Endpoint {
  CreativeAudit = '/v1.1/audit/machine_audit/',
  MusicCopyrightCheck = '/v1.1/creative/copyright/get/',
  AdPreview = '/v1.1/creative/ads_preview/create/',
  ImageUpload = '/v1.2/file/image/ad/upload/',
  VideoUpload = '/v1.2/file/video/ad/upload/',
  VideoUpdate = '/v1.2/file/video/ad/update/',
  VideoInfo = '/v1.2/file/video/ad/info/',
  VideoSearch = '/v1.2/file/video/ad/search/',
  VideoCover = '/v1.2/file/video/suggestcover/',
  TemporaryUpload = '/v1.2/file/temporarily/upload/',
  TemporaryUploadInit = '/v1.2/file/start/upload/',
  TemporaryUploadChunk = '/v1.2/file/transfer/upload/',
  TemporaryUploadFinish = '/v1.1/file/finish/upload/',
}

/**
 * Класс для работы с рекламными материалами.
 * Автоматическая премодерация, проверка нарушений прав, работа с рекламными медиа материалами.
 *
 * @constructor
 */
export class TikTokCreativeApi extends AbstractTikTokApi {
  constructor() {
    super()
  }

  /**
   * Предварительный машинный аудит рекламных материалов.
   *
   * Метод проводит быстрый аудит рекламных материалов, первично их прогоняя через свой модерский ИИ.
   * Если что-то из представленного не прошло - 100% не пройдёт и полноценную модерацию.
   * Если прошло - хорошо, но всё-равно нет гарантии, что пройдёт ручную.
   *
   * @param {TRequestCredentials} credentials
   * @param {TCreativeAuditPayload} payload
   * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1680443361542146}
   */
  public audit(credentials: TRequestCredentials, payload: TCreativeAuditPayload) {
    return this._callApi<TCreativeAuditResponse>(
      'GET',
      Endpoint.CreativeAudit,
      payload,
      credentials,
    )
  }

  /**
   * Проверка звуковой дорожки видео на нарушение авторских прав какого-либо музыкального произведения.
   *
   * Для этого метода предусмотрены другие лимиты.
   * Query Limits (QPS / QPM / QPD:
   *  Level 1: 1 / 30 / 5000
   *  Level 2: 2 / 60 / 10000
   *  Level 3: 3 / 90 / 15000
   *
   * @param {TRequestCredentials} credentials
   * @param {TMusicCopyrightCheckPayload} payload
   * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1680443361542146}
   */
  public checkMusicCopyright(
    credentials: TRequestCredentials,
    payload: TMusicCopyrightCheckPayload,
  ) {
    return this._callApi<TMusicCopyrightCheckResponse>(
      'GET',
      Endpoint.MusicCopyrightCheck,
      payload,
      credentials,
    )
  }

  /**
   * Предпросмотр рекламного объявления.
   *
   * Метод позволяет получить ссылку на предпросмотр объявления. Время жизни ссылки 24 часа.
   * Query Limits (QPS / QPM / QPD:
   *  Level 1: 1 / 30 / 5000
   *  Level 2: 2 / 60 / 10000
   *  Level 3: 3 / 90 / 15000
   *
   * @param {TRequestCredentials} credentials
   * @param {TAdPreviewPayload} payload
   * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1687580956091393}
   */
  public previewAd(credentials: TRequestCredentials, payload: TAdPreviewPayload) {
    return this._callApi<TAdPreviewResponse>('POST', Endpoint.AdPreview, payload, credentials)
  }

  /**
   * Загрузка изображений на рекламную платформу.
   *
   * @param {TRequestCredentials} credentials
   * @param {TImageUploadPayload} payload
   */
  public uploadImage(credentials: TRequestCredentials, payload: TImageUploadPayload) {
    return this._callApi<TImageUploadResponse>('POST', Endpoint.ImageUpload, payload, credentials)
  }

  /**
   * Загрузка видео на рекламную платформу.
   *
   * Если загружено два видео с одинаковым именем файла, второе видео будет переименовано с добавлением временной метки.
   * Есть два метода загрузки: по ссылке и файлом. Файл загружается в multipart/form-data.

   * Требования и рекомендации к видеоматериалам см. Video Ads Specifications.
   * API Endpoint имеет таймаут 10 секунд между вызовами.
   *
   * При загрузке через URL возвращается только id и video_id. Если необходима валидации хэш-суммы, HTTP-ответ
   * URL, по которому доступно видео, должен возвращать ещё и заголовок Content-MD5.
   *
   * @todo Разобраться, почему-то при multipart/form-data не передаётся пейлоад.
   * @param {TRequestCredentials} credentials
   * @param {TVideoUploadPayload} payload
   * @see [Creative Tips]{@link https://ads.tiktok.com/help/article?aid=9531}
   * @see [Video Ads Specifications]{@link https://ads.tiktok.com/help/article?aid=9626}
   * @see [Intelligent Optimization Tool]{@link https://ads.tiktok.com/help/article?aid=9627}
   * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1687580946926593}
   */
  public uploadVideo(credentials: TRequestCredentials, payload: TVideoUploadPayload) {
    return this._callApi<TVideoUploadResponse>('POST', Endpoint.VideoUpload, payload, credentials)
  }

  /**
   * Переименовывание видео.
   *
   * @param {TRequestCredentials} credentials
   * @param {TVideoUpdatePayload} payload
   */
  public updateVideo(credentials: TRequestCredentials, payload: TVideoUpdatePayload) {
    return this._callApi('POST', Endpoint.VideoUpdate, payload, credentials)
  }

  /**
   * Получение информации для массива видеоматериалов (до 100 шт.).
   *
   * @param {TRequestCredentials} credentials
   * @param {TVideoInfoPayload} payload
   */
  public getVideoInfo(credentials: TRequestCredentials, payload: TVideoInfoPayload) {
    return this._callApi<TVideoInfoResponse>('GET', Endpoint.VideoInfo, payload, credentials)
  }

  public searchVideos(credentials: TRequestCredentials, payload: TVideoSearchPayload) {
    payload = Object.assign({ page_size: 100 }, payload)

    return this._callApi<TVideoSearchResponse>('GET', Endpoint.VideoSearch, payload, credentials)
  }

  /**
   * Обложки видео.
   *
   * @param credentials
   * @param payload
   */
  public getVideoThumbnail(credentials: TRequestCredentials, payload: TVideoCoverPayload) {
    return this._callApi<TVideoCoverResponse>('GET', Endpoint.VideoCover, payload, credentials)
  }

  public uploadTempFile(credentials: TRequestCredentials, payload: TTemporaryFileUploadPayload) {
    return this._callApi<TTemporaryFileUploadResponse>(
      'POST',
      Endpoint.TemporaryUpload,
      payload,
      credentials,
    )
  }

  /**
   * TODO Альтернативный 3х ступенчатый метод загрузки файлов в creative media library.
   * Сначала необходимо инициализировать загрузку этим методом, затем по чанкам передать файл, и в конце завершить
   * процедуру закрывающим запросом.
   *
   * Ограничения:
   *  1. Файлы хранятся 24 часа, за это время их нужно распихать по нужным РК.
   *  2. Максимальный объём файла - 100 МБ.
   *
   * @todo Typings
   * @param {TRequestCredentials} credentials
   * @param {Object} payload
   * @see uploadFileChunk
   * @see finishFileUpload
   * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1685515047661570}
   */
  public initFileUpload(credentials: TRequestCredentials, payload: object) {
    return this._callApi('POST', Endpoint.TemporaryUploadInit, payload, credentials)
  }

  /**
   * TODO Передача чанка файла на сервер creative media library.
   * Метод доступен после инициализации загрузки файла.
   *
   * @todo Typings
   * @param {TRequestCredentials} credentials
   * @param {Object} payload
   * @see initFileUpload
   */
  public uploadFileChunk(credentials: TRequestCredentials, payload: object) {
    return this._callApi('POST', Endpoint.TemporaryUploadChunk, payload, credentials)
  }

  /**
   * TODO Запрос, указывающий creative media library, что файл загружен и требует обработки.
   * Неоходимо вызвать после передачи всех чанков файла.
   *
   * @todo Typings
   * @param {TRequestCredentials} credentials
   * @param {Object} payload
   * @see initFileUpload
   * @see uploadFileChunk
   */
  public finishFileUpload(credentials: TRequestCredentials, payload: object) {
    return this._callApi('POST', Endpoint.TemporaryUploadFinish, payload, credentials)
  }
}
