import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ClassFormModal from '@/components/StudyFlow/ClassFormModal';
import { ScheduleProvider } from '@/context/ScheduleContext';
import { SCHEDULE_KEY } from '@/lib/data';

describe('ClassFormModal Subject Autofill', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Pre-populate schedule with classes
    window.localStorage.setItem(
      SCHEDULE_KEY,
      JSON.stringify([
        {
          id: 'test-1',
          subject: 'SE2231 - Data Structures & Algorithm Analysis',
          day: 4,
          startTime: '14:00',
          endTime: '15:30',
          colorClass: 'subject-math',
        },
        {
          id: 'test-2',
          subject: 'SE2205 - Computer Organization & Architecture',
          day: 1,
          startTime: '14:00',
          endTime: '15:30',
          colorClass: 'subject-web',
        },
      ])
    );
  });

  it('filters and displays existing schedule classes when the student types a search query', async () => {
    render(
      <ScheduleProvider>
        <ClassFormModal open={true} onOpenChange={vi.fn()} editingSession={null} />
      </ScheduleProvider>
    );

    const input = screen.getByLabelText(/Subject Name/i) as HTMLInputElement;
    expect(input).toBeDefined();

    // Type "d" in the subject input
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'd' } });

    // Both the dropdown and suggestions should show Data Structures
    const matchingElements = screen.getAllByText(/Data Structures/i);
    expect(matchingElements.length).toBeGreaterThan(0);

    // Click the matching suggestion
    fireEvent.click(matchingElements[0]);

    // The input value should now be autofilled with the full class name
    expect(input.value).toBe('SE2231 - Data Structures & Algorithm Analysis');
  });

  it('supports selecting autofill suggestions using keyboard navigation', async () => {
    render(
      <ScheduleProvider>
        <ClassFormModal open={true} onOpenChange={vi.fn()} editingSession={null} />
      </ScheduleProvider>
    );

    const input = screen.getByLabelText(/Subject Name/i) as HTMLInputElement;

    // Type "comp" to search for Computer Organization
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'comp' } });

    // Arrow down to highlight first suggestion, then press Enter
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Input should be filled
    expect(input.value).toBe('SE2205 - Computer Organization & Architecture');
  });
});
