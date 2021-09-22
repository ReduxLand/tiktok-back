import { Logger } from 'winston'
import { Response } from 'express'

// Примечание: такая структура функций позволяет логировать ошибки в те роуты, в которых они произошли. Если мы не
//  хотим логировать какие-то отдельные ошибки - мы просто не передаём объект логгера в функцию.

// Функция возврата полезной нагрузки ответа в случае успеха
export function respondPayload(
  response: Response,
  success = true,
  data: unknown = {},
  status = 200,
) {
  const payload = {
    success,
    data,
  }

  return response.status(status).json(payload)
}

// Функция возврата клиентской ошибки (с описанием подробностей)
export function respondClientError(response: Response, error: Error, log?: Logger, status = 400) {
  if (log) {
    log.error('Клиентская ошибка.', error)
  }

  return response.status(status).json({
    success: false,
    error: error.message,
  })
}

// Функция возврата серверной ошибки (без описания подробностей, с фиксированным сообщением)
export function respondServerError(response: Response, error: Error, log?: Logger, status = 500) {
  if (log) {
    log.error('Серверная ошибка.', error)
  }

  return response.status(status).json({
    success: false,
    error:
      'Возникла непредвиденная ошибка сервера. Попробуйте повторить попытку позже или обратитесь в службу поддержки.',
  })
}
