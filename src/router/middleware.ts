import jwt, { VerifyErrors } from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { UserMdl } from '../model'
import { initLogger } from '../util'
import { TJwtPayload } from './index'
import { respondClientError, respondServerError } from './util'

const log = initLogger('Auth')

/**
 * Middleware проверки авторизации.
 *
 * JWT юзаем вместо куков для того, чтобы авторизовывать юзера и на фронте и на беке, не будучи связанными
 * одним хостом для фронта и бека. Это в частном случае у нас один хост, а вообще они не должны быть связаны.
 * Поэтому JWT на беке, который храним в куках на фронте. (Чтобы preflight запросы авторизации можно было слать).
 * Именно куки, чтобы preflight, localStorage не подходит т.к. это JS уже после завершения первого запроса.
 * То же самое касается beforeCreate и serverMiddleware - они будут выполняться при каждом изменении роута, а нам бы
 * просто в первый заход на фронт узнать про авторизацию и не дёргать её больше, только если АПИ сам не отдаст, что чел
 * больше не авторизован. Плюс не хочу придумывать CSRF токены в формах и вообще во всех местах взаимодействия с бэком.
 * А поскольку у нас авторизация через заголовки, о CSRF можно не париться.
 *
 */
export async function checkAuth(
  request: Request,
  res: Response,
  next: NextFunction,
  isRestrict = false,
) {
  const auth = request.header('Authorization')
  const token = auth?.replace(/^Bearer\s/, '')

  if (token) {
    jwt.verify(
      token,
      process.env.SESSION_SECRET!,
      async (error: VerifyErrors, decoded: TJwtPayload) => {
        if (error) {
          return isRestrict ? respondClientError(res, new Error('Unauthorized.'), log, 401) : next()
        } else {
          if (
            decoded &&
            Object.prototype.hasOwnProperty.call(decoded, 'ssid') &&
            Object.prototype.hasOwnProperty.call(decoded, 'user')
          ) {
            const { ssid, user: _id } = decoded

            try {
              // TODO project + lean
              const user = await UserMdl.findOne({ _id, 'sessions.ssid': ssid })

              // Authorized
              if (user) {
                res.locals['ssid'] = ssid
                res.locals['user'] = user

                return next()
              }

              // Session Expired
              return isRestrict
                ? respondClientError(res, new Error('Unauthorized.'), log, 401)
                : next()
            } catch (error) {
              // Двойное логирование
              log.error('Ошибка получения пользователя из БД.', Object.assign(error, decoded))
              return respondServerError(res, error)
            }
          }
          return isRestrict ? respondClientError(res, new Error('Unauthorized.'), log, 401) : next()
        }
      },
    )
  } else {
    return isRestrict ? respondClientError(res, new Error('Unauthorized.'), log, 401) : next()
  }
}

// Middleware жёсткой проверки авторизации, выбрасывающий 401.
export function restrictedAccess(request: Request, res: Response, next: NextFunction) {
  return checkAuth(request, res, next, true)
}

// Middleware публичного доступа без проверки авторизации. Просто для лучшей читаемости кода.
export function publicAccess(request: Request, res: Response, next: NextFunction) {
  return next()
}
