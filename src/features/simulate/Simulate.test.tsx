import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/lib/store'
import { Simulate } from './Simulate'

// `delay: null` makes userEvent dispatch events synchronously instead of
// waiting real milliseconds between keystrokes. The default per-keystroke
// delay is meant to simulate a human typing; it also means a two-field test
// can take several real seconds on a slow machine, which is exactly what
// timed out here — nothing in the app was slow, the simulated typing was.
function setup() {
  return userEvent.setup({ delay: null })
}

function renderSimulate() {
  return render(
    <MemoryRouter>
      <StoreProvider>
        <Simulate />
      </StoreProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('<Simulate />', () => {
  it('disables committing until a valid decision exists', async () => {
    const user = setup()
    renderSimulate()
    const commit = screen.getByRole('button', { name: /take this decision/i })
    const amountInput = screen.getByLabelText(/^amount/i)

    await user.clear(amountInput)
    await user.type(amountInput, '0')
    expect(commit).toBeDisabled()

    await user.clear(amountInput)
    await user.type(amountInput, '500')
    expect(commit).toBeEnabled()
  }, 15000)

  it('applying a preset fills the form and shows a live verdict without committing anything', async () => {
    const user = setup()
    renderSimulate()
    await user.click(screen.getByRole('button', { name: /phone screen repair/i }))

    expect(screen.getByLabelText(/^amount/i)).toHaveValue(2800)
    // A verdict renders before any commit — nothing has been saved yet.
    expect(await screen.findByText(/run out of money|fits comfortably|costs you a lot/i)).toBeInTheDocument()
    expect(screen.queryByText(/decision taken/i)).not.toBeInTheDocument()
  }, 15000)

  it('committing a decision shows a confirmation and the amount leaves the form intact for review', async () => {
    const user = setup()
    renderSimulate()
    await user.click(screen.getByRole('button', { name: /concert ticket/i }))
    await user.click(screen.getByRole('button', { name: /take this decision/i }))

    expect(await screen.findByText(/decision taken/i)).toBeInTheDocument()
  }, 15000)

  it('switching to "move to savings" swaps the form to a goal picker without crashing', async () => {
    const user = setup()
    renderSimulate()
    const savingRadio = screen.getByRole('radio', { name: /move to savings/i })
    await user.click(savingRadio)
    expect(await screen.findByLabelText(/which goal/i)).toBeInTheDocument()
  }, 15000)
})
