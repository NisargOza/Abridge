export type Status = 'likely_eligible' | 'likely_ineligible' | 'needs_more_information'
export type Tri = boolean | null
export interface Household { state: string; household_size: number; monthly_gross_income: number; household_confirmed: Tri; lifeline_already_received: Tri; school_participating: Tri; wic_category: Tri }
export interface Source { id: string; source_url: string; source_title: string; fetched_at: string; rule_year: string; effective_from: string; effective_to: string }
export interface Program { id: string; name: string; category: string; status: Status; scope: string; reason: string; missing: string[]; next_step: string; application_url: string; source: Source; income_limit_monthly: number | null; modeled: boolean }
export interface Screening { programs: Program[]; annual_poverty_guideline: number | null; poverty_percentage: number | null; rule_year: number; disclaimer: string }
export interface Debt { id: string; name: string; balance: number; apr: number; minimum_payment: number }
export interface Expenses { housing: number; utilities: number; food: number; transport: number; health: number; other: number }
export interface BudgetInput { monthly_take_home: number; monthly_gross_income: number; expenses: Expenses; debts: Debt[]; extra_payment: number }
export interface Strategy { name: string; months: number | null; interest: number; total_paid: number; order: string[]; timeline: { month: number; balance: number }[]; note: string }
export interface BudgetResult { essentials: number; minimum_payments: number; remaining: number; funded_extra: number; funding_gap: number; dti_percentage: number | null; dti_label: string; strategies: Strategy[]; notes: string[] }
export interface Rewrite { title: string; plain_language: string; action_items: string[] }
export interface DocumentResult { mode: 'local_ai' | 'original_only'; rewrite: Rewrite | null; original: string; message: string }
export interface Explanation { items: { source_id: string; excerpt: string; explanation: string; source_url: string; source_title: string }[] }
export interface Health { status: string; local_ai: boolean; rule_year: number }
