/**
 * User-friendly error messages for all error codes
 *
 * These messages are designed to be:
 * - Clear and understandable for end users
 * - Actionable where possible
 * - Avoiding technical jargon
 */

import { type ErrorCode, ErrorCodes } from './codes'

// ============================================================================
// Error Messages Map
// ============================================================================

export const ErrorMessages: Record<ErrorCode, string> = {
  // ============================================================================
  // Authentication Errors (NS-AUTH-XXX)
  // ============================================================================

  // Login errors
  [ErrorCodes.INVALID_CREDENTIALS]: 'Email or password is incorrect. Please check and try again.',
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Please check your inbox and verify your email to continue.',
  [ErrorCodes.ACCOUNT_DISABLED]: 'Your account has been disabled. Please contact support.',
  [ErrorCodes.ACCOUNT_LOCKED]: 'Your account has been temporarily locked due to too many failed attempts. Please try again later.',
  [ErrorCodes.ACCOUNT_NOT_FOUND]: 'No account found with this email address.',
  [ErrorCodes.PROVIDER_ERROR]: 'There was a problem with the login provider. Please try again.',

  // Signup errors
  [ErrorCodes.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists. Try logging in instead.',
  [ErrorCodes.PASSWORD_TOO_WEAK]: 'Password is too weak. Use at least 8 characters with letters and numbers.',
  [ErrorCodes.INVALID_EMAIL_FORMAT]: 'Please enter a valid email address.',
  [ErrorCodes.SIGNUP_DISABLED]: 'New account registration is currently disabled.',
  [ErrorCodes.TERMS_NOT_ACCEPTED]: 'Please accept the terms and conditions to continue.',

  // Password reset errors
  [ErrorCodes.RESET_RATE_LIMITED]: 'Too many password reset requests. Please wait a few minutes and try again.',
  [ErrorCodes.RESET_TOKEN_EXPIRED]: 'This password reset link has expired. Please request a new one.',
  [ErrorCodes.RESET_TOKEN_INVALID]: 'This password reset link is invalid. Please request a new one.',
  [ErrorCodes.RESET_EMAIL_NOT_FOUND]: 'No account found with this email address.',

  // Session errors
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCodes.SESSION_INVALID]: 'Your session is invalid. Please log in again.',
  [ErrorCodes.SESSION_NOT_FOUND]: 'Session not found. Please log in.',
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCodes.REFRESH_TOKEN_INVALID]: 'Your session is invalid. Please log in again.',

  // OAuth errors
  [ErrorCodes.OAUTH_PROVIDER_ERROR]: 'There was a problem connecting with the login provider. Please try again.',
  [ErrorCodes.OAUTH_CALLBACK_ERROR]: 'Login was not completed. Please try again.',
  [ErrorCodes.OAUTH_STATE_MISMATCH]: 'Login verification failed. Please try again.',
  [ErrorCodes.OAUTH_EMAIL_MISMATCH]: 'The email from this provider does not match your account.',

  // MFA errors
  [ErrorCodes.MFA_REQUIRED]: 'Two-factor authentication is required. Please enter your code.',
  [ErrorCodes.MFA_INVALID_CODE]: 'Invalid verification code. Please try again.',
  [ErrorCodes.MFA_EXPIRED]: 'Verification code has expired. Please request a new one.',

  // Generic auth errors
  [ErrorCodes.UNAUTHORIZED]: 'Please log in to continue.',
  [ErrorCodes.FORBIDDEN]: "You don't have permission to access this.",
  [ErrorCodes.AUTH_UNKNOWN]: 'Authentication failed. Please try again.',

  // ============================================================================
  // Course Errors (NS-CRS-XXX)
  // ============================================================================

  // Fetch errors
  [ErrorCodes.COURSE_NOT_FOUND]: 'This course could not be found. It may have been deleted.',
  [ErrorCodes.COURSE_ACCESS_DENIED]: "You don't have access to this course.",
  [ErrorCodes.COURSE_FETCH_FAILED]: 'Could not load the course. Please try again.',
  [ErrorCodes.COURSE_LIST_FAILED]: 'Could not load your courses. Please try again.',
  [ErrorCodes.COURSE_CORRUPTED]: 'This course data appears to be corrupted. Please contact support.',

  // Create errors
  [ErrorCodes.COURSE_CREATE_FAILED]: 'Could not create the course. Please try again.',
  [ErrorCodes.COURSE_ALREADY_EXISTS]: 'A course with this title already exists.',
  [ErrorCodes.COURSE_TITLE_REQUIRED]: 'Please provide a title for the course.',
  [ErrorCodes.COURSE_CONTENT_REQUIRED]: 'Please provide content for the course.',
  [ErrorCodes.COURSE_LIMIT_EXCEEDED]: "You've reached the maximum number of courses. Delete some to create new ones.",

  // Update errors
  [ErrorCodes.COURSE_UPDATE_FAILED]: 'Could not update the course. Please try again.',
  [ErrorCodes.COURSE_VERSION_CONFLICT]: 'This course was updated by someone else. Please refresh and try again.',
  [ErrorCodes.COURSE_LOCKED]: 'This course is currently being edited. Please try again later.',

  // Delete errors
  [ErrorCodes.COURSE_DELETE_FAILED]: 'Could not delete the course. Please try again.',
  [ErrorCodes.COURSE_HAS_DEPENDENCIES]: 'This course cannot be deleted because it has associated data.',

  // Progress errors
  [ErrorCodes.PROGRESS_SAVE_FAILED]: 'Could not save your progress. Please try again.',
  [ErrorCodes.PROGRESS_FETCH_FAILED]: 'Could not load your progress. Please try again.',
  [ErrorCodes.PROGRESS_INVALID_STATE]: 'Invalid progress state. Please refresh and try again.',
  [ErrorCodes.LESSON_NOT_FOUND]: 'This lesson could not be found.',
  [ErrorCodes.LESSON_ALREADY_COMPLETE]: 'You have already completed this lesson.',
  [ErrorCodes.LESSON_ACCESS_DENIED]: 'You need to complete previous lessons first.',

  // Generation errors
  [ErrorCodes.GENERATION_FAILED]: 'Could not generate the course. Please try again.',
  [ErrorCodes.GENERATION_TIMEOUT]: 'Course generation is taking too long. Please try again with simpler content.',
  [ErrorCodes.GENERATION_NO_CONTENT]: 'Could not find enough content to generate a course from your notes.',
  [ErrorCodes.GENERATION_INVALID_TOPIC]: 'Could not understand the topic. Please try uploading clearer images.',
  [ErrorCodes.GENERATION_CONTINUE_FAILED]: 'Could not continue generating the course. Please try again.',

  // Mastery errors
  [ErrorCodes.MASTERY_FETCH_FAILED]: 'Could not load mastery data. Please try again.',
  [ErrorCodes.MASTERY_UPDATE_FAILED]: 'Could not update mastery data. Please try again.',

  // Generic course errors
  [ErrorCodes.COURSE_UNKNOWN]: 'An error occurred with the course. Please try again.',

  // ============================================================================
  // Homework Help Errors (NS-HW-XXX)
  // ============================================================================

  // Session errors (HW_ prefix)
  [ErrorCodes.HW_SESSION_NOT_FOUND]: 'This homework session could not be found.',
  [ErrorCodes.HW_SESSION_CREATE_FAILED]: 'Could not start a homework session. Please try again.',
  [ErrorCodes.HW_SESSION_EXPIRED]: 'This homework session has expired. Please start a new one.',
  [ErrorCodes.HW_SESSION_ACCESS_DENIED]: "You don't have access to this homework session.",
  [ErrorCodes.HW_SESSION_INVALID_STATE]: 'This homework session is in an invalid state.',

  // Chat errors
  [ErrorCodes.CHAT_FAILED]: 'Could not send your message. Please try again.',
  [ErrorCodes.CHAT_STREAM_ERROR]: 'Lost connection while receiving response. Please try again.',
  [ErrorCodes.CHAT_MESSAGE_TOO_LONG]: 'Your message is too long. Please shorten it.',
  [ErrorCodes.CHAT_RATE_LIMITED]: 'Too many messages. Please wait a moment before sending more.',

  // Hint errors
  [ErrorCodes.HINT_GENERATION_FAILED]: 'Could not generate a hint. Please try again.',
  [ErrorCodes.HINT_NOT_AVAILABLE]: 'No hints are available for this question.',
  [ErrorCodes.HINT_LIMIT_EXCEEDED]: "You've used all available hints for this question.",

  // Check errors
  [ErrorCodes.CHECK_NOT_FOUND]: 'This homework check could not be found.',
  [ErrorCodes.CHECK_CREATE_FAILED]: 'Could not start checking your homework. Please try again.',
  [ErrorCodes.CHECK_PROCESSING_FAILED]: 'Could not process your homework. Please try again.',
  [ErrorCodes.CHECK_INVALID_INPUT]: 'Please provide valid homework content to check.',

  // Generic homework errors
  [ErrorCodes.HOMEWORK_UNKNOWN]: 'An error occurred with homework help. Please try again.',

  // ============================================================================
  // Practice & SRS Errors (NS-PRAC-XXX)
  // ============================================================================

  // Session errors (PRAC_ prefix)
  [ErrorCodes.PRAC_SESSION_NOT_FOUND]: 'This practice session could not be found.',
  [ErrorCodes.PRAC_SESSION_CREATE_FAILED]: 'Could not start a practice session. Please try again.',
  [ErrorCodes.PRAC_SESSION_EXPIRED]: 'This practice session has expired. Please start a new one.',
  [ErrorCodes.PRAC_SESSION_COMPLETE]: 'This practice session is already complete.',
  [ErrorCodes.PRAC_SESSION_ACCESS_DENIED]: "You don't have access to this practice session.",

  // Question errors
  [ErrorCodes.QUESTION_GENERATION_FAILED]: 'Could not generate questions. Please try again.',
  [ErrorCodes.QUESTION_NOT_FOUND]: 'This question could not be found.',
  [ErrorCodes.QUESTION_INVALID_TYPE]: 'Invalid question type.',
  [ErrorCodes.QUESTIONS_EXHAUSTED]: 'No more questions available. Great job completing them all!',

  // Answer errors
  [ErrorCodes.ANSWER_SUBMIT_FAILED]: 'Could not submit your answer. Please try again.',
  [ErrorCodes.ANSWER_EVALUATION_FAILED]: 'Could not evaluate your answer. Please try again.',
  [ErrorCodes.ANSWER_INVALID_FORMAT]: 'Invalid answer format. Please check your answer.',
  [ErrorCodes.ANSWER_ALREADY_SUBMITTED]: 'You have already submitted an answer for this question.',

  // SRS errors
  [ErrorCodes.SRS_CARD_NOT_FOUND]: 'This review card could not be found.',
  [ErrorCodes.SRS_CARD_GENERATION_FAILED]: 'Could not generate review cards. Please try again.',
  [ErrorCodes.SRS_REVIEW_FAILED]: 'Could not record your review. Please try again.',
  [ErrorCodes.SRS_SETTINGS_INVALID]: 'Invalid review settings. Please check and try again.',
  [ErrorCodes.SRS_COURSE_NOT_FOUND]: 'Course not found for review cards.',

  // Deep practice errors
  [ErrorCodes.DEEP_PRACTICE_FAILED]: 'Could not start deep practice. Please try again.',
  [ErrorCodes.DEEP_PRACTICE_NO_STEPS]: 'No practice steps available for this topic.',

  // Log errors
  [ErrorCodes.LOG_SAVE_FAILED]: 'Could not save your practice log. Please try again.',
  [ErrorCodes.LOG_FETCH_FAILED]: 'Could not load your practice history. Please try again.',

  // Generic practice errors
  [ErrorCodes.PRACTICE_UNKNOWN]: 'An error occurred with practice. Please try again.',

  // ============================================================================
  // Exam Errors (NS-EXAM-XXX)
  // ============================================================================

  // Fetch errors
  [ErrorCodes.EXAM_NOT_FOUND]: 'This exam could not be found.',
  [ErrorCodes.EXAM_ACCESS_DENIED]: "You don't have access to this exam.",
  [ErrorCodes.EXAM_FETCH_FAILED]: 'Could not load the exam. Please try again.',
  [ErrorCodes.EXAM_LIST_FAILED]: 'Could not load exams. Please try again.',

  // Create/Generate errors
  [ErrorCodes.EXAM_CREATE_FAILED]: 'Could not create the exam. Please try again.',
  [ErrorCodes.EXAM_GENERATION_FAILED]: 'Could not generate exam questions. Please try again.',
  [ErrorCodes.EXAM_INVALID_CONFIG]: 'Invalid exam configuration. Please check the settings.',
  [ErrorCodes.EXAM_TOO_FEW_QUESTIONS]: 'Not enough content to generate the requested number of questions.',

  // Submit errors
  [ErrorCodes.SUBMIT_FAILED]: 'Could not submit your exam. Please try again.',
  [ErrorCodes.SUBMIT_TIMEOUT]: 'Exam submission timed out. Please try again.',
  [ErrorCodes.SUBMIT_ALREADY_SUBMITTED]: 'You have already submitted this exam.',
  [ErrorCodes.SUBMIT_INCOMPLETE]: 'Please answer all required questions before submitting.',

  // Grading errors
  [ErrorCodes.GRADING_FAILED]: 'Could not grade your exam. Please try again.',
  [ErrorCodes.GRADING_TIMEOUT]: 'Grading is taking too long. Please try again.',
  [ErrorCodes.GRADING_INVALID_ANSWER]: 'Invalid answer format for grading.',

  // Past exam errors
  [ErrorCodes.PAST_EXAM_NOT_FOUND]: 'This past exam could not be found.',
  [ErrorCodes.PAST_EXAM_ANALYSIS_FAILED]: 'Could not analyze the past exam. Please try again.',
  [ErrorCodes.PAST_EXAM_UPLOAD_FAILED]: 'Could not upload the past exam. Please try again.',

  // Generic exam errors
  [ErrorCodes.EXAM_UNKNOWN]: 'An error occurred with the exam. Please try again.',

  // ============================================================================
  // Upload Errors (NS-UPL-XXX)
  // ============================================================================

  // File validation errors
  [ErrorCodes.FILE_TOO_LARGE]: 'File is too large. Maximum size is 10MB for images and 20MB for documents.',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Invalid file type. Please upload images (JPEG, PNG) or documents (PDF, DOCX, PPTX).',
  [ErrorCodes.NO_FILES_PROVIDED]: 'Please select at least one file to upload.',
  [ErrorCodes.TOO_MANY_FILES]: 'Too many files. Please upload fewer files at once.',
  [ErrorCodes.FILE_CORRUPTED]: 'This file appears to be corrupted. Please try a different file.',
  [ErrorCodes.FILE_EMPTY]: 'This file appears to be empty. Please try a different file.',

  // Storage errors
  [ErrorCodes.STORAGE_UPLOAD_FAILED]: 'Could not upload the file. Please try again.',
  [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: 'Storage is full. Please delete some files to free up space.',
  [ErrorCodes.STORAGE_BUCKET_NOT_FOUND]: 'Storage not available. Please contact support.',
  [ErrorCodes.STORAGE_ACCESS_DENIED]: 'Could not access storage. Please try again.',
  [ErrorCodes.STORAGE_DELETE_FAILED]: 'Could not delete the file. Please try again.',

  // Image fetch errors
  [ErrorCodes.IMAGE_FETCH_FAILED]: 'Could not load the image. Please try again.',
  [ErrorCodes.IMAGE_FETCH_TIMEOUT]: 'Image loading timed out. Please try again.',
  [ErrorCodes.IMAGE_URL_INVALID]: 'Invalid image URL.',
  [ErrorCodes.IMAGE_FORBIDDEN]: 'Could not access this image.',

  // Signed URL errors
  [ErrorCodes.SIGNED_URL_FAILED]: 'Could not generate download link. Please try again.',
  [ErrorCodes.SIGNED_URL_EXPIRED]: 'Download link has expired. Please refresh and try again.',

  // Generic upload errors
  [ErrorCodes.UPLOAD_UNKNOWN]: 'An error occurred during upload. Please try again.',

  // ============================================================================
  // Document Processing Errors (NS-DOC-XXX)
  // ============================================================================

  // Processing errors
  [ErrorCodes.PROCESSING_FAILED]: 'Could not process the document. Please try a different file.',
  [ErrorCodes.PROCESSING_TIMEOUT]: 'Document processing timed out. Please try a smaller file.',
  [ErrorCodes.UNSUPPORTED_FORMAT]: 'This document format is not supported. Please use PDF, DOCX, or PPTX.',
  [ErrorCodes.CONTENT_EXTRACTION_FAILED]: 'Could not extract content from the document. Please try taking photos instead.',

  // PDF errors
  [ErrorCodes.PDF_PASSWORD_PROTECTED]: 'This PDF is password-protected. Please remove the password and try again.',
  [ErrorCodes.PDF_CORRUPTED]: 'This PDF appears to be corrupted. Please try a different file.',
  [ErrorCodes.PDF_TOO_MANY_PAGES]: 'This PDF has too many pages. Please upload a shorter document.',
  [ErrorCodes.PDF_SCANNED_DOCUMENT]: 'This appears to be a scanned document. For best results, take photos of each page instead.',
  [ErrorCodes.PDF_EMPTY]: 'This PDF appears to be empty.',

  // Office document errors
  [ErrorCodes.DOCX_PROCESSING_FAILED]: 'Could not process the Word document. Please try a different file.',
  [ErrorCodes.PPTX_PROCESSING_FAILED]: 'Could not process the PowerPoint file. Please try a different file.',
  [ErrorCodes.OFFICE_FILE_CORRUPTED]: 'This Office file appears to be corrupted.',

  // Image extraction errors
  [ErrorCodes.IMAGE_EXTRACTION_FAILED]: 'Could not extract images from the document.',
  [ErrorCodes.NO_READABLE_CONTENT]: 'No readable content found in this document. Please try a different file.',

  // Generic document errors
  [ErrorCodes.DOCUMENT_UNKNOWN]: 'An error occurred processing the document. Please try again.',

  // ============================================================================
  // AI Service Errors (NS-AI-XXX)
  // ============================================================================

  // API availability errors
  [ErrorCodes.API_UNAVAILABLE]: 'Our AI service is temporarily unavailable. Please try again in a few minutes.',
  [ErrorCodes.API_RATE_LIMITED]: "We're receiving many requests right now. Please wait a moment and try again.",
  [ErrorCodes.API_TIMEOUT]: 'This is taking longer than expected. Please try again.',
  [ErrorCodes.API_OVERLOADED]: 'Our AI is experiencing high demand. Please try again in a few minutes.',
  [ErrorCodes.API_KEY_INVALID]: 'AI service configuration error. Please contact support.',
  [ErrorCodes.API_KEY_NOT_CONFIGURED]: 'AI service is not configured. Please contact support.',

  // Response parsing errors
  [ErrorCodes.RESPONSE_PARSE_FAILED]: 'Could not understand the AI response. Please try again.',
  [ErrorCodes.RESPONSE_MISSING_FIELDS]: 'Incomplete response from AI. Please try again.',
  [ErrorCodes.RESPONSE_INVALID_FORMAT]: 'Invalid response format from AI. Please try again.',
  [ErrorCodes.RESPONSE_EMPTY]: 'No response received from AI. Please try again.',

  // Vision/Image errors
  [ErrorCodes.IMAGE_UNREADABLE]: 'Could not read this image clearly. Please take a clearer photo with good lighting.',
  [ErrorCodes.IMAGE_NO_CONTENT]: 'No readable content found in this image. Please try a different image.',
  [ErrorCodes.IMAGE_TOO_SMALL]: 'This image is too small. Please use a higher resolution image.',
  [ErrorCodes.IMAGE_TOO_LARGE]: 'This image is too large. Please use a smaller image.',
  [ErrorCodes.IMAGE_UNSUPPORTED]: 'This image format is not supported. Please use JPEG or PNG.',

  // Generation errors (AI_ prefix)
  [ErrorCodes.AI_COURSE_GENERATION_FAILED]: 'Could not generate the course. Please try again with different content.',
  [ErrorCodes.AI_QUESTION_GENERATION_FAILED]: 'Could not generate questions. Please try again.',
  [ErrorCodes.EVALUATION_FAILED]: 'Could not evaluate your response. Please try again.',
  [ErrorCodes.CONCEPT_EXTRACTION_FAILED]: 'Could not extract concepts from your notes. Please try again.',
  [ErrorCodes.FEEDBACK_GENERATION_FAILED]: 'Could not generate feedback. Please try again.',

  // Streaming errors
  [ErrorCodes.STREAM_CONNECTION_LOST]: 'Connection lost while receiving response. Please try again.',
  [ErrorCodes.STREAM_PARSE_ERROR]: 'Error processing streamed response. Please try again.',
  [ErrorCodes.STREAM_TIMEOUT]: 'Streaming connection timed out. Please try again.',

  // Usage errors
  [ErrorCodes.USAGE_LIMIT_EXCEEDED]: 'You have reached your usage limit. Please try again later or upgrade your plan.',
  [ErrorCodes.DAILY_LIMIT_EXCEEDED]: 'You have reached your daily limit. Please try again tomorrow.',

  // Content filter errors
  [ErrorCodes.CONTENT_FILTERED]: 'This content could not be processed. Please try different content.',
  [ErrorCodes.INAPPROPRIATE_CONTENT]: 'This content is not appropriate for processing.',

  // Generic AI errors
  [ErrorCodes.AI_UNKNOWN]: 'An error occurred with our AI service. Please try again.',

  // ============================================================================
  // Database Errors (NS-DB-XXX)
  // ============================================================================

  // Query errors
  [ErrorCodes.QUERY_FAILED]: 'Could not retrieve data. Please try again.',
  [ErrorCodes.QUERY_TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCodes.QUERY_INVALID]: 'Invalid request. Please try again.',

  // Insert errors
  [ErrorCodes.INSERT_FAILED]: 'Could not save data. Please try again.',
  [ErrorCodes.DUPLICATE_RECORD]: 'This already exists.',
  [ErrorCodes.CONSTRAINT_VIOLATION]: 'Could not save due to data constraints. Please check your input.',
  [ErrorCodes.FOREIGN_KEY_VIOLATION]: 'Referenced item does not exist.',

  // Update errors
  [ErrorCodes.UPDATE_FAILED]: 'Could not update data. Please try again.',
  [ErrorCodes.RECORD_NOT_FOUND]: 'The item you are trying to update could not be found.',
  [ErrorCodes.CONCURRENT_UPDATE]: 'This item was modified by another user. Please refresh and try again.',

  // Delete errors
  [ErrorCodes.DELETE_FAILED]: 'Could not delete data. Please try again.',
  [ErrorCodes.DELETE_CONSTRAINT]: 'Cannot delete this item because other items depend on it.',

  // RLS/Permission errors
  [ErrorCodes.RLS_ACCESS_DENIED]: "You don't have permission to access this data.",
  [ErrorCodes.RLS_POLICY_VIOLATION]: "You don't have permission to perform this action.",

  // Connection errors
  [ErrorCodes.CONNECTION_FAILED]: 'Could not connect to the database. Please try again.',
  [ErrorCodes.CONNECTION_TIMEOUT]: 'Database connection timed out. Please try again.',
  [ErrorCodes.POOL_EXHAUSTED]: 'Server is busy. Please try again in a moment.',

  // Transaction errors
  [ErrorCodes.TRANSACTION_FAILED]: 'Operation failed. Please try again.',
  [ErrorCodes.TRANSACTION_ROLLBACK]: 'Operation was rolled back. Please try again.',
  [ErrorCodes.DEADLOCK]: 'Server conflict. Please try again.',

  // Generic database errors
  [ErrorCodes.DATABASE_UNKNOWN]: 'A database error occurred. Please try again.',

  // ============================================================================
  // Gamification Errors (NS-GAME-XXX)
  // ============================================================================

  // XP errors
  [ErrorCodes.XP_GRANT_FAILED]: 'Could not award XP. Please try again.',
  [ErrorCodes.XP_FETCH_FAILED]: 'Could not load XP data. Please try again.',
  [ErrorCodes.XP_INVALID_AMOUNT]: 'Invalid XP amount.',

  // Streak errors
  [ErrorCodes.STREAK_UPDATE_FAILED]: 'Could not update streak. Please try again.',
  [ErrorCodes.STREAK_FETCH_FAILED]: 'Could not load streak data. Please try again.',

  // Achievement errors
  [ErrorCodes.ACHIEVEMENT_GRANT_FAILED]: 'Could not grant achievement. Please try again.',
  [ErrorCodes.ACHIEVEMENT_NOT_FOUND]: 'Achievement not found.',
  [ErrorCodes.ACHIEVEMENT_ALREADY_EARNED]: 'You have already earned this achievement.',

  // Leaderboard errors
  [ErrorCodes.LEADERBOARD_FETCH_FAILED]: 'Could not load leaderboard. Please try again.',
  [ErrorCodes.LEADERBOARD_UPDATE_FAILED]: 'Could not update leaderboard. Please try again.',

  // Generic gamification errors
  [ErrorCodes.GAMIFICATION_UNKNOWN]: 'A gamification error occurred. Please try again.',

  // ============================================================================
  // Analytics Errors (NS-ANLYT-XXX)
  // ============================================================================

  // Event tracking errors
  [ErrorCodes.EVENT_TRACK_FAILED]: 'Could not track event.',
  [ErrorCodes.EVENT_INVALID]: 'Invalid event data.',
  [ErrorCodes.EVENT_BATCH_FAILED]: 'Could not process event batch.',

  // Session errors (ANLYT_ prefix)
  [ErrorCodes.ANLYT_SESSION_CREATE_FAILED]: 'Could not create analytics session.',
  [ErrorCodes.ANLYT_SESSION_END_FAILED]: 'Could not end analytics session.',
  [ErrorCodes.ANLYT_SESSION_NOT_FOUND]: 'Analytics session not found.',

  // Admin analytics errors
  [ErrorCodes.OVERVIEW_FETCH_FAILED]: 'Could not load analytics overview. Please try again.',
  [ErrorCodes.PAGE_VIEWS_FETCH_FAILED]: 'Could not load page views. Please try again.',
  [ErrorCodes.EVENTS_FETCH_FAILED]: 'Could not load events. Please try again.',
  [ErrorCodes.ENGAGEMENT_FETCH_FAILED]: 'Could not load engagement data. Please try again.',
  [ErrorCodes.FUNNELS_FETCH_FAILED]: 'Could not load funnel data. Please try again.',
  [ErrorCodes.JOURNEYS_FETCH_FAILED]: 'Could not load journey data. Please try again.',
  [ErrorCodes.CLICKS_FETCH_FAILED]: 'Could not load click data. Please try again.',
  [ErrorCodes.ERRORS_FETCH_FAILED]: 'Could not load error data. Please try again.',
  [ErrorCodes.SESSIONS_FETCH_FAILED]: 'Could not load session data. Please try again.',

  // Export errors
  [ErrorCodes.EXPORT_FAILED]: 'Could not export data. Please try again.',
  [ErrorCodes.EXPORT_TOO_LARGE]: 'Export data is too large. Please narrow your selection.',
  [ErrorCodes.EXPORT_INVALID_FORMAT]: 'Invalid export format.',

  // Aggregation errors
  [ErrorCodes.AGGREGATION_FAILED]: 'Could not aggregate analytics data.',

  // Admin analytics errors
  [ErrorCodes.ADMIN_ANALYTICS_FETCH_FAILED]: 'Failed to fetch admin analytics data.',
  [ErrorCodes.ADMIN_ANALYTICS_EXPORT_FAILED]: 'Failed to export analytics data.',

  // Generic analytics errors
  [ErrorCodes.ANALYTICS_UNKNOWN]: 'An analytics error occurred. Please try again.',

  // ============================================================================
  // User Profile Errors (NS-USER-XXX)
  // ============================================================================

  // Profile errors
  [ErrorCodes.PROFILE_NOT_FOUND]: 'User profile not found.',
  [ErrorCodes.PROFILE_FETCH_FAILED]: 'Could not load your profile. Please try again.',
  [ErrorCodes.PROFILE_UPDATE_FAILED]: 'Could not update your profile. Please try again.',
  [ErrorCodes.PROFILE_CREATE_FAILED]: 'Could not create your profile. Please try again.',

  // Mastery errors (USER_ prefix)
  [ErrorCodes.USER_MASTERY_FETCH_FAILED]: 'Could not load mastery data. Please try again.',
  [ErrorCodes.USER_MASTERY_UPDATE_FAILED]: 'Could not update mastery data. Please try again.',

  // Knowledge gaps errors
  [ErrorCodes.GAPS_FETCH_FAILED]: 'Could not load knowledge gaps. Please try again.',
  [ErrorCodes.GAPS_UPDATE_FAILED]: 'Could not update knowledge gaps. Please try again.',

  // Preferences errors
  [ErrorCodes.PREFERENCES_FETCH_FAILED]: 'Could not load preferences. Please try again.',
  [ErrorCodes.PREFERENCES_UPDATE_FAILED]: 'Could not save preferences. Please try again.',
  [ErrorCodes.PREFERENCES_INVALID]: 'Invalid preference values.',

  // Refinement errors
  [ErrorCodes.REFINEMENT_FAILED]: 'Could not process profile refinement. Please try again.',

  // Stats errors
  [ErrorCodes.STATS_FETCH_FAILED]: 'Could not load statistics. Please try again.',

  // Recommendations errors
  [ErrorCodes.RECOMMENDATIONS_FAILED]: 'Could not generate recommendations. Please try again.',

  // Weak areas errors
  [ErrorCodes.WEAK_AREAS_FAILED]: 'Could not identify weak areas. Please try again.',

  // Generic user errors
  [ErrorCodes.USER_UNKNOWN]: 'A user profile error occurred. Please try again.',

  // ============================================================================
  // Client-Side Errors (NS-CLIENT-XXX)
  // ============================================================================

  // Network errors
  [ErrorCodes.NETWORK_REQUEST_FAILED]: 'Connection error. Please check your internet and try again.',
  [ErrorCodes.NETWORK_TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCodes.NETWORK_OFFLINE]: 'You appear to be offline. Please check your connection.',
  [ErrorCodes.NETWORK_SLOW]: 'Your connection seems slow. Please wait or try again later.',
  [ErrorCodes.SSL_ERROR]: 'Secure connection error. Please try again.',

  // Parsing errors
  [ErrorCodes.JSON_PARSE_ERROR]: 'Server error. Please try again.',
  [ErrorCodes.CORS_BLOCKED]: 'Connection blocked. Please try again.',
  [ErrorCodes.INVALID_RESPONSE]: 'Invalid server response. Please try again.',

  // JavaScript errors
  [ErrorCodes.JS_ERROR]: 'An error occurred. Please refresh the page.',
  [ErrorCodes.PROMISE_REJECTION]: 'An error occurred. Please try again.',
  [ErrorCodes.RENDER_ERROR]: 'Display error. Please refresh the page.',
  [ErrorCodes.HYDRATION_ERROR]: 'Page loading error. Please refresh.',

  // Form errors
  [ErrorCodes.FORM_VALIDATION_FAILED]: 'Please check the form for errors.',
  [ErrorCodes.FORM_SUBMIT_FAILED]: 'Could not submit the form. Please try again.',

  // Media errors
  [ErrorCodes.IMAGE_LOAD_FAILED]: 'Could not load image. Please try again.',
  [ErrorCodes.AUDIO_LOAD_FAILED]: 'Could not load audio. Please try again.',
  [ErrorCodes.VIDEO_LOAD_FAILED]: 'Could not load video. Please try again.',

  // Storage errors
  [ErrorCodes.LOCALSTORAGE_QUOTA]: 'Browser storage is full. Please clear some space.',
  [ErrorCodes.LOCALSTORAGE_ACCESS]: 'Cannot access browser storage. Please check your settings.',
  [ErrorCodes.INDEXEDDB_ERROR]: 'Browser database error. Please try refreshing.',

  // Service worker errors
  [ErrorCodes.SW_REGISTRATION_FAILED]: 'Could not enable offline support.',
  [ErrorCodes.SW_UPDATE_FAILED]: 'Could not update the app. Please refresh.',
  [ErrorCodes.CACHE_ERROR]: 'Caching error. Please refresh the page.',

  // PWA errors
  [ErrorCodes.INSTALL_PROMPT_FAILED]: 'Could not show install prompt.',

  // Browser compatibility errors
  [ErrorCodes.BROWSER_NOT_SUPPORTED]: 'Your browser is not supported. Please use a modern browser.',
  [ErrorCodes.FEATURE_NOT_SUPPORTED]: 'This feature is not supported in your browser.',

  // Generic client errors
  [ErrorCodes.CLIENT_UNKNOWN]: 'An error occurred. Please refresh the page.',

  // ============================================================================
  // Rate Limiting Errors (NS-RATE-XXX)
  // ============================================================================

  // Per-user limits
  [ErrorCodes.USER_RATE_LIMITED]: "You're making too many requests. Please wait a moment.",
  [ErrorCodes.USER_DAILY_LIMIT]: "You've reached your daily limit. Please try again tomorrow.",
  [ErrorCodes.USER_CONCURRENT_LIMIT]: 'Please wait for your current request to complete.',

  // Per-IP limits
  [ErrorCodes.IP_RATE_LIMITED]: 'Too many requests from your network. Please wait.',
  [ErrorCodes.IP_BANNED]: 'Access temporarily blocked. Please try again later.',

  // Per-endpoint limits
  [ErrorCodes.ENDPOINT_RATE_LIMITED]: 'This feature is temporarily limited. Please wait.',

  // AI-specific limits
  [ErrorCodes.AI_RATE_LIMITED]: 'AI requests are limited. Please wait a moment.',
  [ErrorCodes.AI_DAILY_LIMIT]: "You've reached your daily AI usage limit.",
  [ErrorCodes.AI_CONCURRENT_LIMIT]: 'Please wait for your current AI request to complete.',

  // Generic rate limit errors
  [ErrorCodes.RATE_LIMIT_UNKNOWN]: 'Rate limited. Please wait and try again.',

  // ============================================================================
  // Validation Errors (NS-VAL-XXX)
  // ============================================================================

  // Body validation
  [ErrorCodes.BODY_REQUIRED]: 'Request body is required.',
  [ErrorCodes.BODY_INVALID_JSON]: 'Invalid request format.',
  [ErrorCodes.BODY_TOO_LARGE]: 'Request is too large.',

  // Field validation
  [ErrorCodes.FIELD_REQUIRED]: 'This field is required.',
  [ErrorCodes.FIELD_INVALID_TYPE]: 'Invalid field type.',
  [ErrorCodes.FIELD_TOO_SHORT]: 'This field is too short.',
  [ErrorCodes.FIELD_TOO_LONG]: 'This field is too long.',
  [ErrorCodes.FIELD_INVALID_FORMAT]: 'Invalid format.',
  [ErrorCodes.FIELD_OUT_OF_RANGE]: 'Value is out of range.',

  // Param validation
  [ErrorCodes.PARAM_REQUIRED]: 'Required parameter is missing.',
  [ErrorCodes.PARAM_INVALID]: 'Invalid parameter value.',

  // Query validation
  [ErrorCodes.VAL_QUERY_INVALID]: 'Invalid query parameters.',
  [ErrorCodes.QUERY_PARAM_REQUIRED]: 'Required query parameter is missing.',

  // HTTP method errors
  [ErrorCodes.METHOD_NOT_ALLOWED]: 'This HTTP method is not allowed for this endpoint.',

  // Generic validation errors
  [ErrorCodes.VALIDATION_UNKNOWN]: 'Validation error. Please check your input.',

  // ============================================================================
  // External Service Errors (NS-EXT-XXX)
  // ============================================================================

  // Supabase errors
  [ErrorCodes.SUPABASE_CONNECTION_FAILED]: 'Could not connect to the server. Please try again.',
  [ErrorCodes.SUPABASE_AUTH_ERROR]: 'Authentication service error. Please try again.',
  [ErrorCodes.SUPABASE_STORAGE_ERROR]: 'Storage service error. Please try again.',
  [ErrorCodes.SUPABASE_REALTIME_ERROR]: 'Real-time service error. Please refresh.',

  // Unsplash errors
  [ErrorCodes.UNSPLASH_FETCH_FAILED]: 'Could not load images. Please try again.',
  [ErrorCodes.UNSPLASH_RATE_LIMITED]: 'Image service is busy. Please try again later.',

  // Resend (email) errors
  [ErrorCodes.RESEND_SEND_FAILED]: 'Could not send email. Please try again.',
  [ErrorCodes.RESEND_RATE_LIMITED]: 'Too many emails sent. Please wait.',
  [ErrorCodes.RESEND_INVALID_EMAIL]: 'Invalid email address.',

  // Cron job errors
  [ErrorCodes.CRON_SECRET_MISSING]: 'Cron job secret is not configured.',
  [ErrorCodes.CRON_AUTH_FAILED]: 'Cron job authentication failed.',

  // Generic external errors
  [ErrorCodes.EXTERNAL_UNKNOWN]: 'External service error. Please try again.',

  // ============================================================================
  // Monitoring Errors (NS-MON-XXX)
  // ============================================================================

  // Error reporting
  [ErrorCodes.ERROR_REPORT_FAILED]: 'Could not report error.',

  // Metrics
  [ErrorCodes.METRICS_SEND_FAILED]: 'Could not send metrics.',

  // Generic monitoring errors
  [ErrorCodes.MONITORING_UNKNOWN]: 'Monitoring error.',

  // ============================================================================
  // Adaptive Learning Errors (NS-ADPT-XXX)
  // ============================================================================

  // State errors
  [ErrorCodes.STATE_FETCH_FAILED]: 'Could not load learning state. Please try again.',
  [ErrorCodes.STATE_UPDATE_FAILED]: 'Could not update learning state. Please try again.',

  // Record errors
  [ErrorCodes.RECORD_FAILED]: 'Could not record learning activity. Please try again.',

  // Reset errors
  [ErrorCodes.RESET_FAILED]: 'Could not reset learning state. Please try again.',

  // Generic adaptive errors
  [ErrorCodes.ADAPTIVE_UNKNOWN]: 'Adaptive learning error. Please try again.',

  // ============================================================================
  // Help Errors (NS-HELP-XXX)
  // ============================================================================

  // Chat help errors
  [ErrorCodes.HELP_CHAT_FAILED]: 'Could not get help response. Please try again.',

  // Generic help errors
  [ErrorCodes.HELP_UNKNOWN]: 'Help service error. Please try again.',

  // ============================================================================
  // Performance Errors (NS-PERF-XXX)
  // ============================================================================

  // Steps errors
  [ErrorCodes.STEPS_FETCH_FAILED]: 'Could not load performance data. Please try again.',

  // Generic performance errors
  [ErrorCodes.PERFORMANCE_UNKNOWN]: 'Performance service error. Please try again.',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the user-friendly message for an error code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ErrorMessages[code] || 'An unexpected error occurred. Please try again.'
}

/**
 * Get error message with code for support reference
 */
export function getErrorMessageWithCode(code: ErrorCode): string {
  const message = getErrorMessage(code)
  return `${message} (${code})`
}
