export type TOAuthResponse = {
  // Коды разрешений, которые даны приложению
  scope: number[]

  // Токен доступа аккаунта в скоупе приложения
  access_token: string

  // Идентификаторы рекламных аккаунтов, к которым у приложения есть доступ
  advertiser_ids: string[]
}

export type TAdvertisersListResponse = {
  list: {
    advertiser_id: string
    advertiser_name: string
  }[]
}
