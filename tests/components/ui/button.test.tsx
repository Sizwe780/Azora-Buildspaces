/** @jest-environment jsdom */
import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button component', () => {
  it('renders correctly with default styles', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    // It should have the default variant classes
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
  })

  it('applies the appropriate variant classes', () => {
    render(<Button variant="destructive">Destructive Action</Button>)
    const button = screen.getByRole('button', { name: /destructive action/i })
    expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground')
  })

  it('applies the appropriate size classes', () => {
    render(<Button size="lg">Large Button</Button>)
    const button = screen.getByRole('button', { name: /large button/i })
    expect(button).toHaveClass('h-10', 'rounded-md', 'px-8')
  })

  it('handles click events and can be disabled', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    const { rerender } = render(<Button onClick={handleClick}>Action</Button>)
    const button = screen.getByRole('button', { name: /action/i })
    
    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)

    rerender(<Button onClick={handleClick} disabled>Action</Button>)
    expect(button).toBeDisabled()
    
    await user.click(button)
    // shouldn't increment because userEvent checks disabled state
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders as a different element using asChild', () => {
    // Requires asChild to change the rendered wrapping element
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: /link button/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })
})
