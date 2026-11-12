// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BottomSheet } from '../ui/BottomSheet';

afterEach(cleanup);

describe('bekräftelsedialog', () => {
  const setup = (isOpen = true) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={isOpen}
        title="Ta bort köpet?"
        description="Det går inte att ångra."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel };
  };

  test('visas som dialog med rubrik och text', () => {
    setup();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Ta bort köpet?')).toBeTruthy();
    expect(screen.getByText('Det går inte att ångra.')).toBeTruthy();
  });

  test('"Ta bort" bekräftar, "Avbryt" avbryter', () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ta bort' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  test('Escape avbryter', () => {
    const { onCancel } = setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  test('stängd dialog visar ingenting', () => {
    setup(false);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('bottenark', () => {
  test('visar innehållet när det är öppet och stänger med Escape (efter animationen)', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Lägg till köp">
        <p>Innehåll i arket</p>
      </BottomSheet>,
    );
    expect(screen.getByText('Innehåll i arket')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled(); // stängs mjukt först
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  test('stängt ark försvinner efter animationen', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <BottomSheet isOpen onClose={() => undefined}>
        <p>Innehåll</p>
      </BottomSheet>,
    );
    rerender(
      <BottomSheet isOpen={false} onClose={() => undefined}>
        <p>Innehåll</p>
      </BottomSheet>,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Innehåll')).toBeNull();
    vi.useRealTimers();
  });
});
