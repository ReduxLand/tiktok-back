export enum ECurrency {
  RUB = 'RUB',
  AUD = 'AUD',
  AZN = 'AZN',
  GBP = 'GBP',
  AMD = 'AMD',
  BYN = 'BYN',
  BGN = 'BGN',
  BRL = 'BRL',
  HUF = 'HUF',
  HKD = 'HKD',
  DKK = 'DKK',
  USD = 'USD',
  EUR = 'EUR',
  INR = 'INR',
  KZT = 'KZT',
  CAD = 'CAD',
  KGS = 'KGS',
  CNY = 'CNY',
  MDL = 'MDL',
  NOK = 'NOK',
  PLN = 'PLN',
  RON = 'RON',
  XDR = 'XDR',
  SGD = 'SGD',
  TJS = 'TJS',
  TRY = 'TRY',
  TMT = 'TMT',
  UZS = 'UZS',
  UAH = 'UAH',
  CZK = 'CZK',
  SEK = 'SEK',
  CHF = 'CHF',
  ZAR = 'ZAR',
  KRW = 'KRW',
  JPY = 'JPY',
}

export type TCurrencyList = {
  [currency in ECurrency]: {
    // R01235
    ID: string

    // 840
    NumCode: string

    // USD
    CharCode: string

    // 1
    Nominal: number

    // Доллар США
    Name: string

    // 72.1777
    Value: number

    // 72.1694
    Previous: number
  }
}

export type TCurrencyResponse = {
  // 2021-06-29T11:30:00+03:00
  Date: string

  // 2021-06-26T11:30:00+03:00
  PreviousDate: string

  // \/\/www.cbr-xml-daily.ru\/archive\/2021\/06\/26\/daily_json.js
  PreviousURL: string

  // 2021-06-28T17:00:00+03:00
  Timestamp: string

  Valute: TCurrencyList
}
