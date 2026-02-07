# 🚀 הוראות הפעלה מהירות

## צעד אחר צעד:

### 1️⃣ וודא שהשרת רץ
```bash
cd renovation-app
npm run dev
```

### 2️⃣ פתח את האתר והתחבר
```
http://localhost:3000
```

### 3️⃣ צור פרויקט חדש או היכנס לקיים

### 4️⃣ העתק את ה-Project ID מה-URL
```
http://localhost:3000/dashboard/ABC123XYZ
                                ^^^^^^^^^
                                העתק את זה
```

### 5️⃣ הרץ את הסקריפט להוספת נתוני דמו

פתח טרמינל **חדש** (השאר את השרת רץ!) והרץ:

```bash
cd renovation-app
npx ts-node scripts/seed-demo-data.ts ABC123XYZ
```
*(החלף ABC123XYZ ב-ID האמיתי שלך)*

### 6️⃣ חזור לדפדפן ורענן (F5)

תראה:
- ✅ 4 חדרים בדף החדרים
- ✅ 10 משימות בדף המשימות  
- ✅ 4 ספקים + 5 תשלומים בדף הספקים
- ✅ Dashboard עם כל הנתונים!

---

## 🎯 דוגמה מלאה

```bash
# טרמינל 1: השרת
cd renovation-app
npm run dev

# טרמינל 2: הסקריפט
cd renovation-app
npx ts-node scripts/seed-demo-data.ts 0FMy4VgR2lNX8K7lB9MO
```

---

## ❓ בעיות?

### אין לי project ID
היכנס ל-dashboard, תראה URL כזה:
```
http://localhost:3000/dashboard/[זה_ה_ID]
```

### הסקריפט נכשל
וודא ש:
- ✅ יש לך `.env.local` עם כל הנתונים
- ✅ Firebase מוגדר נכון
- ✅ רץ `npm install` בתיקייה

### לא רואה נתונים
- ✅ רענן את הדף (F5)
- ✅ וודא שה-Project ID נכון
- ✅ פתח Console (F12) וחפש שגיאות

---

זהו! 🎉
