import { describe, test, expect } from 'vitest';
import { getUrgency, urgencyMeta, isAlerting, SOON_DAYS } from '../utils/deadlines';

const TODAY = new Date(2026, 6, 8); // 2026-07-08 (חודש 6 = יולי)

describe('getUrgency', () => {
  test('מסמך שהוגש/הושלם → done (בלי התראה)', () => {
    expect(getUrgency('2026-01-01', 'submitted', TODAY).level).toBe('done');
    expect(getUrgency('2026-01-01', 'completed', TODAY).level).toBe('done');
    expect(getUrgency('2026-01-01', 'verified', TODAY).level).toBe('done');
  });

  test('בלי מועד → none', () => {
    expect(getUrgency(null, 'pending', TODAY).level).toBe('none');
    expect(getUrgency('', 'pending', TODAY).level).toBe('none');
  });

  test('מועד שעבר → overdue עם daysLeft שלילי', () => {
    const r = getUrgency('2026-04-30', 'pending', TODAY);
    expect(r.level).toBe('overdue');
    expect(r.daysLeft).toBeLessThan(0);
  });

  test('מועד בעוד יומיים → soon', () => {
    expect(getUrgency('2026-07-10', 'pending', TODAY).level).toBe('soon');
  });

  test('מועד היום → soon עם daysLeft=0', () => {
    const r = getUrgency('2026-07-08', 'pending', TODAY);
    expect(r.level).toBe('soon');
    expect(r.daysLeft).toBe(0);
  });

  test(`גבול "מתקרב" הוא ${SOON_DAYS} ימים`, () => {
    // בדיוק בגבול → soon; יום אחרי → ok
    const boundary = new Date(2026, 6, 8 + SOON_DAYS);
    const past = new Date(2026, 6, 8 + SOON_DAYS + 1);
    const iso = (d) => d.toISOString().slice(0, 10);
    expect(getUrgency(iso(boundary), 'pending', TODAY).level).toBe('soon');
    expect(getUrgency(iso(past), 'pending', TODAY).level).toBe('ok');
  });

  test('מועד רחוק → ok', () => {
    expect(getUrgency('2026-12-31', 'pending', TODAY).level).toBe('ok');
  });
});

describe('urgencyMeta / isAlerting', () => {
  test('overdue ו-soon מפעילים התראה; ok ו-done לא', () => {
    expect(isAlerting('overdue')).toBe(true);
    expect(isAlerting('soon')).toBe(true);
    expect(isAlerting('ok')).toBe(false);
    expect(isAlerting('done')).toBe(false);
    expect(isAlerting('none')).toBe(false);
  });

  test('urgencyMeta מחזיר צבע ותווית מתאימים', () => {
    expect(urgencyMeta('overdue', -5).label).toContain('באיחור');
    expect(urgencyMeta('soon', 3).label).toContain('3');
    expect(urgencyMeta('soon', 0).label).toContain('היום');
    expect(urgencyMeta('ok').color).toBeTruthy();
  });
});
