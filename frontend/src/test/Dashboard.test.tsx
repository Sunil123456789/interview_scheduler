import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Dashboard from '../pages/Dashboard';

vi.mock('../api/client', () => ({
  getAllInterviews: vi.fn(),
}));

import { getAllInterviews } from '../api/client';

const mockedGetAllInterviews = vi.mocked(getAllInterviews);

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when interviews list is empty', async () => {
    mockedGetAllInterviews.mockResolvedValue({ data: { interviews: [] } } as never);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('No interviews scheduled yet')).toBeInTheDocument();
    });
  });

  it('renders interview cards when data is present', async () => {
    mockedGetAllInterviews.mockResolvedValue({
      data: {
        interviews: [
          {
            id: 1,
            candidate: 'John Doe',
            status: 'scheduled',
            scheduled_start: '2026-03-05T10:00:00Z',
            scheduled_end: '2026-03-05T11:00:00Z',
            meet_link: 'https://meet.google.com/test-link',
            same_area_aom: 'AOM One',
            diff_area_aom: 'AOM Two',
            failure_reason: '',
          },
        ],
      },
    } as never);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Join Meeting')).toBeInTheDocument();
    });
  });
});
