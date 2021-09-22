import { ECreativeType, TPageInfo } from '../../types'
import {
  EAdContentType,
  EAdReviewStatus,
  EAdvertisingObjective,
  EAdvertisingStatus,
  EAudienceAgeRange,
  EAudienceOS,
  EBillingEvent,
  ECallToAction,
  ECreativeMaterialTag,
  EOperationStatus,
  EPlacement,
} from '../../types/enums'

enum EAdFields {
  AdGroupId = 'adgroup_id',
  AdGroupName = 'adgroup_name',
  AdvertiserId = 'advertiser_id',
  CallToAction = 'call_to_action',
  CampaignId = 'campaign_id',
  CampaignName = 'campaign_name',
  CreateTime = 'create_time',
  AdName = 'ad_name',
  Status = 'status',
  OptStatus = 'opt_status',
  AdId = 'ad_id',
  ImageIds = 'image_ids',
  ImageMode = 'image_mode',
  ModifyTime = 'modify_time',
  AdText = 'ad_text',
  VideoId = 'video_id',
  AppName = 'app_name',
  OpenUrl = 'open_url',
  LandingPageUrl = 'landing_page_url',
  DisplayName = 'display_name',
  ProfileName = 'profile_image',
  ImpressionTrackingUrl = 'impression_tracking_url',
  ClickTrackingUrl = 'click_tracking_url',
  PlayableUrl = 'playable_url',
  IsCreativeAuthorized = 'is_creative_authorized',
  IsNewStructure = 'is_new_structure',
}

export type TAdListPayload = {
  advertiser_id: string
  fields?: EAdFields[]
  page?: number
  page_size?: number
  filtering?: {
    /**
     * A list of Campaign IDs, quantity: 1-100.
     */
    campaign_ids?: string[]

    /**
     * A list of Ad group ID, quantity: 1-100.
     */
    adgroup_ids?: string[]

    /**
     * A list of Ad ID，quantity: 1-100.
     */
    ad_ids?: string[]

    /**
     * Ad text, searches for exact match.
     */
    ad_text?: string

    image_mode?: ECreativeMaterialTag
    objective_type?: EAdvertisingObjective
    billing_events?: EBillingEvent[]

    /**
     * Default: STATUS_NOT_DELETE.
     */
    primary_status?: EAdvertisingStatus

    /**
     * Filter by create time.
     * Use this field to specify the earliest create time of ad.
     * Format: "2020-10-12 00:00:00"
     */
    create_start_time?: string

    /**
     * Filter by create time.
     * Use this field to specify the earliest create time of ad.
     * Format: "2020-10-12 00:00:00"
     */
    create_end_time?: string

    /**
     * Secondary status.
     * @deprecated
     */
    status?: string
  }
}

export type TAdListResponse = {
  /**
   * A List of Ads. The returned fields are generated based on the fields specified in the request parameters.
   * If not specified, all fields are returned by default.
   */
  list: {
    advertiser_id?: string
    campaign_id?: string
    campaign_name?: string
    adgroup_id?: string
    adgroup_name?: string
    ad_id?: string
    ad_name?: string
    call_to_action?: ECallToAction
    status?: string
    opt_status?: EOperationStatus

    /**
     * Whether the ad is an automated ad. Set to true for automated ad and false for non-automated ad.
     */
    is_aco?: boolean

    image_ids?: string[]

    /**
     * Material type.
     * @deprecated
     */
    image_mode?: ECreativeMaterialTag

    ad_text?: string
    video_id?: string
    app_name?: string

    /**
     * Application direct link.
     */
    open_url?: string

    /**
     * Landing page URL.
     */
    landing_page_url?: string

    /**
     * Landing page display name.
     */
    display_name?: string

    /**
     * Avatar URL.
     */
    profile_image?: string

    /**
     * Display monitoring URL.
     */
    impression_tracking_url?: string

    /**
     * Click monitoring URL. Currently Pangle does not support DCM, Sizmek or Flashtalking.
     */
    click_tracking_url?: string

    /**
     * Playable material url.
     */
    playable_url?: string

    /**
     * Whether you grant displaying some of your ads in our TikTok For Business Creative Center.
     * Only valid for non-US advertisers, the default value is false.
     */
    is_creative_authorized?: boolean

    /**
     * Whether the campaign is a new structure.
     * For the same campaign, the structure of campaign, adgroups and ads are the same.
     */
    is_new_structure?: boolean

    /**
     * Time at which the ad was created.
     */
    create_time?: string

    /**
     * Time at which the ad was Modified.
     */
    modify_time?: string
  }[]
  page_info: TPageInfo
}

export type TAdCreatePayload = {
  advertiser_id: string
  adgroup_id: string
  creatives: {
    call_to_action?: ECallToAction

    /**
     * Ad Name.
     * Character limit is 512 and cannot contain emoji.
     * NOTE: Each word in Chinese or Japanese counts as two characters, while each letter in English counts as one character.
     */
    ad_name: string

    /**
     * The display name of landing page or pure exposure ad, length limit: 1-40 characters.
     * Required when the promotion type is landing page or pure exposure.
     */
    display_name?: string

    /**
     * Ad text. It is included and shown to your audience as part of your ad creative, delivering the message
     * you wish to advertise to them.
     *
     * Замечания и требования к тексту объявления:
     *  1. Может содержать 12-100 символов (азиатские символы считаются за 2).
     *  2. Недопустимы символы { }, #, и эмодзи. Знаки пунктуации и пробелы считаются символами.
     *  3. Текст, отображаемый пользователю, может варьироваться в зависимости от модели устройства и ОС, длинный текст
     *  может быть обрезан.
     *
     * NOTE: Avoid using extremely descriptive words like "best", "most", "first", and others.
     */
    ad_text: string

    /**
     * The creative type.
     * Enum values: SINGLE_IMAGE, SINGLE_VIDEO, CAROUSEL.
     */
    ad_format: ECreativeType

    /**
     * A list of image ID (Image material or video cover), can be obtained from [see{1}].
     * Video cover is required for certain types of video materials.
     * Required when the corresponding campaign objective_type is not CATALOG_SALES.
     *
     * @see [Documentation]{@link https://ads.tiktok.com/marketing_api/docs?id=100560}
     * @see [Documentation]{@link https://ads.tiktok.com/marketing_api/docs?id=100641}
     */
    image_ids?: string[]

    /**
     * Video ID.
     * Required when the material type is video.
     */
    video_id?: string

    /**
     * ID of the avatar image. It can be uploaded through the Upload an image endpoint (picture ratio requirement is 1:1)
     */
    avatar_icon_web_uri?: string

    /**
     * Landing page URL.
     */
    landing_page_url?: string

    /**
     * Display monitoring URL.
     */
    impression_tracking_url?: string

    /**
     * Click monitoring URL. Currently Pangle does not support DCM, Sizmek or Flashtalking.
     */
    click_tracking_url?: string

    /**
     * The specific location where you want your audience to go if they have your app installed.
     *
     * @see open_url_type
     */
    open_url?: string

    /**
     * The open URL type. Allowed values differs based on campaign objectives.
     * Allowed values:
     *  NORMAL(supported in Traffic, Conversion & CatalogSales),
     *  DEFERRED_DEEPLINK(supported in AppInstall & CatalogSales).
     *
     * The default value is NORMAL.
     * For an ad that will be included in an iOS 14 campaign, this field cannot be set to DEFERRED_DEEPLINK.
     */
    open_url_type?: string

    /**
     * Fallback Type. If the audience do not have the app installed, you can have them fall back to install the app, or
     * to view a specific web page. Not applicable for Deferred Deeplink. Allowed values: APP_INSTALL, WEBSITE, UNSET.
     * If website is chosen, you need to specify the url via landing_page_url field.
     */
    fallback_type?: string

    /**
     * Playable material url, only valid if pangle is the only placement.
     * NOTE: All ads in the same adgroup share the same playble material.
     */
    playable_url?: string

    /**
     * Whether you grant displaying some of your ads in our TikTok For Business Creative Center.
     * Only valid for non-US advertisers.
     * Default value is False.
     */
    is_creative_authorized?: boolean

    /**
     * Material type.
     * @deprecated
     */
    image_mode?: string

    /**
     * Ad group ID of a Split Test. Used to create two different Ads under two Ad Groups of a Split Test separately.
     * Required when is_split_test = True and the correspond split_test_variable is CREATIVE.
     */
    adgroup_id?: string

    /**
     * The ID of the CTA portfolio that you want to use in your ads. A CTA portfolio is a group of auto-optimized CTAs.
     * If both this field and call_to_id are specified, call_to_id will be ignored. For details about auto-optimized
     * CTAs, see CTA Recommendations - Auto-Optimized CTAs.
     *
     * @see [Documentation]{@link https://ads.tiktok.com/marketing_api/docs?id=1690027315505154}
     */
    call_to_action_id?: string

    /**
     * Image card ID or gift code card ID. To learn about how to get an image card ID or gift card ID, please see the doc.
     *
     * @see [Documentation]{@link https://ads.tiktok.com/marketing_api/docs?id=1699624477583361}
     */
    card_id?: number

    /**
     * A list of ad texts. The list of ad_texts are mapped to the list of image_ids in a one-to-one manner.
     * The two lists must have the same number of entries. If you don't know how to create effective ad texts, you can
     * use the Smart Text feature, which generates ad text recommendations based on the industry and language.
     * This field is required when image_mode is MULTI_SQUARE_PICTURES or MULTI_RECTANGLE_PICTURES.
     * An ad text must be 12-40 characters long and cannot contain emoji.
     * Each word in Chinese or Japanese counts as two characters, while each letter in English counts as one character.
     */
    ad_texts?: string[]

    /**
     * The ID of the TikTok post to be used as an ad. It can be obtained from [Creatives -> Creative Asset > Native Ads].
     * This field is required when TikTok posts are used as ads.
     */
    tiktok_item_id?: string

    /**
     * The display name of app download ad, the default is the app store name, length limit: 1-40 characters
     */
    app_name?: string

    /**
     * Multiple landing page URLs, landing_page_urls and image_ids correspond one-to-one, the length of the two arrays
     * must be the same. Required when image_mode is MULTI_SQUARE_PICTURES or MULTI_RECTANGLE_PICTURES and external_type
     * of the correspond adgroup is WEBSITE
     */
    landing_page_urls?: string[]

    /**
     * Instant Page (InstantForm or Storefront Page) ID, which can be created by [Instant Page Editor SDK].
     * InstantForm is only applicable if the campaign objective is LEAD_GENERATION, and Storefront page is only
     * applicable if the campaign objective is TRAFFIC or CONVERSION. Only applicable for TikTok placement.
     * (Before creating for the first time, you need to sign the LeadAds or InstantPage agreement through
     * [Agreement Management-Signing an Agreement]).
     *
     * @see [Instant Page Editor SDK]{@link https://ads.tiktok.com/marketing_api/docs?id=1681219055659009}
     * @see [Agreement Management-Signing an Agreement]{@link https://ads.tiktok.com/marketing_api/docs?id=100636}
     */
    page_id?: number

    /**
     * Wether to enable moat, default is false.
     */
    vast_moat?: boolean

    /**
     * In the DPA redirection scenario, the fallback behavior of deeplink evokes failed. When specified as CUSTOM,
     * fallback_url written to the landing_page_url.
     * Optional values: DEFAULT(Application Installation),CUSTOM(Custom Landing Page),DPA(Catalog Product Link).
     * Required when the corresponding campaign objective_type is CATALOG_SALES.
     * See DPA Ad Guide for details.
     *
     * @see [DPA Ad Guide for details]{@link https://ads.tiktok.com/marketing_api/docs?id=1688302449093634}
     */
    dpa_fallback_type?: 'DEFAULT' | 'CUSTOM' | 'DPA'

    /**
     * Indicates the source of the direct link used in the advertisement.
     * When specified as CUSTOM, the direct link is written in the open_url field.
     * Allowed values: NONE(not enabled),CUSTOM(custom direct link),DPA(commodity direct link).
     * The default value is NONE.
     * See DPA Ad Guide for details.
     *
     * @see [DPA Ad Guide for details]{@link https://ads.tiktok.com/marketing_api/docs?id=1688302449093634}
     */
    dpa_open_url_type?: 'NONE' | 'CUSTOM' | 'DPA'

    /**
     * In DPA scenario, catalog video template ID.
     * See DPA Ad Guide for details.
     *
     * @see [DPA Ad Guide for details]{@link https://ads.tiktok.com/marketing_api/docs?id=1688302449093634}
     */
    dpa_video_tpl_id?: string

    /**
     * Whether to disable the promotional use of the music in the TikTok video. The default value is true.
     * If you want to allow dueting and stitching for the TikTok video, you need to set this field to false.
     */
    promotional_music_disabled?: boolean

    /**
     * Whether to enable dueting for the TikTok video.
     * This field is valid only when promotional_music_disabled is set to false.
     */
    item_duet_status?: 'ENABLE' | 'DISABLE'

    /**
     * Whether to enable stitching for the TikTok video.
     * This field is valid only when promotional_music_disabled is set to false.
     */
    item_stitch_status?: 'ENABLE' | 'DISABLE'
  }[]
}

export type TAdCreateResponse = {
  /**
   * A list of Ad ID.
   */
  ad_ids: string[]

  /**
   * Whether to set status to pending.
   */
  need_audit: boolean
}

export type TAdReviewInfoPayload = {
  advertiser_id: string

  /**
   * The list of ad IDs.
   * Quantity: 1-100.
   */
  ad_ids: string[]
}

export type TAdReviewInfoResponse = {
  /**
   * The bi-dimensional structure for the review data on the ad level.
   * The key for the first dimension is adgroup_id.
   * The key for the second dimension is ad_id.
   * ??? в примере по-другому структура описана, adgroup_id там вообще не фигурирует.
   *
   * @see [API Doc]{@link https://ads.tiktok.com/marketing_api/docs?rid=q8om9ypqcu9&id=1693202518080514}
   */
  ad_review_map: {
    [ad_id: string]: {
      /**
       * The ad ID.
       */
      id: number

      /**
       * Whether the ad has been approved or not.
       */
      is_pass: boolean

      /**
       * The ad review status.
       */
      review_status: EAdReviewStatus

      /**
       * The placements that failed the review.
       */
      forbidden_placements?: EPlacement[]

      /**
       * The audience age ranges that failed the review.
       */
      forbidden_ages?: EAudienceAgeRange[]

      /**
       * The targeted regions that failed the review.
       * @see [Enum]{@link https://ads.tiktok.com/marketing_api/docs?id=100661}
       */
      forbidden_locations?: string[]

      /**
       * The audience operating systems that failed the review.
       */
      forbidden_operation_systems?: EAudienceOS[]

      /**
       * The last time when the ad group was reviewed (UTC+0), in the format of YYYY-MM-DD HH:MM:SS.
       * An example: "2017-01-01 00:00:00".
       */
      last_audit_time?: string

      /**
       * Details about the rejection.
       */
      reject_info?: {
        /**
         * The review suggestion.
         */
        suggestion: string

        /**
         * The list of rejection reasons.
         */
        reasons: string[]

        /**
         * The targeted regions of current reject reason.
         */
        forbidden_locations?: string[]

        /**
         * The content of the ad that has been reviewed.
         */
        content_info: {
          image_content?: {
            image_id: string
          }
          video_content?: {
            video_id: string
          }
          text_content?: string
          content_type: EAdContentType
        }
      }
    }
  }
}
