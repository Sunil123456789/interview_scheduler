import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Admin from '../pages/Admin';

vi.mock('../api/client', () => ({
  getAnalytics: vi.fn(),
  getAreas: vi.fn(),
  createArea: vi.fn(),
  getAOMs: vi.fn(),
  createAOM: vi.fn(),
  getCandidates: vi.fn(),
  createCandidate: vi.fn(),
}));

import {
  getAnalytics,
  getAreas,
  createArea,
  getAOMs,
  getCandidates,
} from '../api/client';

const mockedGetAnalytics = vi.mocked(getAnalytics);
const mockedGetAreas = vi.mocked(getAreas);
const mockedCreateArea = vi.mocked(createArea);
const mockedGetAOMs = vi.mocked(getAOMs);
const mockedGetCandidates = vi.mocked(getCandidates);

describe('Admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetAnalytics.mockResolvedValue({
      data: {
        summary: {
          total_candidates: 1,
          total_areas: 2,
          total_aoms: 3,
          total_interviews: 4,
        },
        interview_stats: {
          scheduled: 1,
          failed: 1,
          pending: 1,
          completed: 1,
          success_rate: 25,
        },
      },
    } as never);

    mockedGetAreas.mockResolvedValue({ data: { areas: [{ id: 1, name: 'North', aom_count: 1 }] } } as never);
    mockedGetAOMs.mockResolvedValue({ data: { aoms: [] } } as never);
    mockedGetCandidates.mockResolvedValue({ data: { candidates: [] } } as never);
    mockedCreateArea.mockResolvedValue({ data: { id: 2, name: 'East', created: true } } as never);
  });

  it('loads analytics tab by default', async () => {
    render(<Admin />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Interview Statistics')).toBeInTheDocument();
    });
  });

  it('can switch to areas tab and create a new area', async () => {
    const user = userEvent.setup();
    render(<Admin />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /areas/i }));
    await user.type(screen.getByPlaceholderText(/enter area name/i), 'East');
    await user.click(screen.getByRole('button', { name: /add area/i }));

    await waitFor(() => {
      expect(mockedCreateArea).toHaveBeenCalledWith('East');
    });
  });
});
