// רשימת מנהלי המערכת
// כדי להוסיף מנהל חדש, הוסף את האימייל שלו לרשימה

export const SUPER_ADMINS = [
  'diegosh@gmail.com', // מנהל ראשי
  // הוסף כאן אימיילים נוספים של מנהלים
];

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMINS.includes(email.toLowerCase());
}
