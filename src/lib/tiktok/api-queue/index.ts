import PQueue from 'p-queue'
import { TTikTokApiResponse } from '../marketing/types'

const TIME_SECOND = 1000

/**
 * Синглтон для работы с очередями запросов к TikTok Marketing API.
 *
 * Для того, чтобы удовлятворять ограничениям на частоту отправки запросов к TT API, нам необходимо контролировать
 * RPS для каждого приложения, привязанного к нашей системе, и для каждого интерфейса в рамках этих приложений.
 *
 * Стандартные Rate Limits:
 * 10 per second
 * 600 per minute
 * 864000 per day
 *
 * Некоторые API-интерфейсы TT имеют другие лимиты, обычно намного меньше стандартных.
 * Уменьшенные лимиты были замечены только в интерфейсах с инструментами ТТ для умной обработки креативов.
 * Из документации ТТ на 100% непонятно, что является интерфейсом, но можно предположить, что вся та часть, которая
 * находится между версией АПИ и методом интерфейса. Т.е. например в /v1.2/campaign/get интерфейс - campaign, а в
 * /v1.1/creative/smart_video/create/ - creative/smart_video.
 *
 */
export class TikTokApiQueue {
  // Пул очередей API-вызовов для приложений и интерфейсов
  private _queuePool: {
    [appId: string]: {
      [apiInterface: string]: PQueue
    }
  } = {}

  // Инстанс синглтона
  private static _instance: TikTokApiQueue

  // Переопределение стандартных лимитов для отдельных интерфейсов
  private readonly _rpsOverrides: { [apiInterface: string]: number } = {
    //
  }

  private constructor() {
    // do nothing
  }

  public static getInstance() {
    if (!TikTokApiQueue._instance) {
      this._instance = new TikTokApiQueue()
    }

    return this._instance
  }

  /**
   * Метод добавления задачи в очередь.
   * Он разбирает таски по appId и интерфейсам, и кидает таску в соответствующую ей очередь
   *
   * @param appId
   * @param endpoint
   * @param task
   */
  public async push<T extends {}>(
    appId: string,
    endpoint: string,
    task: Promise<TTikTokApiResponse<T>>,
  ) {
    // Если ещё нет очередей для данного приложения - добавляем его в пул
    if (!this._queuePool[appId]) {
      this._queuePool[appId] = {}
    }

    const apiInterface = TikTokApiQueue._getInterfacePath(endpoint)

    // Если нет нужного интерфейса в пуле очередей приложения - добавляем его
    if (!this._queuePool[appId][apiInterface]) {
      switch (apiInterface) {
        // Если нет интерфейса - общая очередь без ограничений
        case '':
          this._queuePool[appId][apiInterface] = new PQueue()
          break

        // Для всех остальных очередей без оверрайдов - используем дефолтные ограничения очереди
        default:
          this._queuePool[appId][apiInterface] = new PQueue({
            concurrency: 10, // Ставим такое же значение, как и intervalCap
            intervalCap: 10, // Максимум 10 запросов к интерфейсу в секунду
            interval: TIME_SECOND, // Именно в эту секунду
          })
          break
      }
    }

    return await this._queuePool[appId][apiInterface].add<typeof task>(() => task)
  }

  /**
   * Метод получает TT API-интерфейс из эндпоинта вида /v1.2/interface/method.
   * Если на выходе получаем пустую строку - значит переданный эндпоинт был невалидным, и такие запросы записываем
   * в общий пул без лимитов.
   *
   * @param {string} endpoint
   * @private
   */
  private static _getInterfacePath(endpoint: string) {
    let apiInterface = endpoint
    if (apiInterface[0] === '/') {
      apiInterface = apiInterface.slice(1)
    }

    if (apiInterface[apiInterface.length - 1] === '/') {
      apiInterface = apiInterface.slice(0, -1)
    }

    apiInterface = apiInterface.slice(apiInterface.indexOf('/') + 1, apiInterface.lastIndexOf('/'))

    return apiInterface
  }
}
