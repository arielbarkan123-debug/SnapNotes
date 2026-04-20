/**
 * Generate Word document (Hebrew, RTL) from 01-investor-questions.md
 * Output: docs/legal/01-investor-questions.docx
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
  PageOrientation, PageBreak,
} from 'docx'

const FONT = 'Arial'
const BLACK = '000000'
const GRAY_BORDER = 'CCCCCC'
const LIGHT_BLUE = 'D5E8F0'
const LIGHT_GRAY = 'F2F2F2'

// Helper: Hebrew/RTL paragraph
const rtlP = (children, opts = {}) => new Paragraph({
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { after: 120, ...(opts.spacing || {}) },
  ...opts,
  children: Array.isArray(children) ? children : [children],
})

// Helper: plain text run
const T = (text, opts = {}) => new TextRun({ text, font: FONT, rightToLeft: true, ...opts })
// Helper: English/code (LTR even inside RTL paragraph)
const TL = (text, opts = {}) => new TextRun({ text, font: FONT, rightToLeft: false, ...opts })
// Helper: bold Hebrew
const B = (text, opts = {}) => T(text, { bold: true, ...opts })
// Helper: code/monospace
const C = (text, opts = {}) => new TextRun({ text, font: 'Consolas', rightToLeft: false, ...opts })

// Helper: heading
const H = (level, text) => new Paragraph({
  heading: level,
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text, font: FONT, bold: true, rightToLeft: true })],
})

// Helper: bullet
const bullet = (runs) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { after: 60 },
  children: Array.isArray(runs) ? runs : [runs],
})

// Helper: table cell (RTL)
const cellBorders = () => {
  const b = { style: BorderStyle.SINGLE, size: 4, color: GRAY_BORDER }
  return { top: b, bottom: b, left: b, right: b }
}
const cell = (text, opts = {}) => {
  const isHeader = opts.header === true
  const width = opts.width || 3120
  const runs = Array.isArray(text) ? text : [text]
  return new TableCell({
    borders: cellBorders(),
    width: { size: width, type: WidthType.DXA },
    shading: isHeader ? { fill: LIGHT_BLUE, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      children: runs.map(r => typeof r === 'string' ? T(r, { bold: isHeader }) : r),
    })],
  })
}

// Helper: table from 2D array with header row
// cols: array of widths summing to ~9360
const makeTable = (rows, cols) => {
  const tableRows = rows.map((row, idx) => new TableRow({
    children: row.map((content, i) => cell(content, { header: idx === 0, width: cols[i] })),
  }))
  return new Table({
    width: { size: cols.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: cols,
    rows: tableRows,
  })
}

// Helper: horizontal separator paragraph
const hr = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '888888', space: 6 } },
  spacing: { before: 120, after: 240 },
  children: [],
})

// =============================================================================
// Build the document
// =============================================================================

const children = []

// Title
children.push(new Paragraph({
  heading: HeadingLevel.TITLE,
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { after: 200 },
  children: [new TextRun({ text: 'מענה לשאלות המשקיעים — X+1 (NoteSnap)', font: FONT, bold: true, size: 40, rightToLeft: true })],
}))

children.push(rtlP([B('תאריך הכנה: '), T('15 באפריל 2026')]))
children.push(rtlP([B('מטרה: '), T('מענה ישיר לשאלת המשקיעים בנושא כלים ומידע במערכת.')]))
children.push(hr())

// =============================================================================
// Section א — Tools
// =============================================================================
children.push(H(HeadingLevel.HEADING_1, 'א. באילו כלים המערכת משתמשת היום'))

children.push(H(HeadingLevel.HEADING_2, 'תשתית ופריסה'))
children.push(makeTable([
  ['כלי', 'שימוש במערכת'],
  [[TL('Vercel', { bold: true })], 'אחסון ופריסה של האפליקציה; הרצת serverless functions; הרצת משימות מתוזמנות (cron jobs)'],
  [[TL('Supabase', { bold: true })], 'בסיס נתונים (PostgreSQL), אימות משתמשים (email/password), אחסון קבצים (Storage)'],
], [2340, 7020]))

children.push(H(HeadingLevel.HEADING_2, 'שירותי AI ועיבוד תוכן'))
children.push(makeTable([
  ['כלי', 'שימוש במערכת'],
  [[TL('Anthropic (Claude API)', { bold: true })], 'יצירת קורסים מהחומרים שהמשתמש מעלה, מערכת תרגול חכמה, עזרה בשיעורי בית, יצירת שאלות ומבחנים, יצירת דיאגרמות'],
  [[TL('Recraft V3', { bold: true })], 'יצירת דיאגרמות ואיורים חינוכיים (דו-ממד ותלת-ממד) ע"י AI'],
  [[TL('Google Generative AI (Gemini)', { bold: true })], 'יצירת תמונות כיסוי לקורסים (מנגנון גיבוי)'],
  [[TL('E2B', { bold: true })], 'הרצת קוד LaTeX ו-Python ב-sandbox מבודד לצורך קומפילציית דיאגרמות מורכבות'],
], [2340, 7020]))

children.push(H(HeadingLevel.HEADING_2, 'שירותי תוכן חיצוניים (חיפוש / מאגרי מדיה)'))
children.push(makeTable([
  ['כלי', 'שימוש במערכת'],
  [[TL('YouTube Data API v3', { bold: true })], 'חיפוש סרטונים חינוכיים להעשרת מדריכי לימוד'],
  [[TL('Unsplash API', { bold: true })], 'חיפוש תמונות סטוק לכיסויי קורסים'],
  [[TL('QuickLaTeX', { bold: true })], 'רינדור נוסחאות מתמטיות כ-PNG להצגה מהירה'],
], [2340, 7020]))

children.push(H(HeadingLevel.HEADING_2, 'תקשורת עם המשתמש'))
children.push(makeTable([
  ['כלי', 'שימוש במערכת'],
  [[TL('Resend', { bold: true })], 'כל המיילים הטרנזקציונליים: מיילי ברוך הבא, איפוס סיסמה, דוחות התקדמות שבועיים להורים, מיילי "נאדג\'" (תזכורות)'],
], [2340, 7020]))

children.push(H(HeadingLevel.HEADING_2, 'אנליטיקה ותשתית תומכת'))
children.push(makeTable([
  ['כלי', 'שימוש במערכת'],
  [[TL('PostHog', { bold: true })], 'מעקב אירועים, ניתוח התנהגות משתמשים, feature flags'],
  [[TL('Upstash Redis', { bold: true })], 'Rate limiting — הגבלת קצב קריאות API למניעת שימוש לרעה'],
], [2340, 7020]))

children.push(H(HeadingLevel.HEADING_2, 'מה לא בשימוש (חשוב לציין במפורש)'))
children.push(bullet([B('אין מעבדי תשלום '), T('(Stripe, PayPal וכו\') — המוצר בחינם כרגע')]))
children.push(bullet([B('אין Sentry או כלי ניטור תקלות חיצוני '), T('— שגיאות נשמרות בטבלאות פנימיות')]))
children.push(bullet([B('אין OpenAI '), T('— המודל היחיד לעיבוד תוכן משתמש הוא Claude של Anthropic')]))
children.push(bullet([B('אין OAuth עם Google/Apple '), T('— אימות רק email+password')]))
children.push(bullet([B('אין אינטגרציות עם מערכות בית-ספריות '), T('(Clever, ClassLink, Google Classroom)')]))
children.push(bullet([B('אין SMS / Push Notifications')]))
children.push(bullet([B('אין OCR חיצוני '), T('— עיבוד PDF/PPTX/DOCX מקומי עם ספריות ('), TL('mammoth, pptxjs'), T(')')]))
children.push(hr())

// =============================================================================
// Section ב — Data
// =============================================================================
children.push(H(HeadingLevel.HEADING_1, 'ב. איזה מידע נשמר במערכת'))
children.push(rtlP(T('המענה מחולק לפי הקטגוריות שציינתם.')))

// 1. Name
children.push(H(HeadingLevel.HEADING_3, '1. שם'))
children.push(bullet(T('נאסף ב-signup (שדה "שם מלא")')))
children.push(bullet([T('נשמר ב-Supabase Auth ('), C('auth.users'), T(' — שדה '), C('user_metadata'), T(')')]))
children.push(bullet(T('מופיע במיילים ובאפליקציה')))

// 2. Email
children.push(H(HeadingLevel.HEADING_3, '2. אימייל'))
children.push(bullet(T('נאסף ב-signup')))
children.push(bullet([T('נשמר ב-Supabase Auth ('), C('auth.users.email'), T(') '), B('בפורמט טקסט רגיל (לא מוצפן)')]))
children.push(bullet(T('משמש לאימות ולתקשורת')))
children.push(bullet([B('אימייל הורה (אופציונלי) '), T('— נאסף בהגדרות המשתמש, נשמר בטבלת '), C('user_learning_profile.parent_email'), T(' '), B('בפורמט טקסט רגיל')]))

// 3. Password
children.push(H(HeadingLevel.HEADING_3, '3. סיסמה'))
children.push(bullet(T('נאסף ב-signup (מינימום 8 תווים)')))
children.push(bullet([B('לעולם לא נשמר בטקסט רגיל '), T('— Supabase Auth שומר רק hash מוצפן (bcrypt)')]))
children.push(bullet(T('אנחנו (האפליקציה) לא רואים את הסיסמה בשום שלב; היא מטופלת לחלוטין ע"י Supabase')))
children.push(bullet([T('Session tokens (JWT) מנוהלים ע"י Supabase ונשמרים ב-cookies')]))

// 4. Uploaded files
children.push(H(HeadingLevel.HEADING_3, '4. קבצים שהמשתמש מעלה'))
children.push(rtlP(T('נשמרים ב-Supabase Storage, בארבעה buckets מופרדים:')))
children.push(makeTable([
  ['Bucket', 'סוגי קבצים', 'מגבלת גודל', 'שימוש'],
  [[C('documents')], 'PDF, DOCX, PPTX', 'עד 50MB', 'חומרי לימוד להפיכה לקורס'],
  [[C('notebook-images')], 'JPEG, PNG, WebP, HEIC, GIF', 'עד 10MB לקובץ, עד 10 קבצים', 'תמונות מחברת, צילומי שיעורי בית'],
  [[C('past-exams')], 'PDF, תמונות', '—', 'מבחני עבר להכנה'],
  [[C('diagram-steps')], 'PNG (נוצר ע"י המערכת)', '—', 'דיאגרמות שנרנדרו'],
], [1900, 2400, 1860, 3200]))
children.push(bullet([B('כל הקבצים פרטיים '), T('(לא נגישים ציבורית)')]))
children.push(bullet([T('שמות הקבצים מקודדים עם '), C('userId/courseId/filename')]))
children.push(bullet([B('אין TTL (מחיקה אוטומטית) '), T('— קבצים נשמרים ללא הגבלת זמן עד שהמשתמש מוחק ידנית או שהחשבון נמחק')]))

// 5. AI-generated content
children.push(H(HeadingLevel.HEADING_3, '5. תוכן שה-AI מייצר'))
children.push(bullet([B('קורסים שנוצרו: '), T('נשמרים בטבלת '), C('courses.generated_course'), T(' (JSONB) — כולל מבנה שיעורים, הסברים, שאלות')]))
children.push(bullet([B('דיאגרמות: '), T('נשמרות ב-'), C('diagram_cache'), T(' (כולל קוד TikZ, URL של תמונה שרונדרה)')]))
children.push(bullet([B('הסברים ב-AI tutor: '), T('נשמרים ב-'), C('help_requests.ai_response'), T(' ו-'), C('homework_turns.content')]))
children.push(bullet([B('פתרונות צעד-צעד (walkthroughs): '), T('נשמרים ב-'), C('walkthrough_sessions.walkthrough_steps'), T(' (JSONB)')]))
children.push(bullet([B('המלצות מותאמות אישית: '), T('נשמרות ב-'), C('recommendation_tracking')]))

// 6. Chats
children.push(H(HeadingLevel.HEADING_3, "6. צ'אטים"))
children.push(bullet([B('עזרה בשיעור ספציפי: '), T('טבלת '), C('help_requests'), T(' — שאלת המשתמש + תשובת ה-AI')]))
children.push(bullet([B('שיחות שיעורי בית (Socratic tutoring): '), T('טבלת '), C('homework_sessions.conversation'), T(' (JSONB עם השיחה המלאה) + טבלת '), C('homework_turns'), T(' (כל תור בנפרד כולל רמת רמז, כוונה פדגוגית, ותגי מטא)')]))
children.push(bullet([B("צ'אטים של תוכנית לימוד: "), C('study_plan_chat_messages')]))
children.push(bullet([B("צ'אטים של מדריך הכנה: "), C('prepare_chat_messages')]))
children.push(bullet([B('שאלות הבהרה בתוך walkthrough: '), C('walkthrough_step_chats')]))

// 7. Practice answers
children.push(H(HeadingLevel.HEADING_3, '7. תשובות לתרגולים'))
children.push(bullet([B('תשובות במבחנים: '), C('exam_questions.user_answer'), T(', '), C('is_correct'), T(', '), C('image_label_data')]))
children.push(bullet([B('תשובות בתרגול חוזר: '), C('practice_session_questions.user_answer'), T(', '), C('response_time_ms')]))
children.push(bullet([B('סטטיסטיקת שאלות בקורס: '), C('user_progress.questions_answered'), T(', '), C('questions_correct')]))
children.push(bullet([B('כרטיסי חזרה מרווחת (SRS): '), C('review_cards'), T(' — כולל צד קדמי, אחורי, stability, difficulty, lapses')]))
children.push(bullet([B('ביצוע לכל צעד: '), C('step_performance'), T(' — זמן על כל שלב, מספר ניסיונות, נכונות')]))
children.push(bullet([B('פערי ידע: '), C('user_knowledge_gaps'), T(' — מושגים שהמשתמש מתקשה בהם')]))
children.push(bullet([B('דפוסי טעויות: '), C('mistake_patterns')]))

// 8. Usage data
children.push(H(HeadingLevel.HEADING_3, '8. נתוני שימוש'))
children.push(rtlP([T("זו הקטגוריה הרחבה ביותר. "), B("המערכת אוספת מידע התנהגותי מפורט מאוד:")]))

children.push(rtlP([B('מידע על session (טבלת '), C('analytics_sessions'), B('):')]))
children.push(bullet(T('זמן התחלה וסיום, משך, device type, browser, OS, OS version')))
children.push(bullet(T('רזולוציית מסך, timezone, locale')))
children.push(bullet(T('UTM parameters (source, medium, campaign)')))
children.push(bullet(T('landing page, referrer')))

children.push(rtlP([B('מידע על דפים ('), C('analytics_page_views'), B('):')]))
children.push(bullet(T('כל דף שהמשתמש צפה בו')))
children.push(bullet(T('זמן בדף, scroll depth')))
children.push(bullet(T('דף כניסה/יציאה')))

children.push(rtlP([B('מידע על אירועים ('), C('analytics_events'), B('):')]))
children.push(bullet(T('כל קליק (כולל קואורדינטות X,Y)')))
children.push(bullet(T('element ID ו-class שעליו לחצו')))
children.push(bullet(T('properties מותאמים אישית לכל אירוע')))

children.push(rtlP([B('מידע על תקלות ('), C('analytics_errors'), T(', '), C('error_logs'), B('):')]))
children.push(bullet(T('סוג שגיאה, הודעת שגיאה, stack trace')))
children.push(bullet(T('API endpoint, HTTP status')))
children.push(bullet(T('user agent')))

children.push(rtlP([B('מידע על funnel והמרות ('), C('analytics_funnels'), B('):')]))
children.push(bullet(T('באיזה שלב משתמש נופל במסע (onboarding, יצירת קורס)')))

children.push(rtlP([B('מדדי gamification ('), C('user_gamification'), B('):')]))
children.push(bullet(T('XP, current level, current streak')))
children.push(bullet(T('lessons_completed, cards_reviewed, perfect_lessons')))

children.push(rtlP([B('פרופיל לימודי ('), C('user_learning_profile'), B('):')]))
children.push(bullet(T('רמת השכלה, כיתה, מערכת לימודים (ישראלית/אמריקאית/IB)')))
children.push(bullet(T('נושאים מועדפים, שפה')))
children.push(bullet(T('peak_performance_hour, most_active_day, hint_usage_rate')))
children.push(bullet([C('parent_email'), T(' (אם צוין)')]))

children.push(rtlP([B('מצב אלגוריתם SRS ('), C('user_srs_settings'), T(', '), C('user_performance_state'), B('):')]))
children.push(bullet(T('פרמטרי FSRS (זיכרון, קושי) לכל משתמש')))
children.push(bullet([T('רמת שליטה במושגים ('), C('user_concept_mastery'), T(')')]))

children.push(rtlP([B('התנהגות בפיצ\'רים ('), C('feature_affinity'), T(', '), C('explanation_engagement'), B('):')]))
children.push(bullet(T('באילו פיצ\'רים משתמש לעיתים קרובות')))
children.push(bullet(T('עם אילו סוגי הסברים הוא מתחבר יותר')))

children.push(hr())

// =============================================================================
// Summary table
// =============================================================================
children.push(H(HeadingLevel.HEADING_1, 'סיכום בטבלה אחת'))

children.push(makeTable([
  ['קטגוריה', 'נשמר במערכת?', 'מיקום'],
  ['שם', 'כן', 'Supabase Auth metadata'],
  ['אימייל', 'כן (טקסט רגיל)', [C('auth.users.email')]],
  ['סיסמה', 'רק hash (לא אנחנו מחזיקים את המקור)', [C('auth.users.encrypted_password')]],
  ['אימייל הורה', 'כן, אופציונלי (טקסט רגיל)', [C('user_learning_profile.parent_email')]],
  ['קבצים שהועלו', 'כן (ללא TTL)', 'Supabase Storage (4 buckets)'],
  ['תוכן AI שנוצר', 'כן', [C('courses.generated_course'), T(', '), C('diagram_cache'), T(', '), C('walkthrough_sessions')]],
  ["צ'אטים עם AI", 'כן', [C('help_requests'), T(', '), C('homework_sessions'), T(', '), C('homework_turns'), T(', '), C('study_plan_chat_messages')]],
  ['תשובות לתרגולים', 'כן', [C('exam_questions'), T(', '), C('practice_session_questions'), T(', '), C('review_cards'), T(', '), C('step_performance')]],
  ['נתוני שימוש / אנליטיקה', 'כן, מפורט מאוד', [T('9 טבלאות '), C('analytics_*'), T(' + טבלאות התנהגות נוספות')]],
], [2200, 2700, 4460]))

children.push(hr())

// =============================================================================
// Additional clarifications
// =============================================================================
children.push(H(HeadingLevel.HEADING_1, 'הבהרות נוספות שכדאי להיות מוכנים אליהן'))
children.push(rtlP(T('מתוך סקירה מעמיקה של הקוד, אלו פריטים שהמשקיעים עשויים לשאול עליהם או שכדאי לציין ביוזמתנו:')))

children.push(H(HeadingLevel.HEADING_3, '1. כתובות IP — לא נשמרות במסד הנתונים'))
children.push(bullet([B('אין עמודת '), C('ip_address'), B(' באף טבלה של המערכת '), T('(אומת: 0 מופעים בכל קבצי המיגרציה).')]))
children.push(bullet(T('כתובות IP משמשות זמנית בלבד:')))
children.push(bullet([T('ב-'), B('Upstash Redis '), T('לצורך rate limiting (מפתח קצר-חיים עם TTL שעוברת השעה)')]))
children.push(bullet([T('ב-'), B('Vercel server logs '), T('— אוטומטית, מחוץ לשליטתנו (ברירת מחדל של Vercel)')]))
children.push(bullet(T('ב-endpoint של שכחתי-סיסמה משמשת למניעת spam (זמנית)')))
children.push(bullet([B('זה תכתיב חוקי משמעותי '), T('— GDPR מסווג IP כ-PII, אך כיוון שאנחנו לא מחזיקים באופן מתמיד, החשיפה מוגבלת לספקים.')]))

children.push(H(HeadingLevel.HEADING_3, '2. מידע על מנהלי מערכת (admin_users)'))
children.push(bullet([T('טבלה נפרדת ('), C('admin_users'), T(') מחזיקה תפקידים פנימיים: '), C('admin'), T(' ו-'), C('super_admin'), T('.')]))
children.push(bullet(T('זה משמש לצוות הפנימי בלבד, לא לטיפולי משתמש קצה.')))

children.push(H(HeadingLevel.HEADING_3, '3. מידע גיאוגרפי משתמש'))
children.push(bullet([B('לא אוספים מיקום פיזי של משתמש. '), T('אין GPS, אין geolocation API.')]))
children.push(bullet([T('המידע הקרוב ביותר שיש: '), B('timezone + locale '), T('(נשמר ב-'), C('analytics_sessions'), T('), שמתקבלים מההגדרות של הדפדפן. זה proxy גס של מיקום, לא מיקום ממש.')]))

children.push(H(HeadingLevel.HEADING_3, '4. אוסף מידע על מכשירי משתמש'))
children.push(rtlP([T('בטבלת '), C('analytics_sessions'), T(' (לכל session):')]))
children.push(bullet([C('device_type'), T(' (desktop/tablet/mobile)')]))
children.push(bullet([C('browser'), T(' + '), C('browser_version')]))
children.push(bullet([C('os'), T(' + '), C('os_version')]))
children.push(bullet([C('screen_width'), T(', '), C('screen_height')]))
children.push(bullet([C('timezone'), T(', '), C('locale')]))
children.push(bullet([B('מה שמקובל להתייחס אליו כ-"device fingerprinting" '), T('— טכנית כן, אבל בסטנדרט שמקובל ב-web analytics.')]))

children.push(H(HeadingLevel.HEADING_3, '5. UTM ו-referrer'))
children.push(bullet([T('נשמרים: '), C('utm_source'), T(', '), C('utm_medium'), T(', '), C('utm_campaign'), T(', '), C('landing_page'), T(', '), C('referrer')]))
children.push(bullet(T('זה מאפשר לנו לדעת מאיזה קמפיין שיווקי המשתמש הגיע, ומאיזה דף חיצוני.')))

children.push(H(HeadingLevel.HEADING_3, '6. שימוש ב-PostHog — מה נשלח לשם ומה לא'))
children.push(bullet([B('נשלח ל-PostHog (שרתי US): '), T('אירועי התנהגות עם '), C('user_id'), T(', properties מותאמים, timestamps, session_id.')]))
children.push(bullet([B('לא נשלח ל-PostHog: '), T("תוכן קורסים, שיעורי בית, צ'אטים, תשובות, קבצים. תוכן נשמר רק ב-DB שלנו.")]))

children.push(H(HeadingLevel.HEADING_3, '7. ספקי תשתית פחות בולטים'))
children.push(bullet([B('Vercel cron jobs '), T('רצים יומית:')]))
children.push(bullet([C('aggregate-analytics'), T(' — יוצר metrics מצטברים')]))
children.push(bullet([C('send-weekly-reports'), T(' — שולח דוחות להורים')]))
children.push(bullet([C('cleanup-stuck-courses'), T(' — מנקה יצירות קורס שלא הסתיימו')]))
children.push(bullet([C('send-nudge-emails'), T(' — שולח תזכורות למשתמשים לא פעילים')]))

children.push(H(HeadingLevel.HEADING_3, '8. שפה ובינלאומיות'))
children.push(bullet([T('המערכת תומכת בעברית ואנגלית. Locale נשמר ב-'), C('NEXT_LOCALE'), T(' cookie ובטבלת '), C('user_learning_profile.language'), T('.')]))

children.push(H(HeadingLevel.HEADING_3, '9. התוכן שלקוחות עשויים לראות כרגיש'))
children.push(rtlP(T('מעבר למידע הפורמלי, יש סוגי תוכן ספציפיים שחשוב לציין שנשמרים:')))
children.push(bullet([B('תוכן חינוכי של תלמיד '), T('— יכול לחשוף יכולות, חולשות, ציונים')]))
children.push(bullet([B("שאלות בצ'אט "), T('— תלמידים מדי פעם שואלים שאלות אישיות בצ\'אט עם ה-AI tutor (קושי רגשי, נושאים רגישים)')]))
children.push(bullet([B('אירועים אקדמיים '), T('— תאריכי מבחנים והגשות ('), C('academic_events'), T(') — יכולים לחשוף איזה בית ספר')]))
children.push(bullet([B('רפלקציות '), T('('), C('reflections'), T(') — מה התלמיד חושב על עצמו ועל הלמידה שלו')]))

children.push(H(HeadingLevel.HEADING_3, '10. מה המשקיעים בוודאי לא ישאלו אבל כדאי להכיר'))
children.push(bullet([B('המידע לא מוצפן ברמת השדה '), T('(column-level encryption). מסתמכים על Supabase\'s at-rest encryption הכללית.')]))
children.push(bullet([B('אין EBS snapshots שלנו '), T('— גיבויים מטופלים ע"י Supabase.')]))
children.push(bullet([B('אין Data Loss Prevention (DLP) '), T('— שום מערכת שמזהה אם מישהו מעלה מידע מסווג.')]))
children.push(bullet([B('יש feedback שקיים '), T('— חלק מהמשתמשים מספקים דירוגים ותגובות ('), C('reflections'), T(', '), C('extraction_feedback'), T('). זה תוכן שלהם, שמור אצלנו.')]))

// =============================================================================
// Build and save
// =============================================================================

const doc = new Document({
  creator: 'X+1',
  title: 'מענה לשאלות המשקיעים — X+1',
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 40, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.RIGHT,
        style: { paragraph: { indent: { right: 360, hanging: 240 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
})

const outPath = path.resolve('docs/legal/01-investor-questions.docx')
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf)
  console.log('Wrote:', outPath)
  console.log('Size:', buf.length, 'bytes')
})
