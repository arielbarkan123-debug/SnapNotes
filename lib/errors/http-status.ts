/**
 * HTTP Status Code Mappings for Error Codes
 *
 * Maps each error code to its appropriate HTTP status code
 */

import { type ErrorCode, ErrorCodes } from './codes'

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

// ============================================================================
// Error Code to HTTP Status Mapping
// ============================================================================

export const ErrorHttpStatus: Record<ErrorCode, number> = {
  // ============================================================================
  // Authentication Errors (NS-AUTH-XXX)
  // ============================================================================

  // Login errors - 401 Unauthorized
  [ErrorCodes.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.EMAIL_NOT_VERIFIED]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.ACCOUNT_DISABLED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.ACCOUNT_LOCKED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.ACCOUNT_NOT_FOUND]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.PROVIDER_ERROR]: HttpStatus.BAD_GATEWAY,

  // Signup errors - 400/409
  [ErrorCodes.EMAIL_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [ErrorCodes.PASSWORD_TOO_WEAK]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.INVALID_EMAIL_FORMAT]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.SIGNUP_DISABLED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.TERMS_NOT_ACCEPTED]: HttpStatus.BAD_REQUEST,

  // Password reset errors
  [ErrorCodes.RESET_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCodes.RESET_TOKEN_EXPIRED]: HttpStatus.GONE,
  [ErrorCodes.RESET_TOKEN_INVALID]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.RESET_EMAIL_NOT_FOUND]: HttpStatus.NOT_FOUND,

  // Session errors - 401
  [ErrorCodes.SESSION_EXPIRED]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.SESSION_INVALID]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.SESSION_NOT_FOUND]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.REFRESH_TOKEN_INVALID]: HttpStatus.UNAUTHORIZED,

  // OAuth errors
  [ErrorCodes.OAUTH_PROVIDER_ERROR]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.OAUTH_CALLBACK_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.OAUTH_STATE_MISMATCH]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.OAUTH_EMAIL_MISMATCH]: HttpStatus.CONFLICT,

  // MFA errors
  [ErrorCodes.MFA_REQUIRED]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.MFA_INVALID_CODE]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.MFA_EXPIRED]: HttpStatus.GONE,

  // Generic auth errors
  [ErrorCodes.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCodes.AUTH_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Course Errors (NS-CRS-XXX)
  // ============================================================================

  // Fetch errors
  [ErrorCodes.COURSE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.COURSE_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.COURSE_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.COURSE_LIST_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.COURSE_CORRUPTED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Create errors
  [ErrorCodes.COURSE_CREATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.COURSE_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [ErrorCodes.COURSE_TITLE_REQUIRED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.COURSE_CONTENT_REQUIRED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.COURSE_LIMIT_EXCEEDED]: HttpStatus.FORBIDDEN,

  // Update errors
  [ErrorCodes.COURSE_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.COURSE_VERSION_CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCodes.COURSE_LOCKED]: HttpStatus.CONFLICT,

  // Delete errors
  [ErrorCodes.COURSE_DELETE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.COURSE_HAS_DEPENDENCIES]: HttpStatus.CONFLICT,

  // Progress errors
  [ErrorCodes.PROGRESS_SAVE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PROGRESS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PROGRESS_INVALID_STATE]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.LESSON_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.LESSON_ALREADY_COMPLETE]: HttpStatus.CONFLICT,
  [ErrorCodes.LESSON_ACCESS_DENIED]: HttpStatus.FORBIDDEN,

  // Generation errors
  [ErrorCodes.GENERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.GENERATION_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.GENERATION_NO_CONTENT]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.GENERATION_INVALID_TOPIC]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.GENERATION_CONTINUE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Mastery errors
  [ErrorCodes.MASTERY_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.MASTERY_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Generic course errors
  [ErrorCodes.COURSE_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Homework Help Errors (NS-HW-XXX)
  // ============================================================================

  // Session errors (HW_ prefix)
  [ErrorCodes.HW_SESSION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.HW_SESSION_CREATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.HW_SESSION_EXPIRED]: HttpStatus.GONE,
  [ErrorCodes.HW_SESSION_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.HW_SESSION_INVALID_STATE]: HttpStatus.BAD_REQUEST,

  // Chat errors
  [ErrorCodes.CHAT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.CHAT_STREAM_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.CHAT_MESSAGE_TOO_LONG]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.CHAT_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,

  // Hint errors
  [ErrorCodes.HINT_GENERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.HINT_NOT_AVAILABLE]: HttpStatus.NOT_FOUND,
  [ErrorCodes.HINT_LIMIT_EXCEEDED]: HttpStatus.FORBIDDEN,

  // Check errors
  [ErrorCodes.CHECK_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.CHECK_CREATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.CHECK_PROCESSING_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.CHECK_INVALID_INPUT]: HttpStatus.BAD_REQUEST,

  // Generic homework errors
  [ErrorCodes.HOMEWORK_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Practice & SRS Errors (NS-PRAC-XXX)
  // ============================================================================

  // Session errors (PRAC_ prefix)
  [ErrorCodes.PRAC_SESSION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.PRAC_SESSION_CREATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PRAC_SESSION_EXPIRED]: HttpStatus.GONE,
  [ErrorCodes.PRAC_SESSION_COMPLETE]: HttpStatus.CONFLICT,
  [ErrorCodes.PRAC_SESSION_ACCESS_DENIED]: HttpStatus.FORBIDDEN,

  // Question errors
  [ErrorCodes.QUESTION_GENERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.QUESTION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.QUESTION_INVALID_TYPE]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.QUESTIONS_EXHAUSTED]: HttpStatus.NO_CONTENT,

  // Answer errors
  [ErrorCodes.ANSWER_SUBMIT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ANSWER_EVALUATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ANSWER_INVALID_FORMAT]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.ANSWER_ALREADY_SUBMITTED]: HttpStatus.CONFLICT,

  // SRS errors
  [ErrorCodes.SRS_CARD_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.SRS_CARD_GENERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.SRS_REVIEW_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.SRS_SETTINGS_INVALID]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.SRS_COURSE_NOT_FOUND]: HttpStatus.NOT_FOUND,

  // Deep practice errors
  [ErrorCodes.DEEP_PRACTICE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.DEEP_PRACTICE_NO_STEPS]: HttpStatus.NOT_FOUND,

  // Log errors
  [ErrorCodes.LOG_SAVE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.LOG_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Generic practice errors
  [ErrorCodes.PRACTICE_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Exam Errors (NS-EXAM-XXX)
  // ============================================================================

  // Fetch errors
  [ErrorCodes.EXAM_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.EXAM_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.EXAM_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.EXAM_LIST_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Create/Generate errors
  [ErrorCodes.EXAM_CREATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.EXAM_GENERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.EXAM_INVALID_CONFIG]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.EXAM_TOO_FEW_QUESTIONS]: HttpStatus.UNPROCESSABLE_ENTITY,

  // Submit errors
  [ErrorCodes.SUBMIT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.SUBMIT_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.SUBMIT_ALREADY_SUBMITTED]: HttpStatus.CONFLICT,
  [ErrorCodes.SUBMIT_INCOMPLETE]: HttpStatus.BAD_REQUEST,

  // Grading errors
  [ErrorCodes.GRADING_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.GRADING_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.GRADING_INVALID_ANSWER]: HttpStatus.BAD_REQUEST,

  // Past exam errors
  [ErrorCodes.PAST_EXAM_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.PAST_EXAM_ANALYSIS_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PAST_EXAM_UPLOAD_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Generic exam errors
  [ErrorCodes.EXAM_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Upload Errors (NS-UPL-XXX)
  // ============================================================================

  // File validation errors
  [ErrorCodes.FILE_TOO_LARGE]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.INVALID_FILE_TYPE]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.NO_FILES_PROVIDED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.TOO_MANY_FILES]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FILE_CORRUPTED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FILE_EMPTY]: HttpStatus.BAD_REQUEST,

  // Storage errors
  [ErrorCodes.STORAGE_UPLOAD_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.STORAGE_BUCKET_NOT_FOUND]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.STORAGE_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.STORAGE_DELETE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Image fetch errors
  [ErrorCodes.IMAGE_FETCH_FAILED]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.IMAGE_FETCH_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.IMAGE_URL_INVALID]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.IMAGE_FORBIDDEN]: HttpStatus.FORBIDDEN,

  // Signed URL errors
  [ErrorCodes.SIGNED_URL_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.SIGNED_URL_EXPIRED]: HttpStatus.GONE,

  // Generic upload errors
  [ErrorCodes.UPLOAD_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Document Processing Errors (NS-DOC-XXX)
  // ============================================================================

  // Processing errors
  [ErrorCodes.PROCESSING_FAILED]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.PROCESSING_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.UNSUPPORTED_FORMAT]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.CONTENT_EXTRACTION_FAILED]: HttpStatus.UNPROCESSABLE_ENTITY,

  // PDF errors
  [ErrorCodes.PDF_PASSWORD_PROTECTED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.PDF_CORRUPTED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.PDF_TOO_MANY_PAGES]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.PDF_SCANNED_DOCUMENT]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.PDF_EMPTY]: HttpStatus.BAD_REQUEST,

  // Office document errors
  [ErrorCodes.DOCX_PROCESSING_FAILED]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.PPTX_PROCESSING_FAILED]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.OFFICE_FILE_CORRUPTED]: HttpStatus.BAD_REQUEST,

  // Image extraction errors
  [ErrorCodes.IMAGE_EXTRACTION_FAILED]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.NO_READABLE_CONTENT]: HttpStatus.UNPROCESSABLE_ENTITY,

  // Generic document errors
  [ErrorCodes.DOCUMENT_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // AI Service Errors (NS-AI-XXX)
  // ============================================================================

  // API availability errors
  [ErrorCodes.API_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCodes.API_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCodes.API_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.API_OVERLOADED]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCodes.API_KEY_INVALID]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.API_KEY_NOT_CONFIGURED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Response parsing errors
  [ErrorCodes.RESPONSE_PARSE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.RESPONSE_MISSING_FIELDS]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.RESPONSE_INVALID_FORMAT]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.RESPONSE_EMPTY]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Vision/Image errors
  [ErrorCodes.IMAGE_UNREADABLE]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.IMAGE_NO_CONTENT]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.IMAGE_TOO_SMALL]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.IMAGE_TOO_LARGE]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.IMAGE_UNSUPPORTED]: HttpStatus.BAD_REQUEST,

  // Generation errors (AI_ prefix)
  [ErrorCodes.AI_COURSE_GENERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.AI_QUESTION_GENERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.EVALUATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.CONCEPT_EXTRACTION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.FEEDBACK_GENERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Streaming errors
  [ErrorCodes.STREAM_CONNECTION_LOST]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.STREAM_PARSE_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.STREAM_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,

  // Usage errors
  [ErrorCodes.USAGE_LIMIT_EXCEEDED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.DAILY_LIMIT_EXCEEDED]: HttpStatus.FORBIDDEN,

  // Content filter errors
  [ErrorCodes.CONTENT_FILTERED]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCodes.INAPPROPRIATE_CONTENT]: HttpStatus.BAD_REQUEST,

  // Generic AI errors
  [ErrorCodes.AI_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Database Errors (NS-DB-XXX)
  // ============================================================================

  // Query errors
  [ErrorCodes.QUERY_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.QUERY_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.QUERY_INVALID]: HttpStatus.BAD_REQUEST,

  // Insert errors
  [ErrorCodes.INSERT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.DUPLICATE_RECORD]: HttpStatus.CONFLICT,
  [ErrorCodes.CONSTRAINT_VIOLATION]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FOREIGN_KEY_VIOLATION]: HttpStatus.BAD_REQUEST,

  // Update errors
  [ErrorCodes.UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.RECORD_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.CONCURRENT_UPDATE]: HttpStatus.CONFLICT,

  // Delete errors
  [ErrorCodes.DELETE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.DELETE_CONSTRAINT]: HttpStatus.CONFLICT,

  // RLS/Permission errors
  [ErrorCodes.RLS_ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.RLS_POLICY_VIOLATION]: HttpStatus.FORBIDDEN,

  // Connection errors
  [ErrorCodes.CONNECTION_FAILED]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCodes.CONNECTION_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.POOL_EXHAUSTED]: HttpStatus.SERVICE_UNAVAILABLE,

  // Transaction errors
  [ErrorCodes.TRANSACTION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.TRANSACTION_ROLLBACK]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.DEADLOCK]: HttpStatus.CONFLICT,

  // Generic database errors
  [ErrorCodes.DATABASE_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Gamification Errors (NS-GAME-XXX)
  // ============================================================================

  [ErrorCodes.XP_GRANT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.XP_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.XP_INVALID_AMOUNT]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.STREAK_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.STREAK_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.ACHIEVEMENT_GRANT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ACHIEVEMENT_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.ACHIEVEMENT_ALREADY_EARNED]: HttpStatus.CONFLICT,

  [ErrorCodes.LEADERBOARD_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.LEADERBOARD_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.GAMIFICATION_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Analytics Errors (NS-ANLYT-XXX)
  // ============================================================================

  [ErrorCodes.EVENT_TRACK_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.EVENT_INVALID]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.EVENT_BATCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Session errors (ANLYT_ prefix)
  [ErrorCodes.ANLYT_SESSION_CREATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ANLYT_SESSION_END_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ANLYT_SESSION_NOT_FOUND]: HttpStatus.NOT_FOUND,

  [ErrorCodes.OVERVIEW_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PAGE_VIEWS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.EVENTS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ENGAGEMENT_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.FUNNELS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.JOURNEYS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.CLICKS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ERRORS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.SESSIONS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.EXPORT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.EXPORT_TOO_LARGE]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.EXPORT_INVALID_FORMAT]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.AGGREGATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.ADMIN_ANALYTICS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ADMIN_ANALYTICS_EXPORT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.ANALYTICS_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // User Profile Errors (NS-USER-XXX)
  // ============================================================================

  [ErrorCodes.PROFILE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.PROFILE_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PROFILE_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PROFILE_CREATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Mastery errors (USER_ prefix)
  [ErrorCodes.USER_MASTERY_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.USER_MASTERY_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.GAPS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.GAPS_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.PREFERENCES_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PREFERENCES_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PREFERENCES_INVALID]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.REFINEMENT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.STATS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.RECOMMENDATIONS_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.WEAK_AREAS_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.USER_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Client-Side Errors (NS-CLIENT-XXX)
  // ============================================================================

  // These are client-side errors, so HTTP status is less relevant
  // but we map them for completeness when they need to be sent as responses

  [ErrorCodes.NETWORK_REQUEST_FAILED]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.NETWORK_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.NETWORK_OFFLINE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCodes.NETWORK_SLOW]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCodes.SSL_ERROR]: HttpStatus.BAD_GATEWAY,

  [ErrorCodes.JSON_PARSE_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.CORS_BLOCKED]: HttpStatus.FORBIDDEN,
  [ErrorCodes.INVALID_RESPONSE]: HttpStatus.BAD_GATEWAY,

  [ErrorCodes.JS_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PROMISE_REJECTION]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.RENDER_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.HYDRATION_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.FORM_VALIDATION_FAILED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FORM_SUBMIT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.IMAGE_LOAD_FAILED]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.AUDIO_LOAD_FAILED]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.VIDEO_LOAD_FAILED]: HttpStatus.BAD_GATEWAY,

  [ErrorCodes.LOCALSTORAGE_QUOTA]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.LOCALSTORAGE_ACCESS]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.INDEXEDDB_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.SW_REGISTRATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.SW_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.CACHE_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.INSTALL_PROMPT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCodes.BROWSER_NOT_SUPPORTED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FEATURE_NOT_SUPPORTED]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.CLIENT_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Rate Limiting Errors (NS-RATE-XXX)
  // ============================================================================

  [ErrorCodes.USER_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCodes.USER_DAILY_LIMIT]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCodes.USER_CONCURRENT_LIMIT]: HttpStatus.TOO_MANY_REQUESTS,

  [ErrorCodes.IP_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCodes.IP_BANNED]: HttpStatus.FORBIDDEN,

  [ErrorCodes.ENDPOINT_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,

  [ErrorCodes.AI_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCodes.AI_DAILY_LIMIT]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCodes.AI_CONCURRENT_LIMIT]: HttpStatus.TOO_MANY_REQUESTS,

  [ErrorCodes.RATE_LIMIT_UNKNOWN]: HttpStatus.TOO_MANY_REQUESTS,

  // ============================================================================
  // Validation Errors (NS-VAL-XXX)
  // ============================================================================

  [ErrorCodes.BODY_REQUIRED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.BODY_INVALID_JSON]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.BODY_TOO_LARGE]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.FIELD_REQUIRED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FIELD_INVALID_TYPE]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FIELD_TOO_SHORT]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FIELD_TOO_LONG]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FIELD_INVALID_FORMAT]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.FIELD_OUT_OF_RANGE]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.PARAM_REQUIRED]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.PARAM_INVALID]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.VAL_QUERY_INVALID]: HttpStatus.BAD_REQUEST,
  [ErrorCodes.QUERY_PARAM_REQUIRED]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.METHOD_NOT_ALLOWED]: HttpStatus.METHOD_NOT_ALLOWED,

  [ErrorCodes.VALIDATION_UNKNOWN]: HttpStatus.BAD_REQUEST,

  // ============================================================================
  // External Service Errors (NS-EXT-XXX)
  // ============================================================================

  [ErrorCodes.SUPABASE_CONNECTION_FAILED]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCodes.SUPABASE_AUTH_ERROR]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.SUPABASE_STORAGE_ERROR]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.SUPABASE_REALTIME_ERROR]: HttpStatus.BAD_GATEWAY,

  [ErrorCodes.UNSPLASH_FETCH_FAILED]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.UNSPLASH_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,

  [ErrorCodes.RESEND_SEND_FAILED]: HttpStatus.BAD_GATEWAY,
  [ErrorCodes.RESEND_RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCodes.RESEND_INVALID_EMAIL]: HttpStatus.BAD_REQUEST,

  [ErrorCodes.CRON_SECRET_MISSING]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.CRON_AUTH_FAILED]: HttpStatus.UNAUTHORIZED,

  [ErrorCodes.EXTERNAL_UNKNOWN]: HttpStatus.BAD_GATEWAY,

  // ============================================================================
  // Monitoring Errors (NS-MON-XXX)
  // ============================================================================

  [ErrorCodes.ERROR_REPORT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.METRICS_SEND_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.MONITORING_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Adaptive Learning Errors (NS-ADPT-XXX)
  // ============================================================================

  [ErrorCodes.STATE_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.STATE_UPDATE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.RECORD_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.RESET_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.ADAPTIVE_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Help Errors (NS-HELP-XXX)
  // ============================================================================

  [ErrorCodes.HELP_CHAT_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.HELP_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,

  // ============================================================================
  // Performance Errors (NS-PERF-XXX)
  // ============================================================================

  [ErrorCodes.STEPS_FETCH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCodes.PERFORMANCE_UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the HTTP status code for an error code
 */
export function getHttpStatus(code: ErrorCode): number {
  return ErrorHttpStatus[code] || HttpStatus.INTERNAL_SERVER_ERROR
}

/**
 * Check if an error code represents a client error (4xx)
 */
export function isClientError(code: ErrorCode): boolean {
  const status = getHttpStatus(code)
  return status >= 400 && status < 500
}

/**
 * Check if an error code represents a server error (5xx)
 */
export function isServerError(code: ErrorCode): boolean {
  const status = getHttpStatus(code)
  return status >= 500
}

/**
 * Check if an error is retryable based on HTTP status
 */
export function isRetryable(code: ErrorCode): boolean {
  const status = getHttpStatus(code)
  // Generally, 5xx errors and 429 are retryable
  return status >= 500 || status === HttpStatus.TOO_MANY_REQUESTS
}
