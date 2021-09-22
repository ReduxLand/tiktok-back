import FormData from 'form-data'
import JSONBigint from 'json-bigint'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { initLogger } from '../../../util'
import { TRequestCredentials, TTikTokApiResponse } from './types'
import { TIKTOK_PRODUCTION_BASE_URL } from './constants'
import { TikTokApiCode, TikTokApiError } from './exceptions'
import { TikTokApiQueue } from '../api-queue'

const TIME_SECOND = 1000
const TIKTOK_BASE_URL = TIKTOK_PRODUCTION_BASE_URL
const log = initLogger('TikTok.API')
const debugLog = initLogger('TikTok.API.Debug')

/**
 * Абстрактный класс для формирования конкретных TikTok API-модулей.
 *
 * Rate Limits.
 * TikTok устанавливает ограничения на частоту запросов к их API, выделяя при этом 3 разных уровня: QPS, QPM и QPD.
 * Это Queries Per Second / Minute / Day соответственно. Лимиты относятся к 1 приложению, т.е. если есть два разных
 * приложения у одного разработчика, у них будут независимые лимиты. Также каждый интерфейс API независим друг от друга,
 * и у каждого свой собственный лимит. Для эффективного использования выделенного количества запросов, необходимо
 * предусмотреть механизм, который использует bulk-операции там, где они есть (например, в интерфейсе работы с объявлениями).
 *
 * Уровни лимитов: Basic / Advanced / Premium
 * QPS: 10 / 20 / 30
 * QPM: 600 / 1200 / 1800
 * QPD: 864000 / 1728000 / 2592000
 *
 * Дневной лимит сбрасывается на следующий день по UTC.
 *
 * Нужно обратить внимание, что в этом проекте группировка по нашим модулям != разделению по интерфейсам в самом TikTok.
 * Например, интерфейс oauth2 (TikTok) используется и в oauth (нашем), и в advertiser (тоже нашем). Т.е. пока что мы не
 * следуем делению методов по интерфейсам по-тиктоковски, мы их делим идейно для нашего удобства. В дальнейшем, конечно,
 * этот вопрос нужно будет решить. В первую очередь для нормального функционирования очередей задач, где у каждого
 * интерфейса TikTok API свой отдельный лимит и счётчик.
 *
 * @constructor
 */
export abstract class AbstractTikTokApi {
  private readonly _queue: TikTokApiQueue
  protected readonly _axios: AxiosInstance

  protected constructor() {
    this._queue = TikTokApiQueue.getInstance()
    this._axios = axios.create({
      baseURL: TIKTOK_BASE_URL,
      timeout: 10 * TIME_SECOND, // TODO мб увеличить до 30 сек?

      // Вручную обрабатываем non-200 ответы.
      validateStatus: () => true,

      // Обрабатываем большие числа идентификаторов, возвращаемых в ответах.
      transformResponse: (data) => {
        // Сразу переводим BigNumber в строку.
        return JSONBigint({ storeAsString: true }).parse(data)
      },
    })
  }

  /**
   * Общий метод формирования вызова TikTok API и обработки получаемых ответов.
   *
   * @param {'GET'|'POST'} method - HTTP-метод запроса
   * @param {string} endpoint - Конечная API-точка
   * @param {Object} payload - Полезная нагрузка
   * @param {TRequestCredentials} credentials - Учётные данные для выполнения запроса (токен и App ID)
   * @param {boolean} isFileUpload - Флаг, показывающий, есть ли загрузка файлов в пейлоаде
   * @throws Error
   * @throws TikTokApiError
   * @protected
   */
  protected _callApi<T extends object>(
    method: 'GET' | 'POST',
    endpoint: string,
    payload?: { [key: string]: any },
    credentials?: TRequestCredentials,
    isFileUpload?: boolean,
  ): Promise<TTikTokApiResponse<T>> {
    const options: AxiosRequestConfig = {
      method,
      headers: {},
      url: endpoint,
    }

    // Токена может не быть (например в OAuth)
    if (credentials?.accessToken) {
      options.headers['Access-Token'] = credentials.accessToken
    }

    // Если количество HTTP-методов увеличится, очевидно, это место нужно будет переделать
    if (payload && !isFileUpload) {
      options.data = payload // TODO сделать передачу пейлоада для GET-запросов. Выглядит как '?ad_ids=[123,321]&foo=bar'
    } else {
      // Файлы загружаем через multipart/form-data
      options.headers['Content-Type'] = 'multipart/form-data'
      const form = new FormData()

      // Проставляем только 1 уровень вложенности объекта полезной нагрузки
      if (payload) {
        for (const key in payload) {
          if (payload.hasOwnProperty(key)) {
            form.append(key, payload[key])
          }
        }
      }

      // Закидываем формдату в полезную нагрузку запроса
      options.data = form.getBuffer()
      options.headers = Object.assign(options.headers, form.getHeaders())
    }

    // Пушим все запросы в очередь
    return this._queue
      .push(
        credentials?.appId || payload?.appId || '',
        endpoint,
        this._axios.request<TTikTokApiResponse<T>>(options).then((res) => {
          const { data: response } = res
          const { code, message, data, request_id } = response

          // Пока собираем избыточные данные взаимодействия с TT API.
          debugLog.info('', {
            request: {
              method,
              endpoint,
              payload,
              credentials,
            },
            response,
          })

          // TODO более подробную обработку исключительных ситуаций
          if (code !== TikTokApiCode.Success) {
            throw new TikTokApiError(message, code)
          }

          // TODO возвращать только data, code и message нужны только в ошибках
          return { code, message, data, request_id } as TTikTokApiResponse<T>
        }),
      )
      .catch((error) => {
        log.error(error.message, Object.assign(error, { method, endpoint, payload, credentials }))
        throw error // После логирования пробрасываем дальше
      })
  }
}
