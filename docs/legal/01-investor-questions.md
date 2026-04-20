# מענה לשאלות המשקיעים — X+1 (NoteSnap)

**תאריך הכנה:** 15 באפריל 2026
**מטרה:** מענה ישיר לשאלת המשקיעים בנושא כלים ומידע במערכת.

---

## א. באילו כלים המערכת משתמשת היום

### תשתית ופריסה

| כלי | שימוש במערכת | היכן נמצא בקוד |
|---|---|---|
| **Vercel** | אחסון ופריסה של האפליקציה; הרצת serverless functions; הרצת משימות מתוזמנות (cron jobs) | `vercel.json`, פריסת Next.js |
| **Supabase** | בסיס נתונים (PostgreSQL), אימות משתמשים (email/password), אחסון קבצים (Storage) | `lib/supabase/*`, `supabase/migrations/*` |

### שירותי AI ועיבוד תוכן

| כלי | שימוש במערכת | היכן נמצא בקוד |
|---|---|---|
| **Anthropic (Claude API)** | יצירת קורסים מהחומרים שהמשתמש מעלה, מערכת תרגול חכמה, עזרה בשיעורי בית, יצירת שאלות ומבחנים, יצירת דיאגרמות | `lib/ai/claude.ts`, `lib/homework/tutor-engine.ts`, `app/api/generate-course`, `app/api/chat`, `app/api/practice/tutor`, `app/api/help` |
| **Recraft V3** | יצירת דיאגרמות ואיורים חינוכיים (דו-ממד ותלת-ממד) ע"י AI | `lib/diagram-engine/recraft-client.ts`, `lib/diagram-engine/recraft-executor.ts` |
| **Google Generative AI (Gemini)** | יצירת תמונות כיסוי לקורסים (מנגנון גיבוי) | `lib/ai/image-generation.ts` — נטען רק אם `GOOGLE_AI_API_KEY` מוגדר |
| **E2B** | הרצת קוד LaTeX ו-Python ב-sandbox מבודד לצורך קומפילציית דיאגרמות מורכבות | `lib/diagram-engine/e2b-executor.ts`, `lib/diagram-engine/tikz-executor.ts` |

### שירותי תוכן חיצוניים (חיפוש / מאגרי מדיה)

| כלי | שימוש במערכת | היכן נמצא בקוד |
|---|---|---|
| **YouTube Data API v3** | חיפוש סרטונים חינוכיים להעשרת מדריכי לימוד | `lib/prepare/youtube-search.ts` (אופציונלי) |
| **Unsplash API** | חיפוש תמונות סטוק לכיסויי קורסים | `lib/images/search.ts`, `lib/images/smart-search.ts` (אופציונלי) |
| **QuickLaTeX** | רינדור נוסחאות מתמטיות כ-PNG להצגה מהירה | מופיע ב-CSP של `next.config.mjs` |

### תקשורת עם המשתמש

| כלי | שימוש במערכת | היכן נמצא בקוד |
|---|---|---|
| **Resend** | כל המיילים הטרנזקציונליים: מיילי ברוך הבא, איפוס סיסמה, דוחות התקדמות שבועיים להורים, מיילי "נאדג'" (תזכורות) | `lib/email/resend-client.ts`, `app/api/reports/weekly/send-all`, `app/api/cron/send-nudge-emails`, `app/api/auth/forgot-password` |

### אנליטיקה ותשתית תומכת

| כלי | שימוש במערכת | היכן נמצא בקוד |
|---|---|---|
| **PostHog** | מעקב אירועים, ניתוח התנהגות משתמשים, feature flags | `lib/posthog/server.ts`, `components/providers/PostHogProvider.tsx` |
| **Upstash Redis** | Rate limiting — הגבלת קצב קריאות API למניעת שימוש לרעה | `lib/rate-limit.ts` |

### מה *לא* בשימוש (חשוב לציין במפורש)

- **אין מעבדי תשלום** (Stripe, PayPal וכו') — המוצר בחינם כרגע
- **אין Sentry או כלי ניטור תקלות חיצוני** — שגיאות נשמרות בטבלאות פנימיות
- **אין OpenAI** — המודל היחיד לעיבוד תוכן משתמש הוא Claude של Anthropic
- **אין OAuth עם Google/Apple** — אימות רק email+password
- **אין אינטגרציות עם מערכות בית-ספריות** (Clever, ClassLink, Google Classroom)
- **אין SMS / Push Notifications**
- **אין OCR חיצוני** — עיבוד PDF/PPTX/DOCX מקומי עם ספריות (mammoth, pptxjs)

---

## ב. איזה מידע נשמר במערכת

המענה מחולק לפי הקטגוריות שציינתם.

### 1. שם

- נאסף ב-signup (שדה "שם מלא")
- נשמר ב-Supabase Auth (`auth.users` — שדה `user_metadata`)
- מופיע במיילים ובאפליקציה

### 2. אימייל

- נאסף ב-signup
- נשמר ב-Supabase Auth (`auth.users.email`) **בפורמט טקסט רגיל (לא מוצפן)**
- משמש לאימות ולתקשורת
- **אימייל הורה (אופציונלי)** — נאסף בהגדרות המשתמש, נשמר בטבלת `user_learning_profile.parent_email` **בפורמט טקסט רגיל**

### 3. סיסמה

- נאסף ב-signup (מינימום 8 תווים)
- **לעולם לא נשמר בטקסט רגיל** — Supabase Auth שומר רק hash מוצפן (bcrypt)
- אנחנו (האפליקציה) לא רואים את הסיסמה בשום שלב; היא מטופלת לחלוטין ע"י Supabase
- Session tokens (JWT) מנוהלים ע"י Supabase ונשמרים ב-cookies

### 4. קבצים שהמשתמש מעלה

נשמרים ב-Supabase Storage, בארבעה buckets מופרדים:

| Bucket | סוגי קבצים | מגבלת גודל | שימוש |
|---|---|---|---|
| `documents` | PDF, DOCX, PPTX | עד 50MB | חומרי לימוד להפיכה לקורס |
| `notebook-images` | JPEG, PNG, WebP, HEIC, GIF | עד 10MB לקובץ, עד 10 קבצים | תמונות מחברת, צילומי שיעורי בית |
| `past-exams` | PDF, תמונות | — | מבחני עבר להכנה |
| `diagram-steps` | PNG (נוצר ע"י המערכת) | — | דיאגרמות שנרנדרו |

- **כל הקבצים פרטיים** (לא נגישים ציבורית)
- שמות הקבצים מקודדים עם `userId/courseId/filename`
- **אין TTL (מחיקה אוטומטית)** — קבצים נשמרים ללא הגבלת זמן עד שהמשתמש מוחק ידנית או שהחשבון נמחק

### 5. תוכן שה-AI מייצר

- **קורסים שנוצרו:** נשמרים בטבלת `courses.generated_course` (JSONB) — כולל מבנה שיעורים, הסברים, שאלות
- **דיאגרמות:** נשמרות ב-`diagram_cache` (כולל קוד TikZ, URL של תמונה שרונדרה)
- **הסברים ב-AI tutor:** נשמרים ב-`help_requests.ai_response` ו-`homework_turns.content`
- **פתרונות צעד-צעד (walkthroughs):** נשמרים ב-`walkthrough_sessions.walkthrough_steps` (JSONB)
- **המלצות מותאמות אישית:** נשמרות ב-`recommendation_tracking`

### 6. צ'אטים

- **עזרה בשיעור ספציפי:** טבלת `help_requests` — שאלת המשתמש + תשובת ה-AI
- **שיחות שיעורי בית (Socratic tutoring):** טבלת `homework_sessions.conversation` (JSONB עם השיחה המלאה) + טבלת `homework_turns` (כל תור בנפרד כולל רמת רמז, כוונה פדגוגית, ותגי מטא)
- **צ'אטים של תוכנית לימוד:** `study_plan_chat_messages`
- **צ'אטים של מדריך הכנה:** `prepare_chat_messages`
- **שאלות הבהרה בתוך walkthrough:** `walkthrough_step_chats`

### 7. תשובות לתרגולים

- **תשובות במבחנים:** `exam_questions.user_answer`, `is_correct`, `image_label_data`
- **תשובות בתרגול חוזר:** `practice_session_questions.user_answer`, `response_time_ms`
- **סטטיסטיקת שאלות בקורס:** `user_progress.questions_answered`, `questions_correct`
- **כרטיסי חזרה מרווחת (SRS):** `review_cards` — כולל צד קדמי, אחורי, stability, difficulty, lapses
- **ביצוע לכל צעד:** `step_performance` — זמן על כל שלב, מספר ניסיונות, נכונות
- **פערי ידע:** `user_knowledge_gaps` — מושגים שהמשתמש מתקשה בהם
- **דפוסי טעויות:** `mistake_patterns`

### 8. נתוני שימוש

זו הקטגוריה הרחבה ביותר. **המערכת אוספת מידע התנהגותי מפורט מאוד:**

**מידע על session (טבלת `analytics_sessions`):**
- זמן התחלה וסיום, משך, device type, browser, OS, OS version
- רזולוציית מסך, timezone, locale
- UTM parameters (source, medium, campaign)
- landing page, referrer

**מידע על דפים (`analytics_page_views`):**
- כל דף שהמשתמש צפה בו
- זמן בדף, scroll depth
- דף כניסה/יציאה

**מידע על אירועים (`analytics_events`):**
- כל קליק (כולל קואורדינטות X,Y)
- element ID ו-class שעליו לחצו
- properties מותאמים אישית לכל אירוע

**מידע על תקלות (`analytics_errors`, `error_logs`):**
- סוג שגיאה, הודעת שגיאה, stack trace
- API endpoint, HTTP status
- user agent

**מידע על funnel והמרות (`analytics_funnels`):**
- באיזה שלב משתמש נופל במסע (onboarding, יצירת קורס)

**מדדי gamification (`user_gamification`):**
- XP, current level, current streak
- lessons_completed, cards_reviewed, perfect_lessons

**פרופיל לימודי (`user_learning_profile`):**
- רמת השכלה, כיתה, מערכת לימודים (ישראלית/אמריקאית/IB)
- נושאים מועדפים, שפה
- peak_performance_hour, most_active_day, hint_usage_rate
- parent_email (אם צוין)

**מצב אלגוריתם SRS (`user_srs_settings`, `user_performance_state`):**
- פרמטרי FSRS (זיכרון, קושי) לכל משתמש
- רמת שליטה במושגים (`user_concept_mastery`)

**התנהגות בפיצ'רים (`feature_affinity`, `explanation_engagement`):**
- באילו פיצ'רים משתמש לעיתים קרובות
- עם אילו סוגי הסברים הוא מתחבר יותר

---

## סיכום בטבלה אחת

| קטגוריה | נשמר במערכת? | מיקום |
|---|---|---|
| שם | כן | Supabase Auth metadata |
| אימייל | כן (טקסט רגיל) | `auth.users.email` |
| סיסמה | רק hash (לא אנחנו מחזיקים את המקור) | `auth.users.encrypted_password` |
| אימייל הורה | כן, אופציונלי (טקסט רגיל) | `user_learning_profile.parent_email` |
| קבצים שהועלו | כן (ללא TTL) | Supabase Storage (4 buckets) |
| תוכן AI שנוצר | כן | `courses.generated_course`, `diagram_cache`, `walkthrough_sessions` |
| צ'אטים עם AI | כן | `help_requests`, `homework_sessions`, `homework_turns`, `study_plan_chat_messages`, `prepare_chat_messages` |
| תשובות לתרגולים | כן | `exam_questions`, `practice_session_questions`, `review_cards`, `step_performance` |
| נתוני שימוש / אנליטיקה | כן, מפורט מאוד | 9 טבלאות `analytics_*` + טבלאות התנהגות נוספות |

---

## הבהרות נוספות שכדאי להיות מוכנים אליהן

מתוך סקירה מעמיקה של הקוד, אלו פריטים שהמשקיעים עשויים לשאול עליהם או שכדאי לציין ביוזמתנו:

### 1. כתובות IP — לא נשמרות במסד הנתונים

- **אין עמודת `ip_address` באף טבלה של המערכת** (אומת: 0 מופעים בכל קבצי המיגרציה).
- כתובות IP משמשות זמנית בלבד:
  - ב-**Upstash Redis** לצורך rate limiting (מפתח קצר-חיים עם TTL שעוברת השעה)
  - ב-**Vercel server logs** — אוטומטית, מחוץ לשליטתנו (ברירת מחדל של Vercel)
  - ב-endpoint של שכחתי-סיסמה משמשת למניעת spam (זמנית)
- **זה תכתיב חוקי משמעותי** — GDPR מסווג IP כ-PII, אך כיוון שאנחנו לא מחזיקים באופן מתמיד, החשיפה מוגבלת לספקים.

### 2. מידע על מנהלי מערכת (admin_users)

- טבלה נפרדת (`admin_users`) מחזיקה תפקידים פנימיים: `admin` ו-`super_admin`.
- זה משמש לצוות הפנימי בלבד, לא לטיפולי משתמש קצה.

### 3. מידע גיאוגרפי משתמש

- **לא אוספים מיקום פיזי של משתמש.** אין GPS, אין geolocation API.
- המידע הקרוב ביותר שיש: **timezone + locale** (נשמר ב-`analytics_sessions`), שמתקבלים מההגדרות של הדפדפן. זה proxy גס של מיקום, לא מיקום ממש.

### 4. אוסף מידע על מכשירי משתמש

בטבלת `analytics_sessions` (לכל session):
- `device_type` (desktop/tablet/mobile)
- `browser` + `browser_version`
- `os` + `os_version`
- `screen_width`, `screen_height`
- `timezone`, `locale`
- **מה שמקובל להתייחס אליו כ-"device fingerprinting"** — טכנית כן, אבל בסטנדרט שמקובל ב-web analytics.

### 5. UTM ו-referrer

- נשמרים: `utm_source`, `utm_medium`, `utm_campaign`, `landing_page`, `referrer`
- זה מאפשר לנו לדעת מאיזה קמפיין שיווקי המשתמש הגיע, ומאיזה דף חיצוני.

### 6. שימוש ב-PostHog — מה נשלח לשם ומה לא

- **נשלח ל-PostHog (שרתי US):** אירועי התנהגות עם `user_id`, properties מותאמים, timestamps, session_id.
- **לא נשלח ל-PostHog:** תוכן קורסים, שיעורי בית, צ'אטים, תשובות, קבצים. תוכן נשמר רק ב-DB שלנו.

### 7. ספקי תשתית פחות בולטים

- **Vercel cron jobs** רצים יומית:
  - `aggregate-analytics` — יוצר metrics מצטברים
  - `send-weekly-reports` — שולח דוחות להורים
  - `cleanup-stuck-courses` — מנקה יצירות קורס שלא הסתיימו
  - `send-nudge-emails` — שולח תזכורות למשתמשים לא פעילים

### 8. שפה ובינלאומיות

- המערכת תומכת בעברית ואנגלית. Locale נשמר ב-`NEXT_LOCALE` cookie ובטבלת `user_learning_profile.language`.

### 9. התוכן שלקוחות עשויים לראות כרגיש

מעבר למידע הפורמלי, יש סוגי תוכן ספציפיים שחשוב לציין שנשמרים:
- **תוכן חינוכי של תלמיד** — יכול לחשוף יכולות, חולשות, ציונים
- **שאלות בצ'אט** — תלמידים מדי פעם שואלים שאלות אישיות בצ'אט עם ה-AI tutor (קושי רגשי, נושאים רגישים)
- **אירועים אקדמיים** — תאריכי מבחנים והגשות (`academic_events`) — יכולים לחשוף איזה בית ספר
- **רפלקציות** (`reflections`) — מה התלמיד חושב על עצמו ועל הלמידה שלו

### 10. מה המשקיעים בוודאי *לא* ישאלו אבל כדאי להכיר

- **המידע לא מוצפן ברמת השדה** (column-level encryption). מסתמכים על Supabase's at-rest encryption הכללית.
- **אין EBS snapshots שלנו** — גיבויים מטופלים ע"י Supabase.
- **אין Data Loss Prevention (DLP)** — שום מערכת שמזהה אם מישהו מעלה מידע מסווג.
- **יש feedback שקיים** — חלק מהמשתמשים מספקים דירוגים ותגובות (`reflections`, `extraction_feedback`). זה תוכן שלהם, שמור אצלנו.

---

