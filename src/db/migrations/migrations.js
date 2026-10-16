// Keep migration imports explicit so Metro bundles SQL for offline APKs.

import journal from './meta/_journal.json';
import m0000 from './0000_initial.sql';
import m0001 from './0001_monthly_budgets.sql';
import m0002 from './0002_zero_budgets.sql';
import m0003 from './0003_recurring_and_payday.sql';
import m0004 from './0004_expense_subcategories.sql';
import m0005 from './0005_provision_goals.sql';

export default { journal, migrations: { m0000, m0001, m0002, m0003, m0004, m0005 } };
