// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

// Felrapporten ska skickas – men inte på riktigt i testet
const sendFeedback = vi.fn(async () => true);
const reportError = vi.fn();
vi.mock('../../utils/sendFeedback', () => ({ sendFeedback }));
vi.mock('../../utils/monitoring', () => ({ reportError }));

const { default: ErrorBoundary } = await import('../ErrorBoundary');

function Crash(): never {
  throw new Error('Testkrasch');
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('felrutan', () => {
  test('en krasch visar en vänlig ruta i stället för en vit sida', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React loggar kraschen
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Hoppsan, något gick fel')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ladda om sidan' })).toBeTruthy();
    expect(reportError).toHaveBeenCalledOnce();
    await waitFor(() => expect(sendFeedback).toHaveBeenCalledWith('crash', 'Error: Testkrasch', expect.any(Object)));
    expect(await screen.findByText(/Vi har fått en rapport om felet/)).toBeTruthy();
  });

  test('utan krasch visas innehållet som vanligt', () => {
    render(
      <ErrorBoundary>
        <p>Allt fungerar</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Allt fungerar')).toBeTruthy();
    expect(reportError).not.toHaveBeenCalled();
  });
});
