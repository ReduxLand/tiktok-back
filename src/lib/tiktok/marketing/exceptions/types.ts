export const enum TikTokApiCode {
  // OK
  Success = 0,

  // OAuth код авторизации для получения долговременного Access Token невалидный (либо истёк TTL 10 минут)
  InvalidAuthCode = 40110,

  // Превышен допустимый уровень QPS, QPM или QPD (queries per second/minute/day) к отдельному интерфейсу или в целом к API
  RateLimitExceeded = 40100,

  // Сочетание App ID + App Secret недействительно
  IllegalAccessPartner = 40101,
}

export const enum TikTokApiErrorMessage {
  InvalidInit = 'Invalid App ID or secret',
}
