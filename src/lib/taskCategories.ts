// Shared task categories for the application
export interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export const defaultTaskCategories: TaskCategory[] = [
  { id: '1', name: 'צביעה', icon: '🎨', description: 'עבודות צביעה בכל החדרים', startDate: '2026-02-20', endDate: '2026-02-28' },
  { id: '2', name: 'פרקט', icon: '🟫', description: 'התקנת רצפות פרקט', startDate: '2026-02-10', endDate: '2026-02-18' },
  { id: '3', name: 'חשמל', icon: '⚡', description: 'חיווט ותשתיות חשמל', startDate: '2026-01-15', endDate: '2026-01-25' },
  { id: '4', name: 'אינסטלציה', icon: '🚰', description: 'עבודות אינסטלציה ואינסטלציה', startDate: '2026-01-20', endDate: '2026-01-30' },
  { id: '5', name: 'נגרות', icon: '🪚', description: 'ארונות ונגרות לפי מידה', startDate: '2026-03-01', endDate: '2026-03-15' },
  { id: '6', name: 'אלומיניום', icon: '🪟', description: 'חלונות ודלתות אלומיניום', startDate: '', endDate: '' },
  { id: '7', name: 'ריצוף', icon: '🔳', description: 'ריצוף קרמיקה ואריחים', startDate: '', endDate: '' },
  { id: '8', name: 'גבס', icon: '⬜', description: 'קירות וגבס תקרה', startDate: '', endDate: '' },
  { id: '9', name: 'מיזוג אוויר', icon: '❄️', description: 'התקנת מערכות מיזוג אוויר', startDate: '', endDate: '' },
  { id: '10', name: 'עיצוב', icon: '✨', description: 'שירותי עיצוב פנים', startDate: '', endDate: '' },
];

// Simply return default categories (no localStorage)
// Categories are now managed per-project in Firebase
export const getTaskCategories = (): TaskCategory[] => {
  return defaultTaskCategories;
};

// No-op for backward compatibility
export const saveTaskCategories = (categories: TaskCategory[]): void => {
  // Categories are now managed in Firebase per project
  console.warn('saveTaskCategories is deprecated. Categories are now in Firebase.');
};
