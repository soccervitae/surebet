export type Profile = {
  id: string
  full_name: string
  email: string
  created_at: string
}

export type UserProfile = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  nickname: string
  cpf: string
  color: string
  is_active: boolean
  created_at: string
}

export type Bookmaker = {
  id: string
  user_profile_id: string
  name: string
  email: string
  password: string
  is_active: boolean
  created_at: string
}

export type BankAccountType = 'deposit' | 'withdrawal'

export type BankAccount = {
  id: string
  bookmaker_id: string
  account_type: BankAccountType
  bank_name: string
  created_at: string
}

export type EntryType = 'deposit' | 'withdrawal' | 'profit' | 'loss' | 'bonus' | 'adjustment'

export type BalanceEntry = {
  id: string
  user_profile_id: string
  bookmaker_id: string | null
  entry_type: EntryType
  amount: number
  description: string | null
  entry_date: string
  created_at: string
}

export type ProfileBalance = {
  user_profile_id: string
  user_id: string
  profile_name: string
  color: string
  current_balance: number
  total_entries: number
  last_activity: string | null
}

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  deposit: 'Depósito',
  withdrawal: 'Saque',
  profit: 'Lucro',
  loss: 'Prejuízo',
  bonus: 'Bônus',
  adjustment: 'Ajuste',
}

export const PROFILE_COLORS = [
  '#7c6af7',
  '#22c55e',
  '#ef4444',
  '#eab308',
  '#3b82f6',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6',
  '#06b6d4',
]

export const POPULAR_BOOKMAKERS = [
  'Bet365',
  'Betano',
  'KTO',
  'Sportingbet',
  'Superbet',
  'Vai de Bet',
  'Estrela Bet',
  'Novibet',
  'Betnacional',
  'Pixbet',
  'Betsson',
  'Parimatch',
  'bet365',
  'Galera Bet',
  'Brazino777',
]
