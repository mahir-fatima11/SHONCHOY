import type { HonchoyData } from './types'

/**
 * The starter snapshot. It mirrors the canonical $honchoy data shape exactly,
 * so a fresh device opens on a working example instead of an empty screen.
 */
export const SAMPLE_DATA: HonchoyData = {
  app: '$honchoy',
  user: {
    ageConfirmed: true,
    language: 'en',
    currency: 'USD',
  },
  income: {
    type: 'monthly',
    sources: [{ name: 'salary', amount: 20000 }],
  },
  expenses: [
    { id: 'e1', category: 'rent', name: 'House rent', amount: 6000, type: 'fixed' },
    { id: 'e2', category: 'food', name: 'Groceries', amount: 3000, type: 'variable' },
    { id: 'e3', category: 'transport', name: 'Bus & taxi', amount: 700, type: 'variable' },
    { id: 'e4', category: 'utilities', name: 'Electricity & water', amount: 600, type: 'variable' },
    { id: 'e5', category: 'school', name: 'School fees', amount: 900, type: 'fixed' },
    { id: 'e6', category: 'phone', name: 'Phone & internet', amount: 300, type: 'fixed' },
  ],
  debts: [
    {
      id: 'd1',
      type: 'microloan',
      name: 'MFI working-capital loan',
      amount: 5000,
      interestRate: 20,
      minMonthlyPayment: 500,
    },
    {
      id: 'd2',
      type: 'bank_loan',
      name: 'Bank salary loan',
      amount: 12000,
      interestRate: 12,
      minMonthlyPayment: 700,
    },
    {
      id: 'd3',
      type: 'credit_purchase',
      name: 'Shop credit — fridge',
      amount: 1800,
      interestRate: 34,
      minMonthlyPayment: 250,
    },
  ],
  goals: [
    { id: 'g1', name: 'Sewing machine', cost: 15000, saved: 3000, type: 'custom' },
    { id: 'g2', name: 'Emergency fund', cost: 34500, saved: 9000, type: 'emergency_fund' },
  ],
  logs: [
    { date: '2026-09-22', amount: 320, note: 'Groceries' },
    { date: '2026-09-23', amount: 180, note: 'Bus + lunch' },
    { date: '2026-09-24', amount: 450, note: 'School books' },
    { date: '2026-09-25', amount: 1000, note: '' },
  ],
}

/** Expense categories offered in the picker. Free text is still allowed. */
export const CATEGORIES = [
  'rent',
  'food',
  'transport',
  'utilities',
  'school',
  'health',
  'phone',
  'clothing',
  'family',
  'debt',
  'other',
] as const

/** Labels used by the debt form and the debt table. */
export const DEBT_TYPE_LABELS: Record<string, string> = {
  bank_loan: 'Bank loan',
  microloan: 'Microloan / MFI',
  informal: 'Informal / family loan',
  credit_purchase: 'Credit purchase',
}
