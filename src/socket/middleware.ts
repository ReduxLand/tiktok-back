import { Socket } from 'socket.io'
import { NextFunction } from 'express'
import jwt, { VerifyErrors } from 'jsonwebtoken'
import { IUser, UserMdl } from '../model'
import { TJwtPayload } from '../router'
import { initLogger } from '../util'

// Расширяем объект сокета инстансом пользователя, которого туда кладём после авторизации
declare module 'socket.io' {
  interface Socket {
    user: IUser
  }
}

const log = initLogger('Socket.Auth')

// TODO можно как-то враппером завернуть для express, но у нас токены по-разному передаются, подумать.
export async function checkAuth(socket: Socket, next: NextFunction, isRestrict = false) {
  const token = socket.handshake.auth?.token

  if (token) {
    jwt.verify(
      token,
      process.env.SESSION_SECRET!,
      async (error: VerifyErrors, decoded: TJwtPayload) => {
        if (error) {
          return isRestrict ? socket.disconnect() : next()
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
                socket.user = user
                return next()
              }

              // Session Expired
              return isRestrict ? next(new Error('Unauthorized.')) : next()
            } catch (error) {
              // Двойное логирование
              log.error('Ошибка получения пользователя из БД.', Object.assign(error, decoded))
              return socket.disconnect()
              // return next(new Error("Internal Server Error."))
            }
          }
          return isRestrict ? socket.disconnect() : next()
        }
      },
    )
  } else {
    return isRestrict ? socket.disconnect() : next()
  }
}

// Middleware жёсткой проверки авторизации, выбрасывающий 401.
export function restrictedAccess(socket: Socket, next: NextFunction) {
  return checkAuth(socket, next, true)
}

// Middleware публичного доступа без проверки авторизации. Просто для лучшей читаемости кода.
export function publicAccess(socket: Socket, next: NextFunction) {
  return next()
}
