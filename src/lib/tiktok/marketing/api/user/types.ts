import { EAdvertiserStatus } from '../../types/enums'
import { ECurrency } from '../../../../currency-converter/types'

export type TUserInfoResponse = {
  // Идентификатор аккаунта в ТикТок
  id: number

  // Мыло под маской, например j***e@example.org
  email: string

  // Timestamp регистрации аккаунта
  create_time: number

  // Отображаемое имя, например Jane Doe
  display_name: string
}

export type TAdvertisersInfo = {
  id: string
  name: string
  status: EAdvertiserStatus
  currency: ECurrency
  // TODO
}[]
