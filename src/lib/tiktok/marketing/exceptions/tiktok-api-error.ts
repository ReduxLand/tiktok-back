/**
 * Кастомный эксепшн, который выбрасываем, если получили валидный ответ, но этот ответ содержит сообщение об ошибке.
 * Если, например, возникла ошибка Интернет-соединения - это уже другой случай, и отдаём стандартную ошибку Axios.
 *
 * @constructor
 * @todo Вытащить все коды ошибок в TikTokApiCode, и поставить этот тип для code
 * @param {string} message - Сообщение об ошибке
 * @param {number} code - Код ошибки
 *
 * Note: Публичные поля name и message указаны для соответствия сигнатуре Error. В конструкторе они задаются
 * иммутабельными свойствами актуального объекта Error, который и возвращается как TikTokApiError.
 */
export class TikTokApiError {
  private readonly _name: string
  private readonly _message: string
  private readonly _code: number

  get name() {
    return this._name
  }

  get message() {
    return this._message
  }

  get code() {
    return this._code
  }

  constructor(message: string, code: number) {
    const error = new Error(message)

    // Set immutable object properties
    Object.defineProperty(error, 'name', {
      get() {
        return 'TikTokApiError'
      },
    })
    Object.defineProperty(error, 'message', {
      get() {
        return message
      },
    })
    Object.defineProperty(error, 'code', {
      get() {
        return code
      },
    })

    this._name = 'TikTokApiError'
    this._message = message
    this._code = code

    // Capture where error occurred
    Error.captureStackTrace(error, TikTokApiError)

    // TypeScript workaround
    return error as unknown as TikTokApiError
  }
}
