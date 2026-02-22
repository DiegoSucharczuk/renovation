export interface Bank {
  code: string;
  name: string;
}

export const ISRAELI_BANKS: Bank[] = [
  { code: '99', name: 'בנק ישראל' },
  { code: '12', name: 'בנק הפועלים' },
  { code: '10', name: 'בנק לאומי' },
  { code: '11', name: 'בנק דיסקונט' },
  { code: '20', name: 'בנק מזרחי טפחות' },
  { code: '14', name: 'בנק אוצר החייל' },
  { code: '17', name: 'בנק מרכנתיל דיסקונט' },
  { code: '09', name: 'בנק הדואר' },
  { code: '13', name: 'בנק איגוד' },
  { code: '46', name: 'בנק מסד' },
  { code: '54', name: 'בנק ירושלים' },
  { code: '22', name: 'בנק סיטי בנק (Citibank N.A)' },
  { code: '23', name: 'בנק HSBC' },
  { code: '68', name: 'בנק דקסיה' },
  { code: '04', name: 'בנק יהב לעובדי מדינה' },
  { code: '25', name: 'בנק BNP Paribas Israel' },
  { code: '26', name: 'בנק יובנק בע"מ' },
  { code: '31', name: 'הבנק הבינלאומי הראשון לישראל' },
  { code: '34', name: 'בנק ערבי ישראל בע"מ' },
  { code: '39', name: 'בנק SBI State Bank of India' },
  { code: '50', name: 'מרכז סליקה בנקאי בע"מ' },
  { code: '52', name: 'בנק פועלי אגודת ישראל בע"מ' },
  { code: '59', name: 'שירותי בנק אוטומטיים בע"מ' },
  { code: '65', name: 'חסך קופת חסכון לחינוך בע"מ, חיפה' },
  { code: '77', name: 'בנק לאומי למשכנתאות בע"מ' },
  { code: '90', name: 'בנק דיסקונט למשכנתאות בע"מ' },
];

export const getBankLabel = (code: string): string => {
  const bank = ISRAELI_BANKS.find(b => b.code === code);
  return bank ? `${bank.code} - ${bank.name}` : code;
};

export const getBankName = (code: string): string => {
  const bank = ISRAELI_BANKS.find(b => b.code === code);
  return bank ? bank.name : '';
};

export const getBankCode = (name: string): string => {
  const bank = ISRAELI_BANKS.find(b => b.name === name || b.code === name);
  return bank ? bank.code : '';
};
