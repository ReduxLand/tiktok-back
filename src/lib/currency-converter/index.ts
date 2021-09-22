import axios, { AxiosInstance } from 'axios'
import { initLogger } from '../../util'
import { ECurrency, TCurrencyList, TCurrencyResponse } from './types'

const TIME_MINUTE = 60 * 1000
const BASE_URL = 'https://www.cbr-xml-daily.ru'
const log = initLogger('CurrencyConverter')

/**
 * Синглтон-класс для работы с курсами валют.
 * TODO в ответе возвращается время следующего обновления, по нему можно сделать
 */
export class CurrencyConverter {
  private _currency: TCurrencyList
  private readonly _axios: AxiosInstance
  private static _instance: CurrencyConverter

  // Подгружаем каждые 30 минут текущие курсы валют
  private constructor() {
    this._axios = axios.create({
      baseURL: BASE_URL,
    })

    this.update()
    setInterval(() => this.update(), 30 * TIME_MINUTE)
  }

  public static getInstance() {
    if (!CurrencyConverter._instance) {
      CurrencyConverter._instance = new CurrencyConverter()
    }

    return CurrencyConverter._instance
  }

  // Обновление текущего состояния (подгрузка актуальных курсов валют)
  update() {
    return this._axios.get<TCurrencyResponse>('/daily_json.js').then((response) => {
      if (!response || response.status !== 200 || !response.data || !response.data.Valute) {
        return log.error('Ошибка получения курса валют', { response: response.data })
      }

      this._currency = response.data.Valute
    })
  }

  // Конвертация из рублей в нужный курс (по-умолчанию в USD)
  convert(amount: number, currency: ECurrency = ECurrency.USD) {
    if (amount <= 0) {
      return 0
    } else if (!this._currency) {
      return null // TODO нормально обрабатывать эту ситуацию, хотя она, скорее всего, невозможна
    }

    const { Value, Nominal } = this._currency[currency]

    return Number.parseFloat((amount / (Value / Nominal)).toFixed(2))
  }
}
