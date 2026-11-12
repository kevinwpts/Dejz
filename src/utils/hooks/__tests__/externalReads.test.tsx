// @vitest-environment jsdom
// Hookarna som läser localStorage måste läsa om värdet även med React Compiler (som memoiserar allt).
import { afterEach, describe, expect, test } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useExternalSnapshot } from '../useExternalSnapshot';
import { useSavingsGoals } from '../useSavingsGoals';
import { saveSavingsGoals, type SavingsGoalItem } from '../../appCache';
import { useRetainedValue } from '../../../components/modals/useRetainedValue';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('useExternalSnapshot', () => {
  test('läser om när deps ändras, men inte annars', () => {
    let reads = 0;
    let stored = 'a';
    const read = () => {
      reads += 1;
      return stored;
    };
    const { result, rerender } = renderHook(({ open }) => useExternalSnapshot(read, [open]), {
      initialProps: { open: false },
    });
    expect(result.current).toBe('a');
    stored = 'b';
    rerender({ open: false });
    expect(result.current).toBe('a');
    rerender({ open: true });
    expect(result.current).toBe('b');
    expect(reads).toBe(2);
  });
});

describe('useSavingsGoals', () => {
  test('uppdateras när sparmålen sparas', () => {
    const { result } = renderHook(() => useSavingsGoals());
    expect(result.current).toEqual([]);
    const goal: SavingsGoalItem = { id: 'g1', name: 'Resa', targetAmount: 10000, currentAmount: 0 };
    act(() => saveSavingsGoals([goal]));
    expect(result.current.map((g) => g.name)).toEqual(['Resa']);
  });
});

describe('useRetainedValue', () => {
  test('behåller senaste värdet när det blir null (stängningsanimation)', () => {
    const initialProps: { v: string | null } = { v: 'köp 1' };
    const { result, rerender } = renderHook(({ v }) => useRetainedValue(v), { initialProps });
    expect(result.current).toBe('köp 1');
    rerender({ v: null });
    expect(result.current).toBe('köp 1');
    rerender({ v: 'köp 2' });
    expect(result.current).toBe('köp 2');
  });
});
