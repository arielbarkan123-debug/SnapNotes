/**
 * NoteSnap Comprehensive Error Code System
 *
 * Error Code Format: NS-{AREA}-{NUMBER}
 * - NS: NoteSnap prefix
 * - AREA: 3-5 letter category code
 * - NUMBER: 3-digit unique ID within category
 *
 * When reporting errors, these codes allow precise identification
 * of the error source and type.
 */

// ============================================================================
// Authentication Errors (NS-AUTH-XXX)
// ============================================================================

export const AuthErrorCodes = {
  // Login errors (001-009)
  INVALID_CREDENTIALS: 'NS-AUTH-001',
  EMAIL_NOT_VERIFIED: 'NS-AUTH-002',
  ACCOUNT_DISABLED: 'NS-AUTH-003',
  ACCOUNT_LOCKED: 'NS-AUTH-004',
  ACCOUNT_NOT_FOUND: 'NS-AUTH-005',
  PROVIDER_ERROR: 'NS-AUTH-006',

  // Signup errors (010-019)
  EMAIL_ALREADY_EXISTS: 'NS-AUTH-010',
  PASSWORD_TOO_WEAK: 'NS-AUTH-011',
  INVALID_EMAIL_FORMAT: 'NS-AUTH-012',
  SIGNUP_DISABLED: 'NS-AUTH-013',
  TERMS_NOT_ACCEPTED: 'NS-AUTH-014',

  // Password reset errors (020-029)
  RESET_RATE_LIMITED: 'NS-AUTH-020',
  RESET_TOKEN_EXPIRED: 'NS-AUTH-021',
  RESET_TOKEN_INVALID: 'NS-AUTH-022',
  RESET_EMAIL_NOT_FOUND: 'NS-AUTH-023',

  // Session errors (030-039)
  SESSION_EXPIRED: 'NS-AUTH-030',
  SESSION_INVALID: 'NS-AUTH-031',
  SESSION_NOT_FOUND: 'NS-AUTH-032',
  REFRESH_TOKEN_EXPIRED: 'NS-AUTH-033',
  REFRESH_TOKEN_INVALID: 'NS-AUTH-034',

  // OAuth errors (040-049)
  OAUTH_PROVIDER_ERROR: 'NS-AUTH-040',
  OAUTH_CALLBACK_ERROR: 'NS-AUTH-041',
  OAUTH_STATE_MISMATCH: 'NS-AUTH-042',
  OAUTH_EMAIL_MISMATCH: 'NS-AUTH-043',

  // MFA errors (050-059)
  MFA_REQUIRED: 'NS-AUTH-050',
  MFA_INVALID_CODE: 'NS-AUTH-051',
  MFA_EXPIRED: 'NS-AUTH-052',

  // Generic auth errors (090-099)
  UNAUTHORIZED: 'NS-AUTH-090',
  FORBIDDEN: 'NS-AUTH-091',
  AUTH_UNKNOWN: 'NS-AUTH-099',
} as const

// ============================================================================
// Course Errors (NS-CRS-XXX)
// ============================================================================

export const CourseErrorCodes = {
  // Fetch errors (001-009)
  COURSE_NOT_FOUND: 'NS-CRS-001',
  COURSE_ACCESS_DENIED: 'NS-CRS-002',
  COURSE_FETCH_FAILED: 'NS-CRS-003',
  COURSE_LIST_FAILED: 'NS-CRS-004',
  COURSE_CORRUPTED: 'NS-CRS-005',

  // Create errors (010-019)
  COURSE_CREATE_FAILED: 'NS-CRS-010',
  COURSE_ALREADY_EXISTS: 'NS-CRS-011',
  COURSE_TITLE_REQUIRED: 'NS-CRS-012',
  COURSE_CONTENT_REQUIRED: 'NS-CRS-013',
  COURSE_LIMIT_EXCEEDED: 'NS-CRS-014',

  // Update errors (020-029)
  COURSE_UPDATE_FAILED: 'NS-CRS-020',
  COURSE_VERSION_CONFLICT: 'NS-CRS-021',
  COURSE_LOCKED: 'NS-CRS-022',

  // Delete errors (030-039)
  COURSE_DELETE_FAILED: 'NS-CRS-030',
  COURSE_HAS_DEPENDENCIES: 'NS-CRS-031',

  // Progress errors (040-049)
  PROGRESS_SAVE_FAILED: 'NS-CRS-040',
  PROGRESS_FETCH_FAILED: 'NS-CRS-041',
  PROGRESS_INVALID_STATE: 'NS-CRS-042',
  LESSON_NOT_FOUND: 'NS-CRS-043',
  LESSON_ALREADY_COMPLETE: 'NS-CRS-044',
  LESSON_ACCESS_DENIED: 'NS-CRS-045',

  // Generation errors (050-059)
  GENERATION_FAILED: 'NS-CRS-050',
  GENERATION_TIMEOUT: 'NS-CRS-051',
  GENERATION_NO_CONTENT: 'NS-CRS-052',
  GENERATION_INVALID_TOPIC: 'NS-CRS-053',
  GENERATION_CONTINUE_FAILED: 'NS-CRS-054',

  // Mastery errors (060-069)
  MASTERY_FETCH_FAILED: 'NS-CRS-060',
  MASTERY_UPDATE_FAILED: 'NS-CRS-061',

  // Generic course errors (090-099)
  COURSE_UNKNOWN: 'NS-CRS-099',
} as const

// ============================================================================
// Homework Help Errors (NS-HW-XXX)
// ============================================================================

export const HomeworkErrorCodes = {
  // Session errors (001-009)
  HW_SESSION_NOT_FOUND: 'NS-HW-001',
  HW_SESSION_CREATE_FAILED: 'NS-HW-002',
  HW_SESSION_EXPIRED: 'NS-HW-003',
  HW_SESSION_ACCESS_DENIED: 'NS-HW-004',
  HW_SESSION_INVALID_STATE: 'NS-HW-005',

  // Chat errors (010-019)
  CHAT_FAILED: 'NS-HW-010',
  CHAT_STREAM_ERROR: 'NS-HW-011',
  CHAT_MESSAGE_TOO_LONG: 'NS-HW-012',
  CHAT_RATE_LIMITED: 'NS-HW-013',

  // Hint errors (020-029)
  HINT_GENERATION_FAILED: 'NS-HW-020',
  HINT_NOT_AVAILABLE: 'NS-HW-021',
  HINT_LIMIT_EXCEEDED: 'NS-HW-022',

  // Check errors (030-039)
  CHECK_NOT_FOUND: 'NS-HW-030',
  CHECK_CREATE_FAILED: 'NS-HW-031',
  CHECK_PROCESSING_FAILED: 'NS-HW-032',
  CHECK_INVALID_INPUT: 'NS-HW-033',

  // Generic homework errors (090-099)
  HOMEWORK_UNKNOWN: 'NS-HW-099',
} as const

// ============================================================================
// Practice & SRS Errors (NS-PRAC-XXX)
// ============================================================================

export const PracticeErrorCodes = {
  // Session errors (001-009)
  PRAC_SESSION_NOT_FOUND: 'NS-PRAC-001',
  PRAC_SESSION_CREATE_FAILED: 'NS-PRAC-002',
  PRAC_SESSION_EXPIRED: 'NS-PRAC-003',
  PRAC_SESSION_COMPLETE: 'NS-PRAC-004',
  PRAC_SESSION_ACCESS_DENIED: 'NS-PRAC-005',

  // Question errors (010-019)
  QUESTION_GENERATION_FAILED: 'NS-PRAC-010',
  QUESTION_NOT_FOUND: 'NS-PRAC-011',
  QUESTION_INVALID_TYPE: 'NS-PRAC-012',
  QUESTIONS_EXHAUSTED: 'NS-PRAC-013',

  // Answer errors (020-029)
  ANSWER_SUBMIT_FAILED: 'NS-PRAC-020',
  ANSWER_EVALUATION_FAILED: 'NS-PRAC-021',
  ANSWER_INVALID_FORMAT: 'NS-PRAC-022',
  ANSWER_ALREADY_SUBMITTED: 'NS-PRAC-023',

  // SRS errors (030-039)
  SRS_CARD_NOT_FOUND: 'NS-PRAC-030',
  SRS_CARD_GENERATION_FAILED: 'NS-PRAC-031',
  SRS_REVIEW_FAILED: 'NS-PRAC-032',
  SRS_SETTINGS_INVALID: 'NS-PRAC-033',
  SRS_COURSE_NOT_FOUND: 'NS-PRAC-034',

  // Deep practice errors (040-049)
  DEEP_PRACTICE_FAILED: 'NS-PRAC-040',
  DEEP_PRACTICE_NO_STEPS: 'NS-PRAC-041',

  // Log errors (050-059)
  LOG_SAVE_FAILED: 'NS-PRAC-050',
  LOG_FETCH_FAILED: 'NS-PRAC-051',

  // Generic practice errors (090-099)
  PRACTICE_UNKNOWN: 'NS-PRAC-099',
} as const

// ============================================================================
// Exam Errors (NS-EXAM-XXX)
// ============================================================================

export const ExamErrorCodes = {
  // Fetch errors (001-009)
  EXAM_NOT_FOUND: 'NS-EXAM-001',
  EXAM_ACCESS_DENIED: 'NS-EXAM-002',
  EXAM_FETCH_FAILED: 'NS-EXAM-003',
  EXAM_LIST_FAILED: 'NS-EXAM-004',

  // Create/Generate errors (010-019)
  EXAM_CREATE_FAILED: 'NS-EXAM-010',
  EXAM_GENERATION_FAILED: 'NS-EXAM-011',
  EXAM_INVALID_CONFIG: 'NS-EXAM-012',
  EXAM_TOO_FEW_QUESTIONS: 'NS-EXAM-013',

  // Submit errors (020-029)
  SUBMIT_FAILED: 'NS-EXAM-020',
  SUBMIT_TIMEOUT: 'NS-EXAM-021',
  SUBMIT_ALREADY_SUBMITTED: 'NS-EXAM-022',
  SUBMIT_INCOMPLETE: 'NS-EXAM-023',

  // Grading errors (030-039)
  GRADING_FAILED: 'NS-EXAM-030',
  GRADING_TIMEOUT: 'NS-EXAM-031',
  GRADING_INVALID_ANSWER: 'NS-EXAM-032',

  // Past exam errors (040-049)
  PAST_EXAM_NOT_FOUND: 'NS-EXAM-040',
  PAST_EXAM_ANALYSIS_FAILED: 'NS-EXAM-041',
  PAST_EXAM_UPLOAD_FAILED: 'NS-EXAM-042',

  // Generic exam errors (090-099)
  EXAM_UNKNOWN: 'NS-EXAM-099',
} as const

// ============================================================================
// Upload Errors (NS-UPL-XXX)
// ============================================================================

export const UploadErrorCodes = {
  // File validation errors (001-009)
  FILE_TOO_LARGE: 'NS-UPL-001',
  INVALID_FILE_TYPE: 'NS-UPL-002',
  NO_FILES_PROVIDED: 'NS-UPL-003',
  TOO_MANY_FILES: 'NS-UPL-004',
  FILE_CORRUPTED: 'NS-UPL-005',
  FILE_EMPTY: 'NS-UPL-006',

  // Storage errors (010-019)
  STORAGE_UPLOAD_FAILED: 'NS-UPL-010',
  STORAGE_QUOTA_EXCEEDED: 'NS-UPL-011',
  STORAGE_BUCKET_NOT_FOUND: 'NS-UPL-012',
  STORAGE_ACCESS_DENIED: 'NS-UPL-013',
  STORAGE_DELETE_FAILED: 'NS-UPL-014',

  // Image fetch errors (020-029)
  IMAGE_FETCH_FAILED: 'NS-UPL-020',
  IMAGE_FETCH_TIMEOUT: 'NS-UPL-021',
  IMAGE_URL_INVALID: 'NS-UPL-022',
  IMAGE_FORBIDDEN: 'NS-UPL-023',

  // Signed URL errors (030-039)
  SIGNED_URL_FAILED: 'NS-UPL-030',
  SIGNED_URL_EXPIRED: 'NS-UPL-031',

  // Generic upload errors (090-099)
  UPLOAD_UNKNOWN: 'NS-UPL-099',
} as const

// ============================================================================
// Document Processing Errors (NS-DOC-XXX)
// ============================================================================

export const DocumentErrorCodes = {
  // Processing errors (001-009)
  PROCESSING_FAILED: 'NS-DOC-001',
  PROCESSING_TIMEOUT: 'NS-DOC-002',
  UNSUPPORTED_FORMAT: 'NS-DOC-003',
  CONTENT_EXTRACTION_FAILED: 'NS-DOC-004',

  // PDF errors (010-019)
  PDF_PASSWORD_PROTECTED: 'NS-DOC-010',
  PDF_CORRUPTED: 'NS-DOC-011',
  PDF_TOO_MANY_PAGES: 'NS-DOC-012',
  PDF_SCANNED_DOCUMENT: 'NS-DOC-013',
  PDF_EMPTY: 'NS-DOC-014',

  // Office document errors (020-029)
  DOCX_PROCESSING_FAILED: 'NS-DOC-020',
  PPTX_PROCESSING_FAILED: 'NS-DOC-021',
  OFFICE_FILE_CORRUPTED: 'NS-DOC-022',

  // Image extraction errors (030-039)
  IMAGE_EXTRACTION_FAILED: 'NS-DOC-030',
  NO_READABLE_CONTENT: 'NS-DOC-031',

  // Generic document errors (090-099)
  DOCUMENT_UNKNOWN: 'NS-DOC-099',
} as const

// ============================================================================
// AI Service Errors (NS-AI-XXX)
// ============================================================================

export const AIErrorCodes = {
  // API availability errors (001-009)
  API_UNAVAILABLE: 'NS-AI-001',
  API_RATE_LIMITED: 'NS-AI-002',
  API_TIMEOUT: 'NS-AI-003',
  API_OVERLOADED: 'NS-AI-004',
  API_KEY_INVALID: 'NS-AI-005',
  API_KEY_NOT_CONFIGURED: 'NS-AI-006',

  // Response parsing errors (010-019)
  RESPONSE_PARSE_FAILED: 'NS-AI-010',
  RESPONSE_MISSING_FIELDS: 'NS-AI-011',
  RESPONSE_INVALID_FORMAT: 'NS-AI-012',
  RESPONSE_EMPTY: 'NS-AI-013',

  // Vision/Image errors (020-029)
  IMAGE_UNREADABLE: 'NS-AI-020',
  IMAGE_NO_CONTENT: 'NS-AI-021',
  IMAGE_TOO_SMALL: 'NS-AI-022',
  IMAGE_TOO_LARGE: 'NS-AI-023',
  IMAGE_UNSUPPORTED: 'NS-AI-024',

  // Generation errors (030-039)
  AI_COURSE_GENERATION_FAILED: 'NS-AI-030',
  AI_QUESTION_GENERATION_FAILED: 'NS-AI-031',
  EVALUATION_FAILED: 'NS-AI-032',
  CONCEPT_EXTRACTION_FAILED: 'NS-AI-033',
  FEEDBACK_GENERATION_FAILED: 'NS-AI-034',

  // Streaming errors (050-059)
  STREAM_CONNECTION_LOST: 'NS-AI-050',
  STREAM_PARSE_ERROR: 'NS-AI-051',
  STREAM_TIMEOUT: 'NS-AI-052',

  // Usage errors (060-069)
  USAGE_LIMIT_EXCEEDED: 'NS-AI-060',
  DAILY_LIMIT_EXCEEDED: 'NS-AI-061',

  // Content filter errors (070-079)
  CONTENT_FILTERED: 'NS-AI-070',
  INAPPROPRIATE_CONTENT: 'NS-AI-071',

  // Generic AI errors (090-099)
  AI_UNKNOWN: 'NS-AI-099',
} as const

// ============================================================================
// Database Errors (NS-DB-XXX)
// ============================================================================

export const DatabaseErrorCodes = {
  // Query errors (001-009)
  QUERY_FAILED: 'NS-DB-001',
  QUERY_TIMEOUT: 'NS-DB-002',
  QUERY_INVALID: 'NS-DB-003',

  // Insert errors (010-019)
  INSERT_FAILED: 'NS-DB-010',
  DUPLICATE_RECORD: 'NS-DB-011',
  CONSTRAINT_VIOLATION: 'NS-DB-012',
  FOREIGN_KEY_VIOLATION: 'NS-DB-013',

  // Update errors (020-029)
  UPDATE_FAILED: 'NS-DB-020',
  RECORD_NOT_FOUND: 'NS-DB-021',
  CONCURRENT_UPDATE: 'NS-DB-022',

  // Delete errors (030-039)
  DELETE_FAILED: 'NS-DB-030',
  DELETE_CONSTRAINT: 'NS-DB-031',

  // RLS/Permission errors (040-049)
  RLS_ACCESS_DENIED: 'NS-DB-040',
  RLS_POLICY_VIOLATION: 'NS-DB-041',

  // Connection errors (050-059)
  CONNECTION_FAILED: 'NS-DB-050',
  CONNECTION_TIMEOUT: 'NS-DB-051',
  POOL_EXHAUSTED: 'NS-DB-052',

  // Transaction errors (060-069)
  TRANSACTION_FAILED: 'NS-DB-060',
  TRANSACTION_ROLLBACK: 'NS-DB-061',
  DEADLOCK: 'NS-DB-062',

  // Generic database errors (090-099)
  DATABASE_UNKNOWN: 'NS-DB-099',
} as const

// ============================================================================
// Gamification Errors (NS-GAME-XXX)
// ============================================================================

export const GamificationErrorCodes = {
  // XP errors (001-009)
  XP_GRANT_FAILED: 'NS-GAME-001',
  XP_FETCH_FAILED: 'NS-GAME-002',
  XP_INVALID_AMOUNT: 'NS-GAME-003',

  // Streak errors (010-019)
  STREAK_UPDATE_FAILED: 'NS-GAME-010',
  STREAK_FETCH_FAILED: 'NS-GAME-011',

  // Achievement errors (020-029)
  ACHIEVEMENT_GRANT_FAILED: 'NS-GAME-020',
  ACHIEVEMENT_NOT_FOUND: 'NS-GAME-021',
  ACHIEVEMENT_ALREADY_EARNED: 'NS-GAME-022',

  // Leaderboard errors (030-039)
  LEADERBOARD_FETCH_FAILED: 'NS-GAME-030',
  LEADERBOARD_UPDATE_FAILED: 'NS-GAME-031',

  // Generic gamification errors (090-099)
  GAMIFICATION_UNKNOWN: 'NS-GAME-099',
} as const

// ============================================================================
// Analytics Errors (NS-ANLYT-XXX)
// ============================================================================

export const AnalyticsErrorCodes = {
  // Event tracking errors (001-009)
  EVENT_TRACK_FAILED: 'NS-ANLYT-001',
  EVENT_INVALID: 'NS-ANLYT-002',
  EVENT_BATCH_FAILED: 'NS-ANLYT-003',

  // Session errors (010-019)
  ANLYT_SESSION_CREATE_FAILED: 'NS-ANLYT-010',
  ANLYT_SESSION_END_FAILED: 'NS-ANLYT-011',
  ANLYT_SESSION_NOT_FOUND: 'NS-ANLYT-012',

  // Admin analytics errors (020-029)
  OVERVIEW_FETCH_FAILED: 'NS-ANLYT-020',
  PAGE_VIEWS_FETCH_FAILED: 'NS-ANLYT-021',
  EVENTS_FETCH_FAILED: 'NS-ANLYT-022',
  ENGAGEMENT_FETCH_FAILED: 'NS-ANLYT-023',
  FUNNELS_FETCH_FAILED: 'NS-ANLYT-024',
  JOURNEYS_FETCH_FAILED: 'NS-ANLYT-025',
  CLICKS_FETCH_FAILED: 'NS-ANLYT-026',
  ERRORS_FETCH_FAILED: 'NS-ANLYT-027',
  SESSIONS_FETCH_FAILED: 'NS-ANLYT-028',

  // Export errors (030-039)
  EXPORT_FAILED: 'NS-ANLYT-030',
  EXPORT_TOO_LARGE: 'NS-ANLYT-031',
  EXPORT_INVALID_FORMAT: 'NS-ANLYT-032',

  // Aggregation errors (040-049)
  AGGREGATION_FAILED: 'NS-ANLYT-040',

  // Admin analytics errors (050-059)
  ADMIN_ANALYTICS_FETCH_FAILED: 'NS-ANLYT-050',
  ADMIN_ANALYTICS_EXPORT_FAILED: 'NS-ANLYT-051',

  // Generic analytics errors (090-099)
  ANALYTICS_UNKNOWN: 'NS-ANLYT-099',
} as const

// ============================================================================
// User Profile Errors (NS-USER-XXX)
// ============================================================================

export const UserErrorCodes = {
  // Profile errors (001-009)
  PROFILE_NOT_FOUND: 'NS-USER-001',
  PROFILE_FETCH_FAILED: 'NS-USER-002',
  PROFILE_UPDATE_FAILED: 'NS-USER-003',
  PROFILE_CREATE_FAILED: 'NS-USER-004',

  // Mastery errors (010-019)
  USER_MASTERY_FETCH_FAILED: 'NS-USER-010',
  USER_MASTERY_UPDATE_FAILED: 'NS-USER-011',

  // Knowledge gaps errors (020-029)
  GAPS_FETCH_FAILED: 'NS-USER-020',
  GAPS_UPDATE_FAILED: 'NS-USER-021',

  // Preferences errors (030-039)
  PREFERENCES_FETCH_FAILED: 'NS-USER-030',
  PREFERENCES_UPDATE_FAILED: 'NS-USER-031',
  PREFERENCES_INVALID: 'NS-USER-032',

  // Refinement errors (040-049)
  REFINEMENT_FAILED: 'NS-USER-040',

  // Stats errors (050-059)
  STATS_FETCH_FAILED: 'NS-USER-050',

  // Recommendations errors (060-069)
  RECOMMENDATIONS_FAILED: 'NS-USER-060',

  // Weak areas errors (070-079)
  WEAK_AREAS_FAILED: 'NS-USER-070',

  // Generic user errors (090-099)
  USER_UNKNOWN: 'NS-USER-099',
} as const

// ============================================================================
// Client-Side Errors (NS-CLIENT-XXX)
// ============================================================================

export const ClientErrorCodes = {
  // Network errors (001-009)
  NETWORK_REQUEST_FAILED: 'NS-CLIENT-001',
  NETWORK_TIMEOUT: 'NS-CLIENT-002',
  NETWORK_OFFLINE: 'NS-CLIENT-003',
  NETWORK_SLOW: 'NS-CLIENT-004',
  SSL_ERROR: 'NS-CLIENT-005',

  // Parsing errors (010-019)
  JSON_PARSE_ERROR: 'NS-CLIENT-010',
  CORS_BLOCKED: 'NS-CLIENT-011',
  INVALID_RESPONSE: 'NS-CLIENT-012',

  // JavaScript errors (020-029)
  JS_ERROR: 'NS-CLIENT-020',
  PROMISE_REJECTION: 'NS-CLIENT-021',
  RENDER_ERROR: 'NS-CLIENT-022',
  HYDRATION_ERROR: 'NS-CLIENT-023',

  // Form errors (030-039)
  FORM_VALIDATION_FAILED: 'NS-CLIENT-030',
  FORM_SUBMIT_FAILED: 'NS-CLIENT-031',

  // Media errors (040-049)
  IMAGE_LOAD_FAILED: 'NS-CLIENT-040',
  AUDIO_LOAD_FAILED: 'NS-CLIENT-041',
  VIDEO_LOAD_FAILED: 'NS-CLIENT-042',

  // Storage errors (050-059)
  LOCALSTORAGE_QUOTA: 'NS-CLIENT-050',
  LOCALSTORAGE_ACCESS: 'NS-CLIENT-051',
  INDEXEDDB_ERROR: 'NS-CLIENT-052',

  // Service worker errors (060-069)
  SW_REGISTRATION_FAILED: 'NS-CLIENT-060',
  SW_UPDATE_FAILED: 'NS-CLIENT-061',
  CACHE_ERROR: 'NS-CLIENT-062',

  // PWA errors (070-079)
  INSTALL_PROMPT_FAILED: 'NS-CLIENT-070',

  // Browser compatibility errors (080-089)
  BROWSER_NOT_SUPPORTED: 'NS-CLIENT-080',
  FEATURE_NOT_SUPPORTED: 'NS-CLIENT-081',

  // Generic client errors (090-099)
  CLIENT_UNKNOWN: 'NS-CLIENT-099',
} as const

// ============================================================================
// Rate Limiting Errors (NS-RATE-XXX)
// ============================================================================

export const RateLimitErrorCodes = {
  // Per-user limits (001-009)
  USER_RATE_LIMITED: 'NS-RATE-001',
  USER_DAILY_LIMIT: 'NS-RATE-002',
  USER_CONCURRENT_LIMIT: 'NS-RATE-003',

  // Per-IP limits (010-019)
  IP_RATE_LIMITED: 'NS-RATE-010',
  IP_BANNED: 'NS-RATE-011',

  // Per-endpoint limits (020-029)
  ENDPOINT_RATE_LIMITED: 'NS-RATE-020',

  // AI-specific limits (030-039)
  AI_RATE_LIMITED: 'NS-RATE-030',
  AI_DAILY_LIMIT: 'NS-RATE-031',
  AI_CONCURRENT_LIMIT: 'NS-RATE-032',

  // Generic rate limit errors (090-099)
  RATE_LIMIT_UNKNOWN: 'NS-RATE-099',
} as const

// ============================================================================
// Validation Errors (NS-VAL-XXX)
// ============================================================================

export const ValidationErrorCodes = {
  // Body validation (001-009)
  BODY_REQUIRED: 'NS-VAL-001',
  BODY_INVALID_JSON: 'NS-VAL-002',
  BODY_TOO_LARGE: 'NS-VAL-003',

  // Field validation (010-019)
  FIELD_REQUIRED: 'NS-VAL-010',
  FIELD_INVALID_TYPE: 'NS-VAL-011',
  FIELD_TOO_SHORT: 'NS-VAL-012',
  FIELD_TOO_LONG: 'NS-VAL-013',
  FIELD_INVALID_FORMAT: 'NS-VAL-014',
  FIELD_OUT_OF_RANGE: 'NS-VAL-015',

  // Param validation (020-029)
  PARAM_REQUIRED: 'NS-VAL-020',
  PARAM_INVALID: 'NS-VAL-021',

  // Query validation (030-039)
  VAL_QUERY_INVALID: 'NS-VAL-030',
  QUERY_PARAM_REQUIRED: 'NS-VAL-031',

  // HTTP method errors (040-049)
  METHOD_NOT_ALLOWED: 'NS-VAL-040',

  // Generic validation errors (090-099)
  VALIDATION_UNKNOWN: 'NS-VAL-099',
} as const

// ============================================================================
// External Service Errors (NS-EXT-XXX)
// ============================================================================

export const ExternalErrorCodes = {
  // Supabase errors (001-009)
  SUPABASE_CONNECTION_FAILED: 'NS-EXT-001',
  SUPABASE_AUTH_ERROR: 'NS-EXT-002',
  SUPABASE_STORAGE_ERROR: 'NS-EXT-003',
  SUPABASE_REALTIME_ERROR: 'NS-EXT-004',

  // Unsplash errors (010-019)
  UNSPLASH_FETCH_FAILED: 'NS-EXT-010',
  UNSPLASH_RATE_LIMITED: 'NS-EXT-011',

  // Resend (email) errors (020-029)
  RESEND_SEND_FAILED: 'NS-EXT-020',
  RESEND_RATE_LIMITED: 'NS-EXT-021',
  RESEND_INVALID_EMAIL: 'NS-EXT-022',

  // Cron job errors (030-039)
  CRON_SECRET_MISSING: 'NS-EXT-030',
  CRON_AUTH_FAILED: 'NS-EXT-031',

  // Generic external errors (090-099)
  EXTERNAL_UNKNOWN: 'NS-EXT-099',
} as const

// ============================================================================
// Monitoring Errors (NS-MON-XXX)
// ============================================================================

export const MonitoringErrorCodes = {
  // Error reporting (001-009)
  ERROR_REPORT_FAILED: 'NS-MON-001',

  // Metrics (010-019)
  METRICS_SEND_FAILED: 'NS-MON-010',

  // Generic monitoring errors (090-099)
  MONITORING_UNKNOWN: 'NS-MON-099',
} as const

// ============================================================================
// Adaptive Learning Errors (NS-ADPT-XXX)
// ============================================================================

export const AdaptiveErrorCodes = {
  // State errors (001-009)
  STATE_FETCH_FAILED: 'NS-ADPT-001',
  STATE_UPDATE_FAILED: 'NS-ADPT-002',

  // Record errors (010-019)
  RECORD_FAILED: 'NS-ADPT-010',

  // Reset errors (020-029)
  RESET_FAILED: 'NS-ADPT-020',

  // Generic adaptive errors (090-099)
  ADAPTIVE_UNKNOWN: 'NS-ADPT-099',
} as const

// ============================================================================
// Help Errors (NS-HELP-XXX)
// ============================================================================

export const HelpErrorCodes = {
  // Chat help errors (001-009)
  HELP_CHAT_FAILED: 'NS-HELP-001',

  // Generic help errors (090-099)
  HELP_UNKNOWN: 'NS-HELP-099',
} as const

// ============================================================================
// Performance Errors (NS-PERF-XXX)
// ============================================================================

export const PerformanceErrorCodes = {
  // Steps errors (001-009)
  STEPS_FETCH_FAILED: 'NS-PERF-001',

  // Generic performance errors (090-099)
  PERFORMANCE_UNKNOWN: 'NS-PERF-099',
} as const

// ============================================================================
// Combined Error Codes Type
// ============================================================================

export const ErrorCodes = {
  ...AuthErrorCodes,
  ...CourseErrorCodes,
  ...HomeworkErrorCodes,
  ...PracticeErrorCodes,
  ...ExamErrorCodes,
  ...UploadErrorCodes,
  ...DocumentErrorCodes,
  ...AIErrorCodes,
  ...DatabaseErrorCodes,
  ...GamificationErrorCodes,
  ...AnalyticsErrorCodes,
  ...UserErrorCodes,
  ...ClientErrorCodes,
  ...RateLimitErrorCodes,
  ...ValidationErrorCodes,
  ...ExternalErrorCodes,
  ...MonitoringErrorCodes,
  ...AdaptiveErrorCodes,
  ...HelpErrorCodes,
  ...PerformanceErrorCodes,
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ============================================================================
// Error Code Categories (for filtering/grouping)
// ============================================================================

export type ErrorCategory =
  | 'AUTH'
  | 'CRS'
  | 'HW'
  | 'PRAC'
  | 'EXAM'
  | 'UPL'
  | 'DOC'
  | 'AI'
  | 'DB'
  | 'GAME'
  | 'ANLYT'
  | 'USER'
  | 'CLIENT'
  | 'RATE'
  | 'VAL'
  | 'EXT'
  | 'MON'
  | 'ADPT'
  | 'HELP'
  | 'PERF'

/**
 * Extracts the category from an error code
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory {
  const match = code.match(/^NS-([A-Z]+)-\d{3}$/)
  if (match) {
    return match[1] as ErrorCategory
  }
  throw new Error(`Invalid error code format: ${code}`)
}

/**
 * Checks if an error code is from a specific category
 */
export function isErrorCategory(code: ErrorCode, category: ErrorCategory): boolean {
  return code.startsWith(`NS-${category}-`)
}
