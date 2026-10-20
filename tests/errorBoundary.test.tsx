import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';

const BrokenComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Deliberate test explosion in component tree');
  }
  return <div>Healthy component content</div>;
};

describe('ErrorBoundary Component (M9.5 / fix-payments-blank)', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Suppress console.error in test runner output since we expect an error to be logged
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children normally when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Healthy component content')).toBeDefined();
    expect(screen.queryByText('Something went wrong on this page.')).toBeNull();
  });

  it('catches render errors and displays plain text fallback with outline buttons', () => {
    const { container } = render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Assert fallback plain text
    expect(screen.getByText('Something went wrong on this page.')).toBeDefined();

    // Assert outline buttons
    const reloadBtn = screen.getByRole('button', { name: /Reload page/i });
    expect(reloadBtn).toBeDefined();
    expect(reloadBtn.className).toContain('border');

    const resetBtn = screen.getByRole('button', { name: /Reset demo data/i });
    expect(resetBtn).toBeDefined();
    expect(resetBtn.className).toContain('border');

    // Assert NO stack trace in the UI
    expect(container.textContent).not.toContain('Deliberate test explosion');
    expect(container.textContent).not.toContain('at BrokenComponent');

    // Assert error and component stack were logged to console.error only
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('opens confirmation modal when Reset demo data button is clicked', async () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const resetBtn = screen.getByRole('button', { name: /Reset demo data/i });
    fireEvent.click(resetBtn);

    // Modal opens with confirmation message
    await waitFor(() => {
      expect(
        screen.getByText(/This will restore all clinic data to its initial demonstration state/i)
      ).toBeDefined();
      expect(screen.getByRole('button', { name: /Confirm reset/i })).toBeDefined();
    });
  });
});

