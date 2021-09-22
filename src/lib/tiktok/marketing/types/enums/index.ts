export * from './advertisers'
export * from './ads-management'
export * from './audience-management'
export * from './creative-management'
export * from './conversion-events'
export * from './pixel-events'

/**
 * Full enumerate list (+ left menu subcategories) https://ads.tiktok.com/marketing_api/docs?id=100641
 * TODO раскидать всё-таки это всё по своим модулям
 */

// ---=== Other
export enum ESplitTestVariable {
  Targeting = 'TARGETING',
  BiddingOptimization = 'BIDDING_OPTIMIZATION',
  Creative = 'CREATIVE',
}

export enum EVideoPlaybackDuration {
  TwoSeconds = 'TWO_SECONDS',
  SixSeconds = 'SIX_SECONDS',
}
