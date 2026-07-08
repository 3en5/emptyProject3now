import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import UpdateChecker from '../components/UpdateChecker';

vi.mock('axios');

describe('UpdateChecker — בדיקת עדכון תוכנה', () => {
  beforeEach(() => vi.clearAllMocks());

  test('מציג הודעה כשאין עדכון', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { gitAvailable: true, updateAvailable: false, behind: 0, current: { hash: 'abc1234' }, commits: [] },
    });
    render(<UpdateChecker />);
    fireEvent.click(screen.getByRole('button', { name: /בדיקת עדכון תוכנה/ }));
    expect(await screen.findByText(/אתה מעודכן/)).toBeInTheDocument();
  });

  test('מציג רשימת שינויים וכפתור התקנה כשיש עדכון, וההתקנה נקראת', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        gitAvailable: true,
        updateAvailable: true,
        behind: 2,
        current: { hash: 'abc1234' },
        commits: [
          { hash: 'aaa1111', subject: 'תיקון באג' },
          { hash: 'bbb2222', subject: 'פיצ׳ר חדש' },
        ],
      },
    });
    vi.mocked(axios.post).mockResolvedValue({
      data: { ok: true, current: { hash: 'bbb2222' }, note: 'יש להפעיל מחדש' },
    });
    render(<UpdateChecker />);
    fireEvent.click(screen.getByRole('button', { name: /בדיקת עדכון תוכנה/ }));

    expect(await screen.findByText(/פיצ׳ר חדש/)).toBeInTheDocument();
    expect(screen.getByText(/נמצא עדכון/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /התקן עדכון/ }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/system/update/apply'));
    expect(await screen.findByText(/העדכון הותקן/)).toBeInTheDocument();
  });

  test('מסביר כשלא הותקן דרך Git (ZIP)', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { gitAvailable: false } });
    render(<UpdateChecker />);
    fireEvent.click(screen.getByRole('button', { name: /בדיקת עדכון תוכנה/ }));
    expect(await screen.findByText(/לא הותקנה דרך Git/)).toBeInTheDocument();
  });
});
