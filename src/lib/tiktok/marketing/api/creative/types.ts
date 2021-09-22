import { ReadStream } from 'fs'
import { TPageInfo, TUserDevice } from '../../types'
import { ECreativeMaterialType, ECreativeUploadType, EPlacement } from '../../types/enums'

export type TCreativeAuditPayload = {
  advertiser_id: string

  /**
   * The landing page display name or App name.
   * A maximum of 5 can be passed at a time.
   */
  display_names?: string[]

  /**
   * Image ID list (picture material or video cover).
   * A maximum of 5 can be passed at a time.
   */
  image_ids?: string[]

  /**
   * The video ID.
   * A maximum of 5 can be passed at a time.
   */
  video_ids?: string[]
}

export type TCreativeAuditResponse = {
  display_names?: {
    content: string
    reason: string
  }[]
  image_ids?: {
    content: string
    reason: string
  }[]
  video_ids?: {
    content: string
    reason: string
  }[]
}

export type TMusicCopyrightCheckPayload = {
  advertiser_id: string
  video_ids: string[]
  locations: string[] // List of areas. Areas intended to be put in. // TODO provide enum
}

export type TMusicCopyrightCheckResponse = {
  list: {
    video_id: string

    /**
     * List of sensitive music hits.
     */
    musics: {
      music_name: string
      singer_name: string
      copyright_owners: string[]
    }[]
  }[]
}

export type TImageUploadPayload = {
  advertiser_id: string

  /**
   * Image name. Length limit：1-100 characters. The default value is
   * the file name. If there was another image in the same name under this advertiser_id, there will be a timestamp
   * added to the end of the name. If the final filename has more than 100 chars, it will be cut off.
   */
  file_name?: string

  /**
   * Upload method.
   * Default: UPLOAD_BY_FILE (multipart/form-data).
   */
  upload_type?: ECreativeUploadType

  /**
   * Picture file, required when upload_type is UPLOAD_BY_FILE.
   * Recommended settings:
   * (1) File size：500 KB;
   * (2) Length/width： 1200*628px, 375*604 px, 640*640px;
   * (3) format：.jpg /.png;
   */
  image_file?: Buffer | ReadStream

  /**
   * Md5 of the image (used for server verification).
   * Required when upload_type is UPLOAD_BY_FILE.
   */
  image_signature?: string

  /**
   * Image URL address.
   * Required for UPLOAD_BY_URL
   */
  image_url?: string

  /**
   * The file_id of the image that you want to upload. This field is for files that are uploaded to the file repository.
   * You can get file_id via the Upload Files endpoints. This field is required when upload_type is UPLOAD_BY_FILE_ID.
   */
  file_id?: string
}

export type TImageUploadResponse = {
  id: string

  // Image ID, used to create ads. Same as id
  image_id: string
  material_id: string
  height: number
  width: number
  format: string

  // Image URL, valid for an hour and needs to be re-acquired after expiration.
  url: string

  // MD5 of Picture
  signature: string

  // Image size, in Bytes
  size: number

  // Image name
  file_name: string

  // Creation time. UTC time, format: 2020-06-10T07:39:14Z
  create_time: string

  // Modification time. UTC time, format: 2020-06-10T07:39:14Z
  modify_time: string

  // Whether it can be displayed on the platform
  displayable: boolean
}

export type TVideoUploadPayload = {
  advertiser_id: string

  /**
   * Video name. Length limit: 1 - 100 characters. The default value is the file name or the last path of the URL.
   * If another video uses the same file name under the same advertiser_id, there will a millisecond timestamp added
   * at the end. If the file name contains more than 100 characters, only the first 100 characters will be used.
   */
  file_name?: string

  /**
   * Upload method.
   * Default: UPLOAD_BY_FILE (multipart/form-data).
   */
  upload_type?: ECreativeUploadType

  /**
   * Video file.
   * Required when upload_type is UPLOAD_BY_FILE (by default).
   *
   * Recommended settings:
   *  1. File size: up to 500 MB
   *  2. Aspect ratio: 9:16, 16:9 or 1:1
   *  3. Format: .mp4, .mov, .mpeg, .avi
   *  4. (For TikTok Ads Placement) Resolution ≥ 720 * 1280 px, bitrate > 516 Kbps, duration 5-60s (recommended 9-15)
   *
   * По разрешению в 4м пункте непонятно, т.к. в Video Ads Specifications к формату рекламы в TikTok написано иное.
   * @see [Video Ads Specifications]{@link https://ads.tiktok.com/help/article?aid=9626}
   */
  video_file?: Buffer | ReadStream

  /**
   * MD5-сумма загружаемого видео.
   * Required when upload_type is UPLOAD_BY_FILE.
   * Необходима для валидации загрузки (что рандомные биты нигде не потерялись по дороге).
   */
  video_signature?: string

  /**
   * Video url address
   * Required when upload_type is UPLOAD_BY_URL.
   *
   * File size: better within 10 MB. (и чё я не могу загрузить их же видос по их же URL???)
   * Verification: we will verify the data if you set a Content-MD5 in the response header.
   * Others: ratio, format, resolution and bitrate limitation is the same as video file.
   * @see video_file
   */
  video_url?: string

  /**
   * The file_id of the file that you want to upload.
   * This field is for files that are uploaded to the Temporary File Repository.
   * You can get file_id via the Upload Files endpoints.
   *
   * Required when upload_type is UPLOAD_BY_FILE_ID.
   */
  file_id?: string
}

// TODO у многих ответов при работе с видео есть большие куски одинаковой структуры. Нужно вынести в интерфейс или тип.
// TODO в именно загрузке видео сразу возваращется только video_id, остальное можно получить после загрузки видео в info.
export type TVideoUploadResponse = {
  /**
   * Whether it can be displayed on the platform.
   */
  displayable: boolean

  /**
   * Placement available.
   * Due to the music copyright, some materials generated by creative tools can only be shown on TikTok.
   * It won't pass when they are created on other placements.
   */
  allowed_placements: EPlacement[]

  /**
   * Video width.
   */
  width: number

  /**
   * Video cover.
   * Valid for an hour and needs to be re-acquired after expiration.
   */
  poster_url: string

  /**
   * Bit rate, in bps.
   */
  bit_rate: number

  /**
   * Video format.
   */
  format: string

  /**
   * Video preview link.
   * Valid for an hour and needs to re-acquired after expiration.
   */
  url: string

  /**
   * Video duration, in seconds.
   */
  duration: number

  /**
   * 	Video height.
   */
  height: number

  /**
   * MD5-hash of video file.
   */
  signature: string

  /**
   * Video ID.
   * Can be used to create ad in ad delivery.
   */
  id: string

  /**
   * Video ID.
   * Can be used to create ad in ad delivery. Same as id.
   * @see id
   */
  video_id: string

  /**
   * Video size, in bytes.
   */
  size: number

  /**
   * Video name.
   */
  file_name: string

  /**
   * 	Creation time.
   * 	UTC time, format: "2020-06-10T07:39:14Z"
   */
  create_time: string

  /**
   * Modification time.
   * UTC time, format: "2020-06-10T07:39:14Z"
   */
  modify_time: string
}[]

export type TVideoUpdatePayload = {
  advertiser_id: string

  /**
   * Video name.
   * Length limit: 1 - 100 characters. If another video uses the same file name under the same advertiser_id,
   * there will a millisecond timestamp added at the end. If the file name contains more than 100 characters, only
   * the first 100 characters will be used.
   */
  file_name: string

  /**
   * Video ID.
   */
  video_id: string
}

export type TVideoInfoPayload = {
  advertiser_id: string

  /**
   * Image ID list.
   * Up to 100 ids per request.
   */
  video_ids: string[]
}

export type TVideoInfoResponse = {
  list: {
    /**
     * Whether it can be displayed on the platform.
     */
    displayable: boolean

    /**
     * Placement available.
     * Due to the music copyright, some materials generated by creative tools can only be shown on TikTok.
     * It won't pass when they are created on other placements.
     */
    allowed_placements: EPlacement[]

    /**
     * Video downloadable. Due to the music copyright, some materials generated by creative tools are only allowed to
     * preview. It is prohibited to download and disseminate them.
     */
    allow_download: boolean

    /**
     * Video width.
     */
    width: number

    /**
     * Video cover.
     * Valid for an hour and needs to be re-acquired after expiration.
     */
    poster_url: string

    /**
     * Bit rate, in bps.
     */
    bit_rate: number

    /**
     * Video format.
     */
    format: string

    /**
     * Video preview link.
     * Valid for an hour and needs to re-acquired after expiration.
     */
    url: string

    /**
     * Video duration, in seconds.
     */
    duration: number

    /**
     * 	Video height.
     */
    height: number

    /**
     * MD5-hash of video file.
     */
    signature: string

    /**
     * Video ID.
     * Can be used to create ad in ad delivery.
     */
    id: string

    /**
     * Video ID.
     * Can be used to create ad in ad delivery. Same as id.
     * @see id
     */
    video_id: string

    /**
     * Video size, in bytes.
     */
    size: number

    /**
     * Video name.
     */
    file_name: string

    /**
     * 	Creation time.
     * 	UTC time, format: "2020-06-10T07:39:14Z"
     */
    create_time: string

    /**
     * Modification time.
     * UTC time, format: "2020-06-10T07:39:14Z"
     */
    modify_time: string
  }[]
}

export type TVideoSearchPayload = {
  advertiser_id: string
  filtering?: {
    height?: number

    /**
     * Video aspect ratio, eg: [1.7, 2.5].
     * Use 1.7 to search for videos with aspect ratio between 1.65-1.75, i.e. the precision floating point is 0.05
     */
    ratio?: number[]
    video_ids?: string[]
    material_ids?: string[]
    width?: number
    displayable?: boolean
  }

  // Current page number, default value: 1, value range: ≥ 1
  page?: number

  // Page size, default value: 20, value range: 1-100
  page_size?: number
}

export type TVideoSearchResponse = {
  list: {
    width: number
    height: number
    bit_rate: number
    duration: number
    format: string
    size: number
    signature: string
    poster_url: string
    url: string
    id: string
    video_id: string
    material_id: string
    file_name: string
    create_time: string
    modify_time: string
    displayable: boolean
    allowed_placements: EPlacement[]
    allow_download: boolean
  }[]
  page_info: TPageInfo
}

export type TVideoCoverPayload = {
  advertiser_id: string
  video_id: string

  /**
   * Number of cover candidates you want to get. Range: 1-10. Default: 10.
   * If the total number of cover candidates is less than the number given, all candidates will be returned.
   */
  poster_number?: number
}

export type TVideoCoverResponse = {
  list: {
    width: number
    height: number
    id: string

    // Picture preview address, valid for an hour and needs to be re-acquired after expiration.
    url: string
  }[]
}

export type TAdPreviewPayload = {
  advertiser_id: string

  /**
   * Material type of reviewing object.
   */
  material_type: ECreativeMaterialType

  /**
   * Ad ID.
   * Required if material_type is AD.
   */
  ad_id?: string

  /**
   * Video ID.
   * Required if material_type is VIDEO.
   * Different placement has different restrictions
   * @see [Creative Specifications]{@link https://ads.tiktok.com/marketing_api/docs?rid=xxxo3hl9uaq&id=100539}
   */
  video_id?: string

  /**
   * Image ID.
   * Required if material_type is IMAGE.
   * Different placement has different restrictions
   * @see [Creative Specifications]{@link https://ads.tiktok.com/marketing_api/docs?rid=xxxo3hl9uaq&id=100539}
   */
  image_id?: string

  /**
   * Image ID of cover pictures.
   * Available when material_type is SINGLE_VIDEO. If none, it will not be shown.
   * Cover pictures could be obtained by Video Smart Cover endpoint.
   * @see [Video Smart Cover endpoint]{@link https://ads.tiktok.com/marketing_api/docs?rid=xxxo3hl9uaq&id=100560}
   */
  thumbnail?: string

  /**
   * Image ID of profile picture.
   * Available when material_type is SINGLE_VIDEO. If none, it will not be shown.
   */
  profile_image?: string

  /**
   * Brand name. Restrictions: 2-20 characters.
   * Required when material_type is SINGLE_VIDEO.
   */
  display_name?: string

  /**
   * Slogan and context. Restrictions: 12-100 characters.
   * Required when material_type is SINGLE_IMAGE or SINGLE_VIDEO.
   */
  ad_text?: string

  /**
   * Action guidelines.
   * Required when material_type is SINGLE_IMAGE or SINGLE_VIDEO.
   */
  call_to_action?: string

  /**
   * Placement. Required when material_type is SINGLE_IMAGE or SINGLE_VIDEO.
   *
   * NOTE: Different placement supports different materials. For details, see the material requirements and the
   * returned error message.
   */
  placement?: EPlacement[]

  /**
   * Device type.
   */
  device: TUserDevice[]

  /**
   * Language. Default value: ENGLISH.
   */
  language?: 'ENGLISH' | 'CHINESE' | 'JAPANESE'
}

export type TAdPreviewResponse = {
  preview_link: string

  /**
   * Adjustment advice. Modify the materials according to the prompts to obtain a better display effect.
   */
  tips: {
    /**
     * Incorrect placement. If it is a general prompt message (applicable to all placements), then this field will
     * not be returned.
     */
    placement?: EPlacement

    messages: string[]
  }[]
}

export type TTempFileUploadPayload = {
  advertiser_id: string
  upload_type: 'FILE' | 'URL'
  content_type: 'image' | 'music' | 'video' | 'playable'

  /**
   * The file that you want to upload.
   * Required when upload_typeis set toFILE.
   */
  file?: Buffer | ReadStream

  /**
   * The URL of the file that you want to upload, in the format of “http://xxx.xxx”.
   * Required when upload_type is URL.
   */
  url?: string

  /**
   * The MD5 value of the file, used as a checksum to check data integrity by the server side.
   * Required when upload_type is FILE.
   */
  signature?: string

  /**
   * T file name. The maximum length is 100 characters.
   */
  name?: string
}

export type TTempFileUploadResponse = {
  /**
   * The ID of the file that you have uploaded. You can use this ID to upload the file from the file library to the
   * creatives library. It is valid for 24 hours.
   */
  file_id: string

  /**
   * The MD5 value of the file.
   */
  signature: string

  /**
   * The file size. In bytes.
   */
  file_size: number

  /**
   * The time when the file is uploaded (UTC+0). Example: 2020-06-10T07:39:14Z
   */
  create_time: string
}
