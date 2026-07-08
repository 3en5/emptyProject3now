import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReadOnlyContext } from '../ReadOnlyContext';
import EntityList from '../components/EntityList';
import AccountsPage from '../pages/AccountsPage';

const entities = [{ id: 1, name: 'בנק מזרחי', type: 'bank', category: 'משפחתי' }];
const accounts = [{ id: 1, entity_id: 1, account_name: 'עו״ש', balance: 100, currency: 'ILS', entity_name: 'בנק מזרחי' }];

function renderWith(readOnly, ui) {
  return render(<ReadOnlyContext.Provider value={readOnly}>{ui}</ReadOnlyContext.Provider>);
}

describe('מצב צפייה-בלבד (read-only)', () => {
  test('EntityList — במצב עריכה מציג כפתורי ערוך/מחק (אחרי פתיחת הכרטיס המקופל)', () => {
    const { container } = renderWith(false, <EntityList entities={entities} onEdit={() => {}} onDelete={() => {}} />);
    fireEvent.click(container.querySelector('.entity-header-toggle'));
    expect(screen.getByRole('button', { name: /ערוך/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /מחק/ })).toBeInTheDocument();
  });

  test('EntityList — במצב צפייה מסתיר כפתורי ערוך/מחק', () => {
    renderWith(true, <EntityList entities={entities} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.queryByRole('button', { name: /ערוך/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /מחק/ })).not.toBeInTheDocument();
    // אבל התוכן עצמו עדיין מוצג
    expect(screen.getByText(/בנק מזרחי/)).toBeInTheDocument();
  });

  test('AccountsPage — במצב צפייה אין כפתור "הוסף חשבון"', () => {
    renderWith(true, <AccountsPage accounts={accounts} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />);
    expect(screen.queryByText(/הוסף חשבון/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /עו״ש/ })).toBeInTheDocument();
  });
});
