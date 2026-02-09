# תיקון בעיית CORS ב-Firebase Storage - מדריך פשוט

## הבעיה
Firebase Storage חוסם העלאת קבצים בגלל הגדרות CORS חסרות.

## הפתרון הקל ביותר - דרך Firebase Console

### שלב 1: פתח את Firebase Console
1. עבור ל-[Firebase Console](https://console.firebase.google.com)
2. בחר את הפרויקט **renovation-management**

### שלב 2: הגדר CORS דרך Google Cloud Console
1. עבור ל-[Google Cloud Console - Storage](https://console.cloud.google.com/storage/browser?project=renovation-management)
2. מצא את ה-bucket שלך (renovation-management.appspot.com)
3. לחץ על שלוש הנקודות (...) ליד שם ה-bucket
4. בחר **Edit bucket permissions**
5. הוסף את ההרשאות הבאות:
   - **Principal**: `allUsers`
   - **Role**: `Storage Object Viewer`

### שלב 3 (אלטרנטיבה): הגדרת CORS דרך gsutil

אם יש לך גישה מלאה לפרויקט, הרץ:

```bash
# התחבר לחשבון שיש לו הרשאות Owner/Editor
gcloud auth login

# הגדר את הפרויקט
gcloud config set project renovation-management

# החל CORS
gsutil cors set firebase-storage-cors.json gs://renovation-management.appspot.com
```

### שלב 4: וודא ש-Storage Rules מאפשרות גישה

בקובץ `storage.rules`, וודא שהכללים מאפשרים למשתמשים מחוברים להעלות קבצים:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### שלב 5: פרסם את הכללים

```bash
firebase deploy --only storage
```

## בדיקה

לאחר ביצוע השלבים, רענן את האפליקציה ונסה שוב להעלות קובץ לוגו.

## פתרון נוסף: שנה את אופן ההעלאה

במידה והבעיה נמשכת, אפשר להעלות קבצים דרך Firebase Admin SDK בצד השרת (Cloud Functions) במקום ישירות מהדפדפן.
