# תיקון בעיית CORS ב-Firebase Storage

## הבעיה
Firebase Storage חוסם העלאת קבצים מהדומיין של Vercel בגלל מדיניות CORS.

## הפתרון

### שלב 1: התקן את Google Cloud SDK (אם עוד לא מותקן)

```bash
# Mac (עם Homebrew)
brew install google-cloud-sdk

# או הורד מ-https://cloud.google.com/sdk/docs/install
```

### שלב 2: התחבר ל-Google Cloud

```bash
gcloud auth login
```

### שלב 3: הגדר את ה-project

```bash
gcloud config set project renovation-management
```

### שלב 4: החל את הגדרות CORS

```bash
gsutil cors set firebase-storage-cors.json gs://renovation-management.firebasestorage.app
```

### שלב 5: בדוק שההגדרות הועלו

```bash
gsutil cors get gs://renovation-management.firebasestorage.app
```

## דרך חלופית: דרך Firebase Console

1. עבור אל [Firebase Console](https://console.firebase.google.com)
2. בחר את הפרויקט `renovation-management`
3. לך ל-Storage
4. לחץ על "Rules"
5. וודא שה-rules מאפשרים העלאה:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## בדיקה

אחרי שהחלת את ההגדרות, נסה להעלות שוב קובץ לוגו באפליקציה.

## פתרון זמני (אם לא עובד)

אם עדיין יש בעיה, אפשר להעלות קבצים דרך Cloud Functions במקום ישירות מהדפדפן.
