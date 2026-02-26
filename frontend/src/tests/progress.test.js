import { describe, it, expect } from 'vitest';
import { calculateCompletion } from '../utils/progress';

describe('calculateCompletion', () => {
  it('should return 0 for empty list', () => {
    expect(calculateCompletion([])).toBe(0);
  });

  it('should calculate percentage correctly', () => {
    const tasks = [
      { status: 'done' },
      { status: 'todo' },
      { status: 'in_progress' },
      { status: 'done' },
    ];
    expect(calculateCompletion(tasks)).toBe(50);
  });

  it('should return 100 for all done tasks', () => {
    const tasks = [
      { status: 'done' },
      { status: 'done' },
    ];
    expect(calculateCompletion(tasks)).toBe(100);
  });

  it('should return 0 for no done tasks', () => {
    const tasks = [
      { status: 'todo' },
      { status: 'in_progress' },
    ];
    expect(calculateCompletion(tasks)).toBe(0);
  });
});
