# הוראות הפעלת Google Drive API

## שלב 1: הפעלת Google Drive API ב-Firebase Console

1. **עבור ל-Firebase Console:**
   - https://console.firebase.google.com/
   - בחר את הפרויקט שלך: `renovation-management`

2. **עבור ל-Google Cloud Console:**
   - לחץ על סמל ההגדרות (⚙️) ליד "Project Overview"
   - בחר "Project settings"
   - גלול למטה ל-"Your apps"
   - תחת "Web app", העתק את ה-Web API Key

3. **הפעל את Google Drive API:**
   - עבור ל-Google Cloud Console: https://console.cloud.google.com/
   - וודא שאתה בפרויקט הנכון (renovation-management)
   - בחר "APIs & Services" > "Library" (ספריית API)
   - חפש "Google Drive API"
   - לחץ על "Enable" (הפעל)

4. **הגדר OAuth Consent Screen:**
   - עבור ל-"APIs & Services" > "OAuth consent screen"
   - אם לא הגדרת, בחר "External" ולחץ "Create"
   - מלא:
     - App name: "מערכת ניהול שיפוצים"
     - User support email: האימייל שלך
     - Developer contact: האימייל שלך
   - לחץ "Save and Continue"
   
   - ב-"Scopes":
     - לחץ "Add or Remove Scopes"
     - חפש וסמן: `https://www.googleapis.com/auth/drive.file`
     - לחץ "Update" ואז "Save and Continue"
   
   - ב-"Test users" (אופציונלי):
     - הוסף את האימייל שלך כמשתמש בדיקה
     - לחץ "Save and Continue"

5. **וודא OAuth Client ID:**
   - עבור ל-"APIs & Services" > "Credentials"
   - אתה אמור לראות Web client (auto created by Google Service)
   - לחץ עליו לעריכה
   - ב-"Authorized JavaScript origins" הוסף:
     - `http://localhost:3000` (לפיתוח)
     - `https://renovation-eight.vercel.app` (לפרודקשן)
   - ב-"Authorized redirect URIs" הוסף:
     - `http://localhost:3000/__/auth/handler` (לפיתוח)
     - `https://renovation-eight.vercel.app/__/auth/handler` (לפרודקשן)
   - לחץ "Save"

## שלב 2: עדכון הקוד (כבר בוצע)

✅ הקוד כבר עודכן והכל מוכן!

## שלב 3: בדיקה

1. הרץ את השרת המקומי:
   ```bash
   npm run dev
   ```

2. עבור לדף הספקים בפרויקט
3. נסה להעלות קובץ (לוגו, חוזה, וכו')
4. תראה את חלון ההסכמה בעברית
5. לאחר אישור, תתבקש להתחבר שוב ל-Google עם הרשאות Drive
6. הקובץ יועלה ל-Google Drive שלך בתיקייה "שיפוץ-קבצים"

## איך המשתמש יכול לבטל הרשאה?

המשתמש יכול לבטל את גישת האפליקציה בכל רגע דרך:
- https://myaccount.google.com/permissions
- או: הגדרות Google → חשבון → אבטחה → אפליקציות של צד שלישי עם גישה לחשבון

## מה קורה אם המשתמש כבר מחובר?

אם המשתמש כבר התחבר בעבר ללא הרשאות Drive, הוא יצטרך:
1. להתנתק מהמערכת
2. להתחבר שוב
3. Google תבקש ממנו לאשר את ההרשאה החדשה של Drive

או לחלופין:
- לעבור ל-https://myaccount.google.com/permissions
- למצוא את האפליקציה "מערכת ניהול שיפוצים"
- ללחוץ "הסר גישה"
- להתחבר שוב למערכת

## אבטחה

- האפליקציה רואה **רק קבצים שהיא יצרה** (scope: `drive.file`)
- לא רואה את כל ה-Drive של המשתמש
- הקבצים נשמרים ב-Drive של המשתמש, לא בשרתים חיצוניים
- המשתמש יכול לראות/לערוך/למחוק את הקבצים ישירות מה-Drive שלו
