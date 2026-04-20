/**
 * Generate SIMPLIFIED Word document (Hebrew, RTL)
 * A short, clean, non-technical answer to the investor question.
 * Output: docs/legal/00-summary-simple.docx
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
} from 'docx'

const FONT = 'Arial'
const BLACK = '000000'
const GRAY_BORDER = 'BBBBBB'
const LIGHT_BLUE = 'D5E8F0'

const T = (text, opts = {}) => new TextRun({ text, font: FONT, rightToLeft: true, ...opts })
const B = (text, opts = {}) => T(text, { bold: true, ...opts })

const rtlP = (children, opts = {}) => new Paragraph({
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { after: 120, ...(opts.spacing || {}) },
  ...opts,
  children: Array.isArray(children) ? children : [children],
})

const H = (level, text) => new Paragraph({
  heading: level,
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text, font: FONT, bold: true, rightToLeft: true })],
})

const cellBorders = () => {
  const b = { style: BorderStyle.SINGLE, size: 4, color: GRAY_BORDER }
  return { top: b, bottom: b, left: b, right: b }
}
const cell = (text, opts = {}) => {
  const isHeader = opts.header === true
  const width = opts.width
  const runs = Array.isArray(text) ? text : [text]
  return new TableCell({
    borders: cellBorders(),
    width: { size: width, type: WidthType.DXA },
    shading: isHeader ? { fill: LIGHT_BLUE, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 110, bottom: 110, left: 160, right: 160 },
    children: [new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      children: runs.map(r => typeof r === 'string' ? T(r, { bold: isHeader }) : r),
    })],
  })
}

const makeTable = (rows, cols) => new Table({
  width: { size: cols.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: cols,
  rows: rows.map((row, idx) => new TableRow({
    children: row.map((content, i) => cell(content, { header: idx === 0, width: cols[i] })),
  })),
})

// =============================================================================
const children = []

// Title
children.push(new Paragraph({
  heading: HeadingLevel.TITLE,
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
  spacing: { after: 120 },
  children: [new TextRun({ text: 'סדר קצר לפגישה המשפטית — X+1', font: FONT, bold: true, size: 40, rightToLeft: true })],
}))

children.push(rtlP(T('מענה ישיר לשאלה: באילו כלים המערכת משתמשת היום, ואיזה מידע נשמר בה.', { italics: true, color: '555555' })))

// =============================================================================
// Table 1: Tools
// =============================================================================
children.push(H(HeadingLevel.HEADING_1, '1. הכלים שהמערכת משתמשת בהם'))

children.push(makeTable([
  ['הכלי', 'למה הוא משמש אותנו'],
  ['Vercel', 'אחסון של האתר — השרתים שמריצים את האפליקציה ומגישים אותה למשתמשים.'],
  ['Supabase', 'בסיס הנתונים הראשי — שומר את כל פרטי המשתמשים, הקורסים, ההתקדמות, והקבצים שהועלו. גם אחראי על ההתחברות (אימייל וסיסמה).'],
  ['Anthropic (Claude AI)', 'המוח של המערכת. יוצר קורסים מהחומרים שהמשתמש מעלה, עונה על שאלות בצ\'אט, נותן עזרה בשיעורי בית, בונה שאלות ומבחנים.'],
  ['Recraft', 'יוצר דיאגרמות ואיורים חינוכיים באיכות גבוהה (לדוגמה: איור תא ביולוגי, תרשים פיזיקה).'],
  ['Google Gemini', 'יוצר תמונות כיסוי לקורסים, כגיבוי. לא משמש לתוכן לימודי עצמו.'],
  ['E2B', "סביבת הרצה מבודדת (sandbox) — מריצה קוד מתמטי/גרפי בשביל ליצור דיאגרמות מדויקות."],
  ['Resend', 'שולח את כל המיילים — ברוך הבא, איפוס סיסמה, דוחות התקדמות שבועיים להורים.'],
  ['PostHog', 'אנליטיקה — עוקב אחרי התנהגות משתמשים (איזה דפים הם מבקרים, איפה הם נופלים) כדי לשפר את המוצר.'],
  ['Upstash Redis', 'מגביל את קצב השימוש — מונע ממשתמש יחיד להעמיס על המערכת או לנצל אותה לרעה.'],
  ['YouTube', 'מחפש סרטונים חינוכיים רלוונטיים להעשרת מדריכי לימוד.'],
  ['Unsplash', 'מאגר תמונות סטוק לכיסויי קורסים.'],
  ['QuickLaTeX', 'מרנדר נוסחאות מתמטיות יפות להצגה על המסך.'],
], [2900, 6460]))

children.push(H(HeadingLevel.HEADING_2, 'חשוב לציין — במה אנחנו לא משתמשים'))
children.push(rtlP([T('• אין מעבדי תשלום (Stripe / PayPal) — המוצר בחינם כרגע.')]))
children.push(rtlP([T('• אין OpenAI / ChatGPT — המודל היחיד שמעבד תוכן של משתמשים הוא Claude של Anthropic.')]))
children.push(rtlP([T('• אין שילוב עם Google / Apple (OAuth) — ההתחברות היא רק אימייל וסיסמה.')]))
children.push(rtlP([T('• אין שילוב עם מערכות בתי ספר (Google Classroom, Clever).')]))
children.push(rtlP([T('• אין SMS או התראות push.')]))

// =============================================================================
// Table 2: Data stored
// =============================================================================
children.push(H(HeadingLevel.HEADING_1, '2. המידע שנשמר במערכת'))

children.push(rtlP(T('מענה לפי הקטגוריות המדויקות שנשאלו:')))

children.push(makeTable([
  ['סוג המידע', 'נשמר?', 'פרטים'],
  [[B('שם')], 'כן', 'נאסף בעת הרשמה. נשמר במערכת ההתחברות של Supabase.'],
  [[B('אימייל')], 'כן', 'נאסף בעת הרשמה. נשמר בטקסט רגיל (כמקובל באימות משתמשים). אימייל הורה אופציונלי נשמר בנפרד אם המשתמש בחר להזין.'],
  [[B('סיסמה')], 'רק hash מוצפן', 'הסיסמה המקורית לעולם לא נשמרת. נשמר רק "טביעת אצבע" מוצפנת שלה (bcrypt) דרך Supabase. אנחנו לא רואים את הסיסמה בשום שלב.'],
  [[B('קבצים שהמשתמש מעלה')], 'כן', 'מחברות, PDFs, מסמכי Word, מצגות, צילומי שיעורי בית. נשמרים בשטח אחסון פרטי ב-Supabase Storage. לא נגישים ציבורית.'],
  [[B('תוכן שה-AI מייצר')], 'כן', 'הקורסים שנוצרים, ההסברים, הדיאגרמות, התשובות של ה-tutor, פתרונות צעד-צעד לשיעורי בית.'],
  [[B("צ'אטים")], 'כן', "כל שיחה של משתמש עם ה-AI (עזרה בשיעור, שיעורי בית, תכנון לימודים, הכנה למבחן). נשמרת במלואה כולל השאלה המקורית והתשובה."],
  [[B('תשובות לתרגולים')], 'כן', 'תשובות במבחנים, תרגול חוזר, כרטיסי חזרה מרווחת, סטטיסטיקה של נכון/לא-נכון, זמן תגובה לכל שאלה.'],
  [[B('נתוני שימוש')], 'כן, מפורט', 'סוג מכשיר ודפדפן, גודל מסך, timezone, מאיזה קמפיין הגיע, אילו דפים ביקר, זמן בכל דף, clicks, שגיאות, רצף שימוש (streak), רמת XP, פרופיל לימודי (כיתה, נושאים, שפה).'],
], [2100, 1400, 5860]))

// =============================================================================
// Important clarifications
// =============================================================================
children.push(H(HeadingLevel.HEADING_1, '3. נקודות חשובות שכדאי להיות מוכנים אליהן'))

children.push(rtlP([B('כתובות IP לא נשמרות במסד הנתונים שלנו. '), T('הן משמשות רק זמנית להגבלת קצב בקשות (Upstash Redis) ומופיעות בלוגים של Vercel — כברירת מחדל של התשתית.')]))

children.push(rtlP([B('אין איסוף מיקום פיזי. '), T('אין GPS. המידע הגיאוגרפי הכי קרוב הוא timezone של הדפדפן — proxy גס למיקום.')]))

children.push(rtlP([B('תוכן שנשלח לספקים חיצוניים: '), T('תוכן שהמשתמש מעלה או כותב ב-AI עובר דרך Anthropic (חברה אמריקאית) לצורך עיבוד. Anthropic מצהירה שאינה מאמנת מודלים על ה-API input.')]))

children.push(rtlP([B('דוחות להורים: '), T('אם המשתמש הזין אימייל הורה והפעיל את ההתראות, נשלח דוח שבועי עם התקדמות לימודית של התלמיד — דרך Resend (גם אמריקאית).')]))

children.push(rtlP([B('מחיקת חשבון: '), T('כרגע אין כפתור אוטומטי — המשתמש שולח בקשה לתמיכה, ואנחנו מוחקים ידנית דרך קונסול Supabase.')]))

children.push(rtlP([B('מיקום הנתונים: '), T('רוב הספקים בארה"ב (Anthropic, Resend, PostHog, E2B, Recraft, Vercel). Supabase — תלוי באיזה region בחרנו בקונסול (יש לאמת).')]))

// =============================================================================
// ADDITIONAL / EXTRA MATERIAL
// =============================================================================
children.push(new Paragraph({
  border: { bottom: { style: BorderStyle.DOUBLE, size: 12, color: '888888', space: 8 } },
  spacing: { before: 400, after: 240 },
  children: [],
}))

children.push(H(HeadingLevel.HEADING_1, 'חומר נוסף — הרחבות שכדאי שיהיו בידיים של עוה"ד'))
children.push(rtlP([T('הסעיפים להלן מופיעים במסמך המשפטי המלא, ומובאים כאן בתמצית לרווחת הקריאה.', { italics: true, color: '555555' })]))

// ---- 1. Data flow to third parties ----
children.push(H(HeadingLevel.HEADING_2, '1. זרימת מידע לצדדים שלישיים (מה יוצא מהמערכת)'))
children.push(rtlP(T("זה שונה מ\"מה נשמר\" — מדובר במידע שהמערכת שולחת בפועל לספקים חיצוניים:")))
children.push(makeTable([
  ['ספק', 'מה נשלח אליו'],
  ['Anthropic (Claude)', "תוכן מסמכים שהמשתמש העלה, טקסט של שיעורי בית, שאלות של המשתמש בצ'אט, תמונות שיעורי בית, כל prompt. המשתמש לא יכול לבטל opt-out."],
  ['Resend', 'כתובות אימייל של משתמשים ושל הורים + תוכן דוחות התקדמות לימודית (PII של תלמיד נשלח במייל לא-מוצפן להורה).'],
  ['PostHog', 'מזהה משתמש + אירועי התנהגות (קליקים, דפים). לא נשלח אליהם תוכן קורסים, שיעורי בית או צ\'אטים.'],
  ['Vercel', 'כל הבקשות עוברות דרכם — כולל לוגים של requests ו-responses. Vercel רואה את כל ה-traffic.'],
  ['Recraft / Gemini / E2B', 'prompts טקסטואליים של דיאגרמות, קוד LaTeX/Python. יכול לכלול תוכן לימודי של המשתמש.'],
], [2500, 6860]))

// ---- 2. Geographic + SCC ----
children.push(H(HeadingLevel.HEADING_2, '2. מיקום גיאוגרפי של כל ספק + SCC / GDPR Ch. V'))
children.push(makeTable([
  ['ספק', 'מיקום'],
  ['Supabase', 'תלוי ב-region שנבחר בקונסול (לאמת). ברירת מחדל — US-east.'],
  ['Vercel', 'Edge network גלובלי; logs מרכזיים בארה"ב.'],
  ['Anthropic', 'ארה"ב.'],
  ['Resend', 'ארה"ב.'],
  ['PostHog', 'ארה"ב (us.i.posthog.com).'],
  ['Upstash Redis', 'ניתן להגדרה; ברירת מחדל גלובלית (לאמת).'],
  ['E2B', 'ארה"ב.'],
  ['Recraft', 'ארה"ב.'],
], [2500, 6860]))
children.push(rtlP([B('חשיפה משפטית: ')]))
children.push(rtlP([T('• אם יש משתמשים באיחוד האירופי — העברת מידע ל-ארה"ב דורשת '), B('Standard Contractual Clauses (SCC)'), T(' או הצטרפות ל-'), B('EU-US Data Privacy Framework'), T(' (GDPR Ch. V).')]))
children.push(rtlP([T('• בישראל — חוק הגנת הפרטיות מאפשר העברה ל-ארה"ב עם תנאים (תקנה 2(4) לתקנות העברת מידע).')]))
children.push(rtlP([T('• '), B('אין הפרדה של משתמשים ישראלים / EU / אמריקאים לפי region'), T(' — כולם על אותו Supabase instance.')]))

// ---- 3. DPA checklist ----
children.push(H(HeadingLevel.HEADING_2, '3. DPA (Data Processing Agreements) — 9 ספקים לבדיקה'))
children.push(rtlP([T('לא ראינו במאגר הקוד ראיה לחתימה על DPA. '), B('עוה"ד צריך לוודא שחתומים DPA עם:')]))
for (const v of ['Supabase', 'Vercel', 'Anthropic', 'Resend', 'PostHog', 'Upstash Redis', 'E2B', 'Recraft', 'Google (Gemini, YouTube)']) {
  children.push(rtlP([T('☐ ' + v)]))
}
children.push(rtlP([T('ספקים גדולים מציעים DPA סטנדרטי בחשבונות enterprise; חשבונות חינמיים או starter לעיתים '), B('לא'), T(' מכוסים אוטומטית.')]))

// ---- 4. Account deletion + GDPR Art. 17 ----
children.push(H(HeadingLevel.HEADING_2, '4. מחיקת חשבון — תהליך ידני, חשיפה מול GDPR Art. 17'))
children.push(rtlP([T('• '), B('אין endpoint אוטומטי למחיקה עצמית'), T(' — הכפתור "Delete Account" רק פותח mailto לכתובת התמיכה.')]))
children.push(rtlP([T('• המחיקה עצמה נעשית '), B('ידנית'), T(' ע"י אדמין דרך קונסול Supabase.')]))
children.push(rtlP([T('• '), B('אין SLA'), T(' — לא מוגדר תוך כמה זמן המחיקה מתבצעת.')]))
children.push(rtlP([T('• '), B('GDPR Article 17'), T(' (זכות להישכח) מחייב עיבוד בקשת מחיקה תוך חודש. תהליך ידני של mailto → תמיכה → מחיקה ידנית לא עומד בזה באופן מערכתי.')]))
children.push(rtlP([T('• '), B('חוק הגנת הפרטיות הישראלי (תיקון 13)'), T(' דורש גם הוא מחיקה לפי בקשה — התהליך הנוכחי אפשרי אך לא יעיל/חסין.')]))
children.push(rtlP([T('• בנוסף: כשמשתמש מוחק קורס, חלק מנתוני הלמידה שקשורים אליו '), B('לא נמחקים'), T(' — הם רק "מתנתקים" מהקורס. יש לבחון אם זה מגולה למשתמש.')]))

// ---- 5. Parent email not verified ----
children.push(H(HeadingLevel.HEADING_2, '5. אין אימות של parent_email'))
children.push(rtlP([T('• שדה parent_email נאסף בהגדרות, אבל '), B('המשתמש (הקטין) מזין אותו בעצמו'), T('.')]))
children.push(rtlP([T('• '), B('אין אימות שההורה הוא אכן בעל האימייל'), T(' — לא נשלח אליו מייל אישור, אין double opt-in.')]))
children.push(rtlP([T('• משמעות: ילד יכול להכניס אימייל רנדומלי שיקבל דוחות התקדמות שלו, והבעלים האמיתי של האימייל לא נתן הסכמה.')]))
children.push(rtlP([T('• חשיפה: הפרת פרטיות, שליחת PII של תלמיד למי שלא הסכים.')]))

// ---- 6. No ToS audit trail ----
children.push(H(HeadingLevel.HEADING_2, '6. אין audit trail של אישור תנאי השימוש (ToS)'))
children.push(rtlP([T('• בהרשמה יש checkbox "אני מסכים/ה לתנאי השימוש" — חובה.')]))
children.push(rtlP([T('• '), B('אבל האישור לא נרשם במסד הנתונים'), T('. אין טבלה ששומרת: "משתמש X אישר ToS גרסה Y, בזמן Z, מ-IP כלשהו".')]))
children.push(rtlP([T('• '), B('אין מנגנון re-confirm'), T(' — כשאנחנו מעדכנים את ה-ToS, משתמשים קיימים לא נשאלים שוב.')]))
children.push(rtlP([T('• חשיפה: אם משתמש יטען בעתיד "לא הסכמתי" או "אישרתי גרסה אחרת" — '), B('אין לנו הוכחה במערכת'), T('.')]))

// ---- 7. Security ----
children.push(H(HeadingLevel.HEADING_2, '7. אבטחת מידע — סטטוס'))
children.push(makeTable([
  ['סעיף', 'סטטוס'],
  ['הצפנת סיסמאות (bcrypt)', '✅ קיים (דרך Supabase)'],
  ['הצפנה במעבר (TLS / HTTPS)', '✅ קיים בכל ה-traffic'],
  ['הצפנה במנוחה (at-rest)', '✅ ברירת מחדל של Supabase'],
  ['Row Level Security (RLS)', '✅ מופעל על טבלאות משתמש'],
  ['Rate Limiting', '✅ דרך Upstash Redis'],
  ['Security headers (CSP, HSTS)', '✅ מוגדרים'],
  ['2FA (אימות דו-שלבי)', '❌ לא קיים'],
  ['CAPTCHA בהרשמה', '❌ לא קיים — בוטים יכולים להירשם'],
  ['Password breach check', '❌ אין — משתמש יכול לבחור סיסמה שדלפה'],
  ['הצפנה ברמת השדה (column-level)', '❌ parent_email בטקסט רגיל'],
  ['Logging של failed logins', 'לא נמצא'],
  ['IP whitelisting לאדמינים', '❌ אין'],
], [5400, 3960]))

// ---- 8. Cookies + ePrivacy ----
children.push(H(HeadingLevel.HEADING_2, '8. Cookies ו-ePrivacy Directive'))
children.push(rtlP([T('• '), B('Cookies בשימוש: '), T('רק essential (sb-* של Supabase לאימות + NEXT_LOCALE לשפה).')]))
children.push(rtlP([T('• '), B('אין cookies של צדדים שלישיים'), T(' (אין Google Analytics / Facebook Pixel / Ad networks).')]))
children.push(rtlP([T('• '), B('אין cookie consent banner'), T(' בכלל באתר.')]))
children.push(rtlP([T('• '), B('חשיפה: '), T('ה-'), B('ePrivacy Directive (EU)'), T(' וה-'), B('PECR (UK)'), T(' דורשים הודעה/הסכמה גם ל-cookies essential ברוב המקרים, וחובה לכל מה שלא essential. אם יש משתמשים אירופאים/בריטיים — זו חשיפה.')]))
children.push(rtlP([T('• '), B('PostHog'), T(' משתמש ב-fingerprinting דרך session_id + user_id (לא cookies של צד שלישי), אבל זה עדיין נחשב tracking תחת ה-Directive.')]))

// =============================================================================
const doc = new Document({
  creator: 'X+1',
  title: 'סדר קצר לפגישה המשפטית',
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 40, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 320, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    ],
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

const outPath = path.resolve('docs/legal/00-summary-simple.docx')
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf)
  console.log('Wrote:', outPath)
  console.log('Size:', buf.length, 'bytes')
})
