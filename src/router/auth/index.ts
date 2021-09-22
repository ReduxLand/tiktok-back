import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { Router, Request, Response } from 'express'
import { initLogger } from '../../util'
import { UserMdl, Roles } from '../../model'
import { respondPayload, respondClientError, respondServerError } from '../util'

// TODO forgot password. При смене пароля нам нужно сначала запросить объект юзера из базы
//  (т.к. если апдейтить напрямую в БД, не вызовется хук preSave), а потом уже .save()
export const AuthRouter = Router()
const log = initLogger('Router.Auth')

// Регистрация пользователя
AuthRouter.post('/register', (request, res) => {
  const { ssid, user } = res.locals
  const { username, password } = request.body

  if (ssid && user) {
    return respondClientError(res, new Error('Вы уже авторизованы в системе.'), log)
  }
  if (!username || username.length === 0 || username.length < 5) {
    return respondClientError(
      res,
      new Error('Имя пользователя должно быть не менее 5 символов длиной.'),
    )
  }
  if (!password || password.length === 0 || password.length < 8) {
    return respondClientError(res, new Error('Пароль должен быть не менее 8 символов длиной.'))
  }

  // Добавляем сразу сессию пользователю
  UserMdl.create({
    email: `user${Date.now()}@tikpog.com`, // Пока мыльники не нужны
    username,
    password,
    displayName: username,
    roles: [Roles.User],
    description: '',
  })
    .then((user) => {
      const session = {
        ssid: uuid(),
        user: user._id,
      }

      // Сразу авторизуем регистранта
      jwt.sign(session, process.env.SESSION_SECRET!, (error, token) => {
        if (error) {
          log.error(
            'Регистрация прошла успешно, но токен доступа не был сгенерирован.',
            Object.assign(error, session),
          )
          return respondServerError(res, error, log)
        }
        return UserMdl.updateOne(
          {
            username: user.username,
          },
          {
            $push: {
              sessions: {
                ssid: session.ssid,
                userAgent: request.header('User-Agent'),
                ip: request.header('X-Client-IP') || request.ip || request.connection.remoteAddress,
              },
            },
          },
        )
          .then(() => {
            return respondPayload(res, true, { token })
          })
          .catch((error) => {
            // Двойное логирование
            log.error('Ошибка записи сессии в БД.', error)
            return respondServerError(res, error, log)
          })
      })
    })
    .catch((error) => {
      if (error.code === 11_000 && error.keyPattern) {
        if (error.keyPattern.email) {
          return respondClientError(res, new Error('Пользователь с таким email уже существует.'))
        } else if (error.keyPattern.username) {
          return respondClientError(res, new Error('Пользователь с таким username уже существует.'))
        }
      }
      log.error('Ошибка записи нового пользователя в БД.', error)
      return respondServerError(res, error, log)
    })
})

// Авторизация пользователя
AuthRouter.post('/login', (request, res) => {
  const { user } = res.locals
  const { username, password } = request.body

  // Если уже есть сессия - ничего не делаем
  if (user) {
    return respondPayload(res, true)
  }

  // TODO вынести проверки условий в статик-методы модели пользователя
  if (!username || username?.length < 5 || !password || password?.length < 8) {
    return respondPayload(res, false)
  }

  UserMdl.findOne({ username })
    .then((user) => {
      if (user && user.validatePassword(password)) {
        const session = {
          ssid: uuid(),
          user: user._id,
        }
        jwt.sign(session, process.env.SESSION_SECRET!, (error, token) => {
          if (error) {
            log.error('Ошибка генерации токена доступа.', Object.assign(error, session))
            return respondServerError(res, error, log)
          }
          return UserMdl.updateOne(
            {
              username: user.username,
            },
            {
              $push: {
                sessions: {
                  ssid: session.ssid,
                  country: request.header('X-Client-Country'),
                  userAgent: request.header('User-Agent'),
                  ip:
                    request.header('X-Client-IP') || request.ip || request.connection.remoteAddress,
                },
              },
            },
          )
            .then(() => {
              return respondPayload(res, true, { token })
            })
            .catch((error) => {
              log.error('Ошибка записи сессии в БД.', error)
              return respondServerError(res, error, log)
            })
        })
      } else {
        return respondClientError(
          res,
          new Error('Неверное имя пользователя или пароль.'),
          null,
          401,
        )
      }
    })
    .catch((error) => {
      // Двойное логирование
      log.error('Ошибка получения пользователя из БД.', error)
      return respondServerError(res, error, log)
    })
})

// Разлогин пользователя
AuthRouter.post('/logout', (request, res) => {
  const { ssid, user } = res.locals

  if (ssid && user) {
    return UserMdl.updateOne(
      {
        'username': user.username,
        'sessions.ssid': ssid,
      },
      {
        $pull: {
          sessions: {
            ssid: ssid,
          },
        },
      },
    )
      .then(() => {
        return respondPayload(res, true)
      })
      .catch((error) => {
        log.error('Ошибка удаления сессии из БД.', error)
        return respondServerError(res, error, log)
      })
  }

  return respondPayload(res, true)
})
