import { EPixelEvent, TPageInfo } from '../../types'

export type TPixelCreatePayload = {
  advertiser_id: string

  /**
   * Pixel tracking event type (https://ads.tiktok.com/marketing_api/docs?id=100640).
   */
  pixel_category: string

  /**
   * Pixel name. Max 40 chars.
   */
  pixel_name: string
}

export type TPixelCreateResponse = {
  // Внутренний ID пикселя
  pixel_id: string

  // Наименование пикселя
  pixel_name: string

  // ID, который показывается в Event Manager
  pixel_code: string
}

export type TPixelListPayload = {
  advertiser_id: string

  /**
   * Pixel Code . If specified, the returned information will be filtered by Pixel Code.
   */
  code?: string

  /**
   * Pixel ID. If specified, the returned information will be filtered by Pixel ID.
   */
  pixel_id?: string

  /**
   * If specified, the returned information will be filtered by pixel whose name contains the passed in data.
   */
  name?: string

  /**
   * Sorting method: EARLIEST_CREATE (Prioritizes the earliest created pixel), LATEST_CREATE (default).
   */
  order_by?: 'EARLIEST_CREATE' | 'LATEST_CREATE'

  /**
   * Current page number.
   * Default value is 1, value range: ≥ 1
   */
  page?: number

  /**
   * Page size.
   * Default value is 10, value range: 1-20
   */
  page_size?: number
}

export type TPixelListResponse = {
  pixels: {
    pixel_id: string
    pixel_name: string
    pixel_code: string

    /**
     * JS-код для интеграции на целевую страницу.
     */
    pixel_script: string

    /**
     * Timestamp of creation.
     */
    create_time: number

    /**
     * Pixel events.
     */
    events: {
      /**
       * Event conversion value (if not specified when the event was created, it returns " ").
       */
      currency_value: string

      /**
       * Event corresponding currency, optional values include: 'INR' (Indian Rupee), 'JPY' (JPY), 'USD' (USD).
       */
      currency: 'INR' | 'JPY' | 'USD'

      /**
       * Event name.
       */
      name: string

      /**
       * Event type.
       */
      event_type: EPixelEvent

      /**
       * Event conversation types.
       */
      external_action: string

      /**
       * Event code.
       */
      event_code: string

      /**
       * Event ID.
       */
      event_id: string

      /**
       * Statistics type, optional values include: EVERY_TIME (every time), ONCE (only once).
       */
      statistic_type: 'EVERY_TIME' | 'ONCE'

      /**
       * Tracking event rules, sub-field rules and descriptions
       */
      rules: {
        /**
         * Operator, optional values include: [OPERATORTYPE_]CONTAINS / DOES_NOT_EQUAL / EQUALS.
         */
        operator: 'OPERATORTYPE_CONTAINS' | 'OPERATORTYPE_DOES_NOT_EQUAL' | 'OPERATORTYPE_EQUALS'

        /**
         * Event trigger type, optional values include: TRIGGERTYPE_CLICK, TRIGGERTYPE_PAGEVIEW.
         */
        trigger: 'TRIGGERTYPE_CLICK' | 'TRIGGERTYPE_PAGEVIEW'

        /**
         * Variable value.
         */
        value: string

        /**
         * Variable type, optional values include: ELEMENT, PAGE_HOSTNAME, PAGE_PATH, PAGE_URL
         */
        variable: 'ELEMENT' | 'PAGE_HOSTNAME' | 'PAGE_PATH' | 'PAGE_URL'
      }[]
    }[]
  }[]
  page_info: TPageInfo
}
