# Date Formatting Guide

## Overview

This guide documents the centralized date formatting utilities created to ensure consistency across the renovation management app.

## Problem

Previously, date formatting was inconsistent across the codebase:
- Some files used `.replace(/\./g, '-')` assuming dots as separators
- Some files used `.split('/').reverse().join('-')` assuming slashes
- Hebrew locale (`he-IL`) returns different formats depending on browser/environment
- Code duplication across multiple components

## Solution

Created `/src/lib/dateUtils.ts` with centralized formatting functions.

## Usage

### Import

```typescript
import { formatDateShort, formatDateLong, calculateDaysOverdue } from '@/lib/dateUtils';
// OR
import { formatDate } from '@/lib/dateUtils';
```

### Available Functions

#### 1. **formatDateShort** (or `formatDate.short`)
**Format:** `dd-mm-yyyy`
**Use for:** Tables, compact displays, payment dates

```typescript
formatDateShort(new Date()) // "25-02-2026"
formatDateShort(null) // "—"
formatDateShort("2026-02-25") // "25-02-2026"
```

#### 2. **formatDateLong** (or `formatDate.long`)
**Format:** Full weekday and month names
**Use for:** Detailed views, meeting details, dashboard summaries

```typescript
formatDateLong(new Date()) // "יום שלישי, 25 בפברואר 2026"
```

#### 3. **formatDateMedium** (or `formatDate.medium`)
**Format:** Abbreviated month
**Use for:** Cards, lists with limited space

```typescript
formatDateMedium(new Date()) // "25 בפבר׳ 2026"
```

#### 4. **formatDateWithWeekday** (or `formatDate.withWeekday`)
**Format:** Short weekday with abbreviated month
**Use for:** Meeting lists, upcoming events

```typescript
formatDateWithWeekday(new Date()) // "יום ג׳, 25 בפבר׳"
```

#### 5. **formatDateNoYear** (or `formatDate.noYear`)
**Format:** Day and month only
**Use for:** Current year dates where year is obvious

```typescript
formatDateNoYear(new Date()) // "25 בפברואר"
```

#### 6. **calculateDaysOverdue**
**Returns:** Number of days (positive = overdue, negative = future)
**Use for:** Payment overdue calculations, task deadlines

```typescript
calculateDaysOverdue(new Date('2026-02-20')) // 5 (5 days overdue)
calculateDaysOverdue(new Date('2026-03-01')) // -4 (4 days until due)
```

#### 7. **isDateInPast**
**Returns:** boolean
**Use for:** Conditional styling, validation

```typescript
isDateInPast(new Date('2026-02-20')) // true
isDateInPast(new Date('2026-03-01')) // false
```

#### 8. **isToday**
**Returns:** boolean
**Use for:** Highlighting today's meetings/tasks

```typescript
isToday(new Date()) // true
```

#### 9. **toInputDate** / **fromInputDate**
**Use for:** HTML date inputs (yyyy-mm-dd format)

```typescript
toInputDate(new Date()) // "2026-02-25"
fromInputDate("2026-02-25") // Date object
```

## Migration Guide

### Files to Update (8 total)

1. ✅ **src/lib/dateUtils.ts** - CREATED
2. ⚠️ **src/app/dashboard/[projectId]/payments/page.tsx** - Partially done (uncommitted)
3. ⚠️ **src/app/dashboard/[projectId]/vendors/page.tsx** - Partially done (uncommitted)
4. ⚠️ **src/app/dashboard/[projectId]/meetings/page.tsx** - Needs update
5. ⚠️ **src/app/dashboard/[projectId]/page.tsx** - Needs update
6. ⚠️ **src/app/dashboard/[projectId]/settings/page.tsx** - Needs update
7. ⚠️ **src/app/dashboard/[projectId]/settings/users/page.tsx** - Needs update
8. ⚠️ **src/app/projects/page.tsx** - Needs update
9. ⚠️ **src/app/admin/page.tsx** - Needs update

### Example Replacements

#### Before:
```typescript
// Old inconsistent approaches
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  const formatted = date.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatted.replace(/\./g, '-'); // Assumes dots
};

// OR
date.toLocaleDateString('he-IL').replace(/\./g, '-')

// OR
date.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' })
  .split('/').reverse().join('-')
```

#### After:
```typescript
import { formatDateShort } from '@/lib/dateUtils';

// Simple and consistent
formatDateShort(dateString)
```

### Search & Replace Pattern

**Find:** `date\.toLocaleDateString\('he-IL'.*?\)`
**Replace with:** `formatDateShort(date)` or appropriate format function

## Benefits

✅ **Consistency** - All dates formatted identically across the app
✅ **Maintainability** - Change format in one place
✅ **Type Safety** - Proper TypeScript types
✅ **Edge Cases** - Handles null/undefined/invalid dates gracefully
✅ **DRY Principle** - No code duplication
✅ **Documentation** - Clear JSDoc comments for each function
✅ **Testability** - Easy to unit test in isolation

## Testing

Once migrated, you can add tests like:

```typescript
import { formatDateShort, calculateDaysOverdue } from '@/lib/dateUtils';

describe('dateUtils', () => {
  it('formats dates consistently', () => {
    expect(formatDateShort(new Date('2026-02-25'))).toBe('25-02-2026');
  });

  it('handles null dates', () => {
    expect(formatDateShort(null)).toBe('—');
  });

  it('calculates days overdue correctly', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    expect(calculateDaysOverdue(pastDate)).toBe(5);
  });
});
```

## Next Steps

1. Commit the new `dateUtils.ts` file
2. Update files one by one (start with payments/vendors since partially done)
3. Test thoroughly in Hebrew locale
4. Consider adding unit tests
5. Remove old local `formatDate` functions from components

## Notes

- The `.split('/').reverse().join('-')` approach is browser-safe for Hebrew locale
- All functions return `'—'` (em dash) for invalid dates for visual consistency
- Helper functions like `calculateDaysOverdue` reduce logic duplication
- Consider adding more helpers as needed (e.g., `formatDateTime` for timestamps)
