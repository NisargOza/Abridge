import type { BudgetInput, BudgetResult, DocumentResult, Explanation, Health, Household, Screening } from './types'

const BASE = 'http://127.0.0.1:8000/api'
const pending = new Set<AbortController>()
export const clearPendingRequests = () => { pending.forEach(controller => controller.abort()); pending.clear() }

const request = async <T>(path: string, body?: unknown): Promise<T> => {
  const controller = new AbortController()
  pending.add(controller)
  const timeout = setTimeout(() => controller.abort(), path === '/document' || path === '/explain' ? 125000 : 10000)
  try {
    const response = await fetch(BASE + path, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', credentials: 'omit', signal: controller.signal })
    if (!response.ok) {
      const error: unknown = await response.json()
      if (error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string') throw new Error(error.detail)
      throw new Error('Check your entries and try again.')
    }
    return await response.json() as T
  } catch (error) {
    if (error instanceof Error && error.name !== 'TypeError' && error.name !== 'AbortError') throw error
    throw new Error('The local engine could not respond. Start it on this computer, then try again.')
  } finally { clearTimeout(timeout); pending.delete(controller) }
}
export const api = {
  health: () => request<Health>('/health'),
  screen: (household: Household) => request<Screening>('/screen', household),
  budget: (budget: BudgetInput) => request<BudgetResult>('/budget', budget),
  document: (text: string) => request<DocumentResult>('/document', { text }),
  explain: (household: Household) => request<Explanation>('/explain', { household }),
}
