/**
 * Generate Word document (Hebrew, RTL) from 02-legal-exposure-full.md
 * Output: docs/legal/02-legal-exposure-full.docx
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
} from 'docx'

const FONT = 'Arial'
const BLACK = '000000'
const GRAY_BORDER = 'CCCCCC'
const LIGHT_BLUE = 'D5E8F0'
const LIGHT_RED = 'FBE4E4'

const rtlP = (children, opts = {}) => new Paragraph({
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { after: 120, ...(opts.spacing || {}) },
  ...opts,
  children: Array.isArray(children) ? children : [children],
})

const T = (text, opts = {}) => new TextRun({ text, font: FONT, rightToLeft: true, ...opts })
const TL = (text, opts = {}) => new TextRun({ text, font: FONT, rightToLeft: false, ...opts })
const B = (text, opts = {}) => T(text, { bold: true, ...opts })
const C = (text, opts = {}) => new TextRun({ text, font: 'Consolas', rightToLeft: false, ...opts })

const H = (level, text) => new Paragraph({
  heading: level,
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text, font: FONT, bold: true, rightToLeft: true })],
})

const bullet = (runs) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { after: 60 },
  children: Array.isArray(runs) ? runs : [runs],
})

const cellBorders = () => {
  const b = { style: BorderStyle.SINGLE, size: 4, color: GRAY_BORDER }
  return { top: b, bottom: b, left: b, right: b }
}
const cell = (text, opts = {}) => {
  const isHeader = opts.header === true
  const width = opts.width || 3120
  const fill = opts.fill
  const runs = Array.isArray(text) ? text : [text]
  return new TableCell({
    borders: cellBorders(),
    width: { size: width, type: WidthType.DXA },
    shading: fill
      ? { fill, type: ShadingType.CLEAR, color: 'auto' }
      : isHeader
        ? { fill: LIGHT_BLUE, type: ShadingType.CLEAR, color: 'auto' }
        : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      children: runs.map(r => typeof r === 'string' ? T(r, { bold: isHeader }) : r),
    })],
  })
}

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

const hr = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '888888', space: 6 } },
  spacing: { before: 120, after: 240 },
  children: [],
})

// =============================================================================
const children = []

// Title
children.push(new Paragraph({
  heading: HeadingLevel.TITLE,
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { after: 200 },
  children: [new TextRun({ text: 'חשיפה משפטית מלאה — X+1 (NoteSnap)', font: FONT, bold: true, size: 40, rightToLeft: true })],
}))

children.push(rtlP([B('תאריך הכנה: '), T('15 באפריל 2026')]))
children.push(rtlP([B('מטרה: '), T('מסמך מקיף לקראת פגישה משפטית. כולל כל מה שמעבר לשאלת המשקיעים, שעלול להשפיע על חשיפה משפטית של החברה מול משתמשים.')]))
children.push(rtlP([B('הערה: '), T('המסמך מציג ממצאים עובדתיים בלבד מתוך הקוד. איננו ממליצים על פתרונות — ההחלטה מה לתקן ואיך, שייכת לעורך הדין.')]))
children.push(hr())

// ---- 1. Third-party data flows ----
children.push(H(HeadingLevel.HEADING_1, '1. זרימת מידע לצדדים שלישיים (מה יוצא מהמערכת, בנפרד ממה שנשמר)'))
children.push(rtlP(T('חלק מהמידע של המשתמש לא רק נשמר אצלנו אלא גם נשלח לספקים חיצוניים לצורך עיבוד. זו שאלה נפרדת מ"מה נשמר" ויש לה השלכות משפטיות שונות (הסכמי DPA, חוקי העברת מידע חוצה-גבולות).')))

children.push(makeTable([
  ['ספק', 'מה נשלח אליו', 'תדירות', 'חשיפה'],
  [[TL('Anthropic (Claude)', { bold: true })], "תוכן מסמכים שהמשתמש העלה, טקסט OCR של שיעורי בית, שאלות של המשתמש בצ'אט, תמונות שיעורי בית, התוכן של ה-prompts כולל \"context\" מהקורסים", 'כל אינטראקציה עם AI', [T('המשתמש לא יכול לבטל את זה — אין opt-out. לא בדקנו פורמלית אם יש '), C('X-Anthropic-No-Training'), T(' header או flag. '), B('מדיניות Anthropic הציבורית אומרת שהיא לא מאמנת על API input ללא הסכמה, אך הדבר לא מאומת טכנית מצדנו.')]],
  [[TL('Recraft V3', { bold: true })], 'prompts טקסטואליים המתארים דיאגרמה (לא מכילים PII ישירות, אך יכולים לכלול תוכן לימודי ששייך למשתמש)', 'בעת בקשת דיאגרמה', 'תמונות שנוצרות — זכויות יוצרים בהתאם ל-ToS של Recraft.'],
  [[TL('Google Generative AI (Gemini)', { bold: true })], 'כותרות קורסים ותיאוריהם (לא PII)', 'יצירת תמונת כיסוי', 'גיבוי בלבד; לא מופעל אם API key לא מוגדר.'],
  [[TL('E2B', { bold: true })], 'קוד LaTeX/TikZ, קוד Python, משתני מתמטיקה — כולם מהמשתמש או שנוצרו ע"י AI ממנו', 'בעת רינדור דיאגרמה מורכבת', 'הקוד רץ ב-sandbox אצל E2B. החברה אמריקאית.'],
  [[TL('Resend', { bold: true })], 'כתובות אימייל של משתמשים (וההורים שלהם), תוכן מיילים (דוחות התקדמות, שמות קורסים, ציונים)', 'משלוח מייל', [B('הדוחות השבועיים מכילים PII ומידע לימודי של תלמיד נשלח במייל לא-מוצפן להורה.')]],
  [[TL('PostHog', { bold: true })], [T('אירועי התנהגות עם '), C('user_id'), T(', properties, timestamps. '), B("לא שולחים תוכן קורסים או שיעורי בית.")], 'רציף', [T('שרתי PostHog ב-US ('), C('us.i.posthog.com'), T(').')]],
  [[TL('Upstash Redis', { bold: true })], 'מונים של rate limit לפי user_id/IP + timestamps', 'כל קריאת API', 'לא תוכן, רק מטא-דאטה.'],
  [[TL('Vercel', { bold: true })], 'כל traffic עובר דרכם — כולל logs של requests וresponses', 'רציף', 'Vercel רואה את כל ה-traffic של האפליקציה.'],
  [[TL('Supabase', { bold: true })], 'כל הנתונים של המשתמש (ראו מסמך ראשון)', 'רציף', 'לא "ספק חיצוני" במובן שאנחנו הלקוח, אלא התשתית המרכזית.'],
  [[TL('YouTube / Unsplash', { bold: true })], 'שאילתות חיפוש (נושאי שיעור)', 'כאשר יש חיפוש', 'לא PII.'],
  [[TL('QuickLaTeX', { bold: true })], 'קוד LaTeX של נוסחאות (לא PII)', 'רינדור נוסחאות', 'שירות צד שלישי ב-EU.'],
], [1600, 3200, 1600, 2960]))

children.push(H(HeadingLevel.HEADING_2, 'הדגשים לעורך הדין'))
children.push(bullet([B('כל תוכן שהמשתמש מעלה או כותב ב-AI עובר דרך Anthropic. '), T('זו נקודה מרכזית: מדובר בחברה אמריקאית, תחת חוק אמריקאי. יש לוודא:')]))
children.push(bullet([B('האם נדרש DPA (Data Processing Agreement) חתום עם Anthropic '), T('(בפרט לפי GDPR אם יש משתמשי EU, ולפי חוק הגנת הפרטיות הישראלי בתקנה 11).')]))
children.push(bullet([T('האם מדיניות Anthropic לגבי "no training on API data" מכוסה חוזית או רק פוליטית.')]))
children.push(bullet([B('מיילים עם PII של תלמידים נשלחים דרך Resend (חברה אמריקאית) להורים. '), T('צריך לוודא DPA.')]))
children.push(bullet([B('PostHog (US) מקבל user_id שלנו '), T('— אפשר למפות אותו בחזרה לאימייל דרך ה-DB שלנו. זה הופך את ה-user_id ל-pseudonymous ולא anonymous לצרכי GDPR.')]))
children.push(hr())

// ---- 2. Geographic ----
children.push(H(HeadingLevel.HEADING_1, '2. מיקום גיאוגרפי של המידע'))
children.push(makeTable([
  ['ספק', 'איפה הנתונים יושבים'],
  [[TL('Supabase', { bold: true })], [T('תלוי בהגדרת הפרויקט. '), B('יש לאמת'), T(' באיזה region נבחר בקונסול. ברירת המחדל בדרך כלל US-east.')]],
  [[TL('Vercel', { bold: true })], 'Edge network גלובלי; logs מרכזיים ב-US.'],
  [[TL('Anthropic', { bold: true })], 'US (api.anthropic.com).'],
  [[TL('Resend', { bold: true })], 'US (resend.com).'],
  [[TL('PostHog', { bold: true })], [T('US ('), C('us.i.posthog.com'), T(' — נראה בקוד).')]],
  [[TL('Upstash Redis', { bold: true })], [T('ניתן להגדרה; ברירת מחדל גלובלית. '), B('יש לאמת'), T(' באיזה region הפרויקט שלנו.')]],
  [[TL('E2B', { bold: true })], 'US (e2b.dev).'],
  [[TL('Recraft', { bold: true })], 'US.'],
], [2500, 6860]))

children.push(H(HeadingLevel.HEADING_2, 'חשיפה'))
children.push(bullet([T('אם יש משתמשים באיחוד האירופי — '), B('העברת מידע חוצה-גבולות ל-US דורשת או Standard Contractual Clauses (SCC) או Data Privacy Framework'), T('. לא ראינו הערכה זאת במסמכי החברה.')]))
children.push(bullet(T('בישראל — חוק הגנת הפרטיות מאפשר העברה ל-US עם הסתייגויות (תקנה 2(4) לתקנות העברת מידע). צריך לוודא שיש בסיס חוקי.')))
children.push(bullet([B('אין הפרדה של משתמשים ישראלים/EU/אמריקאים לפי region. '), T('כל המשתמשים יושבים באותו Supabase instance.')]))
children.push(hr())

// ---- 3. DPA ----
children.push(H(HeadingLevel.HEADING_1, '3. סטטוס Data Processing Agreements (DPA) — לא בדקנו'))
children.push(rtlP([T('לא נמצאו במאגר הקוד ראיות לחתימה על DPA עם הספקים הבאים. '), B('עורך הדין צריך לוודא'), T(' שחתומים DPA עם:')]))
for (const v of ['Supabase', 'Vercel', 'Anthropic', 'Resend', 'PostHog', 'Upstash Redis', 'E2B', 'Recraft', 'Google (Gemini, YouTube)']) {
  children.push(bullet([TL('☐ '), TL(v)]))
}
children.push(rtlP(T('רוב הספקים הגדולים מציעים DPA סטנדרטי בחשבון ה-enterprise שלהם, אך חשבונות חינמיים/סטארטר לעיתים לא מכוסים.')))
children.push(hr())

// ---- 4. Retention ----
children.push(H(HeadingLevel.HEADING_1, '4. שמירת מידע ומחיקה (Data Retention & Deletion)'))

children.push(H(HeadingLevel.HEADING_2, 'מה שנמצא'))
children.push(bullet([B('מחיקת קבצים אוטומטית: לא קיימת. '), T('קבצי משתמש ב-Supabase Storage נשמרים ללא הגבלת זמן עד מחיקה ידנית.')]))
children.push(bullet([B('מחיקת analytics אוטומטית: לא קיימת. '), T('כל ה-9 טבלאות האנליטיות נשמרות ללא הגבלת זמן.')]))
children.push(bullet([B('מחיקת logs אוטומטית: לא קיימת. '), C('error_logs'), T(' ו-'), C('analytics_errors'), T(' שומרות stack traces + user_id ללא TTL.')]))
children.push(bullet([B('מחיקת session tokens: '), T('מנוהלת ע"י Supabase (ברירת מחדל שלהם).')]))
children.push(bullet([B('Soft deletes: לא בשימוש. '), T('אין עמודת '), C('deleted_at'), T('; כל המחיקות הן hard deletes.')]))

children.push(H(HeadingLevel.HEADING_2, 'מחיקת חשבון משתמש — חשוב מאוד'))
children.push(bullet([B('אין endpoint למחיקה עצמית של חשבון בקוד '), T('(בדקנו — '), C('app/api/account/'), T(' לא קיים).')]))
children.push(bullet([T('בהגדרות יש כפתור "Delete Account" שדורש להקליד "DELETE", '), B('אך זה רק פותח mailto ל-'), C('support@xplus1.ai'), B(' — לא מוחק בפועל.')]))
children.push(bullet(T('ההודעה למשתמש אומרת: "Please contact support to delete your account".')))
children.push(bullet(T('מחיקה בפועל נעשית ידנית ע"י מנהל דרך הקונסול של Supabase.')))
children.push(bullet(T('אין SLA למשך הזמן עד מחיקה.')))

children.push(rtlP([B('השלכות משפטיות:')]))
children.push(bullet([B('GDPR Article 17 (זכות להישכח): '), T('מחייב "within one month" לעבד בקשת מחיקה. תהליך ידני עם mailto לא עומד בזה באופן מערכתי.')]))
children.push(bullet([B('חוק הגנת הפרטיות הישראלי (תיקון 13): '), T('דורש מחיקה לפי בקשה — התהליך הנוכחי אפשרי אך לא יעיל.')]))

children.push(H(HeadingLevel.HEADING_2, 'מחיקת קורס — טעון לב'))
children.push(bullet([T('Migration '), C('20260330'), T(' שינתה התנהגות: כאשר משתמש מוחק קורס, '), B('הנתונים התנהגותיים שקשורים אליו (lesson_progress, deep_practice_progress, user_performance_history, cheatsheets) לא נמחקים'), T(' — רק '), C('course_id'), T(' שלהם נהפך ל-NULL.')]))
children.push(bullet(T('כלומר, נתוני הלמידה של המשתמש נשמרים גם לאחר שהוא ביקש "למחוק את הקורס".')))
children.push(bullet([B('זה עשוי להיות ממצא רגיש '), T('— המשתמש חושב שהוא מחק חומר, אבל הוא בעצם לא מחק. יש לבחון אם זה מספיק מגולה למשתמש.')]))

children.push(H(HeadingLevel.HEADING_2, 'ייצוא נתונים (GDPR Article 20 — זכות לניידות)'))
children.push(bullet([B('אין endpoint לייצוא נתונים '), T('(לא נמצא '), C('/api/gdpr'), T(', '), C('/api/export'), T(', או דומה).')]))
children.push(bullet(T('המשתמש לא יכול להוריד את הנתונים שלו.')))
children.push(hr())

// ---- 5. Minors ----
children.push(H(HeadingLevel.HEADING_1, '5. טיפול במשתמשים קטינים (המרכיב הכי רגיש משפטית)'))

children.push(H(HeadingLevel.HEADING_2, 'רקע'))
children.push(rtlP(T('מרבית המשתמשים הם תלמידים — רבים מהם מתחת לגיל 18, חלקם מתחת לגיל 13. חוקים רלוונטיים:')))
children.push(bullet([B('COPPA (ארה"ב) '), T('— מתחת לגיל 13 דורש הסכמת הורה מאומתת.')]))
children.push(bullet([B('GDPR Article 8 '), T('— מתחת לגיל 16 (או 13-16 לפי מדינה) דורש הסכמת הורה.')]))
children.push(bullet([B('חוק הגנת הפרטיות הישראלי, תיקון 13 '), T('— דורש התייחסות לקטינים; הסכמה של אפוטרופוס מתחת לגיל 14.')]))
children.push(bullet([B('FERPA (ארה"ב) '), T('— לא חל ישירות עלינו (אנחנו לא school), אך רלוונטי אם נשלבים עם בתי ספר.')]))

children.push(H(HeadingLevel.HEADING_2, 'מה שקיים בקוד'))
children.push(makeTable([
  ['סעיף', 'סטטוס', 'מה שנמצא'],
  ['שאלת גיל ב-signup', [B('לא קיים')], 'ה-signup אוסף שם, אימייל, סיסמה בלבד. אין שדה גיל/תאריך לידה.'],
  ['אכיפת גיל מינימלי', [B('רק במדיניות, לא בקוד')], 'ה-ToS אומר "must be at least 13 years old" אך אין בדיקה טכנית.'],
  [[T('שדה '), C('parent_email')], [B('קיים אך לא מאומת')], [T('נאסף ב-settings, נשמר ב-'), C('user_learning_profile'), T('. '), B('המשתמש (הקטין עצמו) מזין אותו — אין אימות שההורה אכן בעל האימייל.')]],
  ['flow של הסכמת הורה', [B('לא קיים')], 'אין מייל אימות להורה לפני הפעלת החשבון; אין "double opt-in" להורה.'],
  ['שער אפוטרופסות לפני שימוש', [B('לא קיים')], "הקטין יכול להשתמש במלוא הפיצ'רים מיד."],
  ['אישור ToS בזמן הרשמה', [B('כן (checkbox)')], [T('נדרש ב-form. '), B('לא נשמר בטבלת audit.'), T(' אין רישום של "משתמש X אישר ToS גרסה Y בזמן Z".')]],
  ['דוחות להורים', [B('קיים (opt-in)')], [T('אם המשתמש הזין '), C('parent_email'), T(' והפעיל את הדיגל '), C('reports_enabled'), T(', נשלח דוח שבועי. שוב, זה בשליטת הקטין.')]],
  ['תפקידי משתמש', [B('סטודנט + אדמין בלבד')], 'אין role של "הורה", "מורה", או "מוסד חינוכי". הורה לא יכול לפתוח חשבון עבור הקטין.'],
  ['FERPA / SSO בית-ספרי', [B('לא קיים')], 'אין אינטגרציה עם Google Classroom, Clever, ClassLink.'],
  ['הצהרות ב-Privacy Policy על קטינים', [B('קיים')], [T('ה-Privacy Policy ('), C('/privacy'), T(") כולל סעיף \"Children's Privacy\" האומר שהאפליקציה לא אוספת מידע מילדים מתחת לגיל 13 ללא הסכמת הורה. "), B('הצהרה בלבד, ללא אכיפה טכנית.')]],
], [2400, 2200, 4760]))

children.push(H(HeadingLevel.HEADING_2, 'סיכונים ספציפיים'))
children.push(bullet([B('ילד בן 10 יכול להירשם היום, לא תופעל שום בדיקה. '), T('התוכן שלו יישלח ל-Anthropic (US). זה חשיפה ישירה ל-COPPA אם יש משתמש אמריקאי.')]))
children.push(bullet([B('ה-'), C('parent_email'), B(' לא מאומת '), T('— אפשר להזין אימייל של אדם רנדומלי, שיקבל דוחות על ילד שאינו שלו.')]))
children.push(bullet([B('אין audit trail של הסכמה ל-ToS '), T('— אם משתמש יטען שלא הסכים, אין הוכחה במסד הנתונים.')]))
children.push(bullet([B('הרשמה ללא CAPTCHA '), T('— משתמשים מזויפים/בוטים יכולים להירשם; קשה יותר לנהל בקשות "זה לא הייתי אני".')]))
children.push(hr())

// ---- 6. Consent ----
children.push(H(HeadingLevel.HEADING_1, '6. תוקף הסכמה וחתימות דיגיטליות (Consent Audit Trail)'))
children.push(bullet([B('signup: '), T('checkbox של הסכמה ל-ToS + Privacy. אין רישום של הגרסה, הזמן, ה-IP, ו-user agent.')]))
children.push(bullet([B('עדכון ToS: '), T('אין מנגנון ל-reconfirm כאשר ה-ToS מתעדכן. משתמשים קיימים לא נשאלים שוב.')]))
children.push(bullet([B('הסכמה לשליחה ל-Anthropic: '), T('לא נדרשת הסכמה אקטיבית; הסכמה "מובלעת" בעצם השימוש באפליקציה.')]))
children.push(bullet([B('הסכמה ל-analytics: '), T('לא נדרשת הסכמה. ה-tracking פעיל מרגע הרישום.')]))
children.push(bullet([B('Cookie banner: '), B('אין banner של הסכמת cookies'), T('. זה עלול להיות בעיה תחת ePrivacy Directive (EU) ו-PECR (UK).')]))
children.push(hr())

// ---- 7. Founder age ----
children.push(H(HeadingLevel.HEADING_1, '7. גיל המייסד (אריאל, 16) — חשיפה חוזית מול הספקים'))
children.push(rtlP([T('המייסד ומפעיל החשבונות הוא בן 16. '), B('רוב ה-ToS של הספקים דורשים שהבעלים של החשבון יהיה מעל גיל 18'), T(' או שיהיה גורם משפטי (חברה רשומה) שהוא בעל החשבון. יש לבחון את הסטטוס מול:')]))
children.push(bullet([B('Supabase ToS '), T('— האם נחתם ע"י בוגר / חברה?')]))
children.push(bullet([B('Vercel ToS '), T('— Vercel דורש בד"כ 18+ לחשבון pro.')]))
children.push(bullet([B('Anthropic API Terms '), T('— דורש שהבעלים יהיה מעל 18 או ישות עסקית.')]))
children.push(bullet([B('Resend, PostHog, Upstash, E2B, Recraft, Google '), T('— כנ"ל.')]))
children.push(rtlP([B('חשיפה: '), T('אם אף אחד מהחשבונות לא רשום על ישות עסקית או אדם מעל 18, הספקים עלולים (תיאורטית) לסגור את החשבון או לטעון להפרת ToS. בפועל, זה גם בעיה של אחריות — מי בעל המידע מבחינה משפטית?')]))
children.push(hr())

// ---- 8. Security ----
children.push(H(HeadingLevel.HEADING_1, '8. אבטחת מידע — סטטוס טכני'))
children.push(makeTable([
  ['סעיף', 'סטטוס'],
  ['הצפנת סיסמאות', '✅ bcrypt (ע"י Supabase Auth)'],
  ['הצפנה במעבר (TLS)', '✅ HTTPS בכל ה-traffic (Vercel)'],
  ['הצפנה במנוחה', 'חלקית — Supabase DB עם encryption at rest (AES-256) אוטומטית; Supabase Storage כנ"ל'],
  ['הצפנת שדות רגישים בתוך DB', [T('❌ '), C('parent_email'), T(' בטקסט רגיל; '), C('analytics_sessions.browser/OS'), T(' בטקסט רגיל')]],
  ['Row Level Security (RLS)', '✅ מופעל על טבלאות המשתמש'],
  ['Rate Limiting', '✅ דרך Upstash Redis בכל endpoint'],
  ['CAPTCHA ב-signup', '❌ לא קיים'],
  ['2FA', '❌ לא קיימת אפשרות 2FA'],
  ['ניהול סיסמאות שחורות (password breach check)', '❌ אין'],
  ['Session timeout', 'ברירת מחדל של Supabase'],
  ['Logging של failed logins', 'לא נמצא'],
  ['IP whitelisting למנהלים', '❌ אין'],
  ['Security headers (CSP, HSTS)', [T('✅ מוגדר ב-'), C('next.config.mjs')]],
], [4400, 4960]))
children.push(hr())

// ---- 9. Cookies & tracking ----
children.push(H(HeadingLevel.HEADING_1, '9. Cookies ו-tracking'))

children.push(H(HeadingLevel.HEADING_2, 'Cookies שהמערכת משתמשת בהם'))
children.push(makeTable([
  ['Cookie', 'מטרה', 'מקור'],
  [[C('sb-*'), T(' (session tokens של Supabase)')], 'אימות משתמש', 'Supabase, חיוני (essential)'],
  [[C('NEXT_LOCALE')], 'שמירת שפה (he/en)', 'שלנו, preference'],
], [3120, 3120, 3120]))

children.push(H(HeadingLevel.HEADING_2, 'localStorage / sessionStorage'))
children.push(bullet([C('VisualsContext::preferences'), T(' — העדפות ויזואליות')]))
children.push(bullet([C('pwa-install-dismissed'), T(' — אם המשתמש סגר את ה-banner של PWA')]))
children.push(bullet([C('documentId'), T(', '), C('${courseId}_processing'), T(' — מידע זמני בזמן עיבוד העלאה')]))

children.push(H(HeadingLevel.HEADING_2, 'Tracking של צדדים שלישיים'))
children.push(bullet([B('PostHog '), T('— כן, אוסף מידע התנהגותי. אין cookies של צד שלישי, אך יש fingerprinting דרך session_id + user_id.')]))
children.push(bullet([B('Analytics cookies של Google / Facebook / שותפי פרסום: '), T('❌ לא קיימים.')]))

children.push(H(HeadingLevel.HEADING_2, 'חשיפה'))
children.push(bullet([B('חוסר cookie consent banner '), T('— בעיה תחת ePrivacy Directive (EU) אם יש משתמשי EU.')]))
children.push(bullet(T('PostHog מוגדר ב-US — יש לעקוב אחר DPA.')))
children.push(hr())

// ---- 10. Legal exposure scenarios ----
children.push(H(HeadingLevel.HEADING_1, '10. תרחישים קונקרטיים של חשיפה משפטית'))
children.push(rtlP([T('להלן תרחישי הקצה שבהם עלולים להיתבע. '), B('המטרה לא לפתור — אלא להיות מודעים לקיום.')]))

const scenarios = [
  {
    title: 'א. תביעה של הורה על שימוש בילד מתחת לגיל 13',
    items: [
      ['תרחיש: ', 'ילד בן 11 נרשם, העלה מחברת עם שמו וכתובתו, ההורה גילה והגיש תלונה.'],
      ['בסיס משפטי: ', 'COPPA (אם בארה"ב), GDPR Art. 8 (אם בEU), חוק הגנת הפרטיות (בישראל).'],
      ['חשיפה: ', 'אין אימות גיל, אין הסכמת הורה מאומתת, המידע הועבר ל-Anthropic.'],
    ],
  },
  {
    title: 'ב. תביעה על שימוש בתוכן המשתמש לאימון מודלים',
    items: [
      ['תרחיש: ', 'משתמש טוען שהתוכן שלו שימש לאימון AI.'],
      ['בסיס משפטי: ', 'הפרת חוזה (Privacy Policy מבטיח שלא), זכויות יוצרים.'],
      ['חשיפה: ', 'ה-Privacy Policy מבטיח "never used to train", אך אנחנו תלויים בהתחייבות של Anthropic — ללא DPA חתום ואכיפה חוזית, זו אמירה שאולי לא ניתנת לאכיפה.'],
    ],
  },
  {
    title: 'ג. תביעה של משתמש על אי-יכולת למחוק חשבון תוך זמן סביר',
    items: [
      ['תרחיש: ', 'משתמש ביקש מחיקה; התהליך הידני לקח חודשיים; הוא טוען להפרת GDPR.'],
      ['בסיס משפטי: ', 'GDPR Art. 17, חוק הגנת הפרטיות.'],
      ['חשיפה: ', 'אין מחיקה אוטומטית; ה-mailto → support → manual process לא יעמוד ב-SLA של חודש.'],
    ],
  },
  {
    title: 'ד. תביעה על דליפת מידע דרך Resend',
    items: [
      ['תרחיש: ', 'תוכן דוח שבועי של תלמיד הגיע בטעות להורה לא נכון (כי הקטין הזין אימייל שגוי), והיה בו מידע רגיש.'],
      ['בסיס משפטי: ', 'רשלנות, הפרת פרטיות.'],
      ['חשיפה: ', 'אין אימות של ה-parent_email; אחריות על המפעיל.'],
    ],
  },
  {
    title: 'ה. תביעה על העברת מידע חוצה-גבולות',
    items: [
      ['תרחיש: ', 'משתמש גרמני טוען שמידע שלו הועבר ל-US ללא בסיס חוקי.'],
      ['בסיס משפטי: ', 'GDPR Ch. V.'],
      ['חשיפה: ', 'אין Data Transfer Impact Assessment (DTIA); ייתכן שחסר SCC.'],
    ],
  },
  {
    title: 'ו. תביעה על הבטחה שלא התקיימה ("Free tier / AI never trains")',
    items: [
      ['תרחיש: ', 'המוצר ישונה בעתיד ל-paid; משתמשים יטענו שהובטח להם אחרת.'],
      ['חשיפה: ', 'אין תנאים ברורים שמאפשרים לנו לשנות את המודל העסקי.'],
    ],
  },
  {
    title: 'ז. תביעה של ספק כי בעל החשבון קטין',
    items: [
      ['תרחיש: ', 'Anthropic מגלה שבעל חשבון ה-API הוא בן 16; סוגר את החשבון.'],
      ['חשיפה: ', 'כל המשתמשים מאבדים שירות בלילה.'],
    ],
  },
  {
    title: "ח. תביעה של משתמש על המידע שנשלח ל-Claude בצ'אט טיפולי/רגיש",
    items: [
      ['תרחיש: ', "תלמיד כתב בצ'אט תוכן רגיש (בריאות נפשית, מצב משפחתי); התלונן שהמידע הועבר ל-Anthropic US."],
      ['חשיפה: ', 'אין סינון של תוכן רגיש; אין אפשרות opt-out מ-AI.'],
    ],
  },
]

for (const s of scenarios) {
  children.push(H(HeadingLevel.HEADING_2, s.title))
  for (const [label, text] of s.items) {
    children.push(bullet([B(label), T(text)]))
  }
}
children.push(hr())

// ---- 11. Open questions ----
children.push(H(HeadingLevel.HEADING_1, '11. נושאים שלא בדקנו לעומק ויש לוודא עם עורך הדין'))
const openQs = [
  [T('האם ה-Privacy Policy עונה על דרישות '), B('חוק הגנת הפרטיות הישראלי (תיקון 13)'), T(' שנכנס לתוקף.')],
  [T('האם ה-ToS כולל בסיס ברור לשינוי מחיר/תנאים בעתיד.')],
  [T('האם ה-ToS מגן על החברה במקרה של "תשובת AI שגויה" שגרמה לנזק לימודי (תלמיד נכשל במבחן כי הסבר היה לא מדויק).')],
  [T('האם יש '), B('Responsible AI Policy'), T(' שמסביר את המגבלות של הכלי.')],
  [T('סטטוס רישום אצל '), B('הרשם למאגרי מידע'), T(' (אם רלוונטי לפי חוק הגנת הפרטיות הישראלי — תלוי במספר המשתמשים).')],
  [T('סטטוס '), B('DPIA (Data Protection Impact Assessment)'), T(' נדרש לפי GDPR Art. 35 כאשר מעבדים מידע של קטינים בקנה מידה.')],
  [T('האם יש צורך ב-'), B('DPO (Data Protection Officer)'), T('.')],
  [T('האם תוכן AI שנוצר (שיעורים, הסברים) נחשב "עיבוד ספרותי" תחת חוק זכויות יוצרים — ומי המחבר.')],
  [T('אחריות במקרה של '), B('הטעיה לימודית של AI'), T(' (תלמיד קיבל תשובה שגויה ולמד לפיה).')],
]
for (const q of openQs) children.push(bullet([TL('☐ '), ...q]))
children.push(hr())

// ---- Appendix ----
children.push(H(HeadingLevel.HEADING_1, 'נספח: סיכום בטבלה — "מה חסר?"'))
const missing = [
  ['אימות גיל ב-signup', '❌ לא קיים'],
  ['הסכמת הורה מאומתת', '❌ לא קיים'],
  ['Audit trail של הסכמה ל-ToS', '❌ לא קיים'],
  ['Cookie consent banner', '❌ לא קיים'],
  ['מחיקה עצמית של חשבון', '❌ לא קיים (רק mailto)'],
  ['ייצוא נתונים ע"י משתמש (GDPR Art. 20)', '❌ לא קיים'],
  ['Opt-out מ-AI processing', '❌ לא קיים'],
  ['Opt-out מ-analytics', '❌ לא קיים'],
  ['2FA', '❌ לא קיים'],
  ['CAPTCHA ב-signup', '❌ לא קיים'],
  ['DPA חתום עם כל הספקים', '❓ לא אומת'],
  ['DTIA להעברה חוצה-גבולות', '❓ לא אומת'],
  ['Region-specific data segregation', '❌ לא קיים'],
  ['תפקיד "הורה" / "מורה" במערכת', '❌ לא קיים'],
  ['TTL / retention על analytics', '❌ לא קיים'],
  ['TTL על uploads', '❌ לא קיים'],
  ['Soft delete', '❌ לא קיים'],
  ['רישום מאגר מידע ברשם', '❓ לא אומת'],
  ['DPIA / DPO', '❓ לא אומת'],
  ['Password breach check', '❌ לא קיים'],
]
children.push(makeTable([['נושא', 'סטטוס'], ...missing], [5600, 3760]))

children.push(hr())
children.push(rtlP([B('הערה סופית: '), T('כל הממצאים במסמך הזה מבוססים על סקירת קוד ב-15/4/2026. הסטטוס יכול להשתנות; לפני הפגישה המשפטית כדאי לוודא שלא הוכנסו שינויים מאז.')]))

// =============================================================================
const doc = new Document({
  creator: 'X+1',
  title: 'חשיפה משפטית מלאה — X+1',
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
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

const outPath = path.resolve('docs/legal/02-legal-exposure-full.docx')
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf)
  console.log('Wrote:', outPath)
  console.log('Size:', buf.length, 'bytes')
})
