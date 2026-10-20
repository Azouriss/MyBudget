import en from '../en.json';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { getLocale, localeStore, setLanguage, t, translate } from '../locale';
import { monthLabel, shortDate, displayDate, parseFrenchDate } from '../../lib/dates';
import { calendarDateLabel, calendarDays } from '../../lib/calendar';
import { formatMoney, centsToInput, parseAmountToCents } from '../../lib/money';
import { defaultCategories } from '../../features/categories/defaults';
import { expenseSubcategories, searchExpenseSubcategories } from '../../features/categories/subcategories';
import { reconcileReminders, type ScheduledReminder } from '../../features/payday/notificationPlan';
import { planSalaryReminders } from '../../features/payday/schedule';

afterEach(() => setLanguage('fr'));

it('fournit une traduction anglaise pour chaque message littéral référencé par les écrans', () => {
  function files(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const filename = join(directory, entry.name);
      if (entry.isDirectory()) return ['__tests__', 'test-support', 'migrations'].includes(entry.name) ? [] : files(filename);
      return entry.name.endsWith('.tsx') ? [filename] : [];
    });
  }
  const root = join(__dirname, '../../..');
  const missing: string[] = [];
  for (const filename of [...files(join(root, 'app')), ...files(join(root, 'src'))]) {
    const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
        const message = node.arguments[0];
        if (message && ts.isStringLiteral(message) && !Object.hasOwn(en, message.text.trim())) missing.push(message.text.trim());
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(missing).toEqual([]);
});

it('traduit les messages et interpolations en conservant les valeurs et espaces', () => {
  expect(translate('Paramètres', 'fr')).toBe('Paramètres');
  expect(translate('Paramètres', 'en')).toBe('Settings');
  expect(translate('Gérer {0}', 'en', ['Courses à Paris'])).toBe('Manage Courses à Paris');
  expect(translate(' · Revenu', 'en')).toBe(' · Income');
  expect(translate(' ', 'en')).toBe(' ');
  expect(translate('Label inconnu', 'en')).toBe('Label inconnu');
  const stop = localeStore.subscribe(jest.fn());
  setLanguage('en');
  expect(t('Mon profil')).toBe('My profile');
  stop();
});

it('couvre toutes les catégories et sous-catégories sans changer leurs identifiants', () => {
  for (const { label } of [...defaultCategories, ...expenseSubcategories]) expect(Object.hasOwn(en, label)).toBe(true);
  for (const [key, value] of Object.entries(en)) {
    expect(value.trim()).not.toBe('');
    const tokens = (s: string) => [...s.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();
    // French adjective agreement has a separate suffix; English does not.
    if (!key.includes('date{2} restante{3}')) expect(tokens(value)).toEqual(tokens(key));
  }
  setLanguage('en');
  expect(searchExpenseSubcategories('fuel', 'food', defaultCategories).map((c) => c.id)).toContain('transport-fuel');
  expect(searchExpenseSubcategories('carburant', 'food', defaultCategories).map((c) => c.id)).toContain('transport-fuel');
});

it('localise les affichages tout en conservant euros, centimes et dates civiles', () => {
  const days = calendarDays('2028-02');
  setLanguage('en');
  expect(getLocale()).toBe('en-GB');
  expect(monthLabel('2026-10')).toBe('October 2026');
  expect(shortDate('2026-10-20')).toBe('20 Oct');
  expect(calendarDateLabel('2026-10-20')).toContain('Tuesday');
  expect(formatMoney(123456)).toBe('€1,234.56');
  expect(centsToInput(1234)).toBe('12.34');
  expect(parseAmountToCents(centsToInput(1234))).toBe(1234);
  expect(parseAmountToCents('12,34')).toBe(1234);
  expect(displayDate('2028-02-29')).toBe('29/02/2028');
  expect(parseFrenchDate('29/02/2028')).toBe('2028-02-29');
  expect(calendarDays('2028-02')).toEqual(days);
  setLanguage('fr');
  expect(monthLabel('2026-10')).toBe('octobre 2026');
  expect(centsToInput(1234)).toBe('12,34');
});

it('reprogramme les rappels de paie dans la nouvelle langue sans toucher aux autres rappels', async () => {
  const desired = planSalaryReminders(28, new Set(), new Date(2026, 0, 1));
  let scheduled: ScheduledReminder[] = [{ identifier: 'unrelated', content: {} }, ...desired.map((r) => ({
    identifier: r.identifier, content: { data: { scheduledFor: r.timestamp, language: 'fr' } },
  }))];
  const adapter = {
    list: async () => scheduled,
    cancel: jest.fn(async (id: string) => { scheduled = scheduled.filter((r) => r.identifier !== id); }),
    schedule: jest.fn(async (r: typeof desired[number]) => { scheduled.push({ identifier: r.identifier,
      content: { data: { scheduledFor: r.timestamp, language: 'en' } } }); }),
  };
  await reconcileReminders(adapter, desired, 'en');
  expect(adapter.schedule).toHaveBeenCalledTimes(desired.length);
  expect(scheduled.find((r) => r.identifier === 'unrelated')).toBeDefined();
  await reconcileReminders(adapter, desired, 'en');
  expect(adapter.schedule).toHaveBeenCalledTimes(desired.length);
});
