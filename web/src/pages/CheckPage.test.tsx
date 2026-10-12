import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CheckPage } from './CheckPage'
import { api } from '../lib/api'

afterEach(() => vi.restoreAllMocks())
it('submits unanswered program facts as unknown rather than guessing', async () => {
  const spy = vi.spyOn(api, 'screen').mockResolvedValue({ programs: [], annual_poverty_guideline: 15960, poverty_percentage: 75, rule_year: 2026, disclaimer: 'Prescreen' })
  const complete = vi.fn()
  render(<CheckPage initial={null} onComplete={complete}/>)
  fireEvent.change(screen.getByLabelText('Where do you live?'), { target: { value: 'NY' } })
  fireEvent.change(screen.getByLabelText('Monthly household income before taxes ($)'), { target: { value: '1000' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'See my support options' }))
  await waitFor(() => expect(complete).toHaveBeenCalled())
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ monthly_gross_income: 1000, household_confirmed: null, school_participating: null, lifeline_already_received: null }))
})
