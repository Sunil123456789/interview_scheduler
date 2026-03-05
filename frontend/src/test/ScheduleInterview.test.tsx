import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ScheduleInterview from '../pages/ScheduleInterview';

vi.mock('../api/client', () => ({
  scheduleInterview: vi.fn(),
}));

import { scheduleInterview } from '../api/client';

const mockedScheduleInterview = vi.mocked(scheduleInterview);

describe('ScheduleInterview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits candidate id and shows success message', async () => {
    mockedScheduleInterview.mockResolvedValue({ data: { task_id: 'task-123' } } as never);
    const user = userEvent.setup();

    render(<ScheduleInterview />);

    await user.type(screen.getByPlaceholderText('Enter candidate ID'), '1');
    await user.click(screen.getByRole('button', { name: /schedule interview/i }));

    await waitFor(() => {
      expect(mockedScheduleInterview).toHaveBeenCalledWith(1);
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('task-123')).toBeInTheDocument();
    });
  });

  it('shows API error message on failure', async () => {
    mockedScheduleInterview.mockRejectedValue({
      response: { data: { error: 'Candidate not found' } },
    } as never);
    const user = userEvent.setup();

    render(<ScheduleInterview />);

    await user.type(screen.getByPlaceholderText('Enter candidate ID'), '999');
    await user.click(screen.getByRole('button', { name: /schedule interview/i }));

    await waitFor(() => {
      expect(screen.getByText('Candidate not found')).toBeInTheDocument();
    });
  });
});
