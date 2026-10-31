import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  CreditCard, LayoutDashboard, LogOut, MoreHorizontal, Plus,
  Search, Settings2, Tags, Trash2, TrendingDown, TrendingUp, Wallet, X
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { CurrencyProvider } from '../context/CurrencyContext.jsx';
import useCurrency from '../context/useCurrency';

const readableDate = value => new Date(value).toLocaleDateString(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
});
const currentMonth = () => new Date().toISOString().slice(0, 7);
const friendlyMonth = month => new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
  month: 'long', year: 'numeric', timeZone: 'UTC'
});

function TrendChart({ trend = [] }) {
  const { formatMoney } = useCurrency();
  const [activeMonth, setActiveMonth] = useState('');
  const rows = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - 5 + index);
      const key = date.toISOString().slice(0, 7);
      return { key, label: date.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }), income: 0, expense: 0 };
    });
    const byMonth = new Map(months.map(month => [month.key, month]));
    trend.forEach(item => {
      const month = byMonth.get(item._id.month);
      if (month) month[item._id.type] = item.total;
    });
    return months;
  }, [trend]);

  const max = Math.max(1, ...rows.flatMap(row => [row.income, row.expense])) * 1.15;
  const selectedMonth = rows.find(row => row.key === activeMonth) || rows[rows.length - 1];
  const pointsFor = key => rows.map((row, index) => ({
    x: 42 + (index * 560) / Math.max(1, rows.length - 1),
    y: 180 - (row[key] / max) * 145
  }));
  const pathFor = key => pointsFor(key).map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div className="trend-chart">
      <div className="chart-legend">
        <span><i className="legend-dot income-dot" />Income</span>
        <span><i className="legend-dot expense-dot" />Expenses</span>
      </div>
      {selectedMonth && <p className="chart-selection" aria-live="polite">
        <strong>{friendlyMonth(selectedMonth.key)}</strong>
        <span>Income {formatMoney(selectedMonth.income)}</span>
        <span>Expenses {formatMoney(selectedMonth.expense)}</span>
      </p>}
      <svg className="chart-svg" viewBox="0 0 640 230" role="group" aria-label="Income and expenses over the last six months">
        {[35, 83, 131, 179].map(y => (
          <line key={y} x1="40" x2="610" y1={y} y2={y} className="chart-gridline" />
        ))}
        <path d={pathFor('income')} className="chart-line income-line" />
        <path d={pathFor('expense')} className="chart-line expense-line" />
        {rows.map((row, index) => {
          const x = 42 + (index * 560) / Math.max(1, rows.length - 1);
          const incomePoint = pointsFor('income')[index];
          const expensePoint = pointsFor('expense')[index];
          return (
            <g key={row.key}>
              <circle cx={incomePoint.x} cy={incomePoint.y} r="5" className="chart-point income-point" tabIndex="0" role="button" aria-label={`${row.label} income ${formatMoney(row.income)}`} onMouseEnter={() => setActiveMonth(row.key)} onFocus={() => setActiveMonth(row.key)} onClick={() => setActiveMonth(row.key)} />
              <circle cx={expensePoint.x} cy={expensePoint.y} r="5" className="chart-point expense-point" tabIndex="0" role="button" aria-label={`${row.label} expenses ${formatMoney(row.expense)}`} onMouseEnter={() => setActiveMonth(row.key)} onFocus={() => setActiveMonth(row.key)} onClick={() => setActiveMonth(row.key)} />
              <text x={x} y="216" textAnchor="middle" className="chart-label">{row.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CategoryChart({ categories }) {
  const { formatMoney } = useCurrency();
  const [activeCategory, setActiveCategory] = useState('');
  const total = categories.reduce((sum, item) => sum + item.total, 0);
  const selected = categories.find(item => item.name === activeCategory);
  let running = 0;
  const gradient = categories.length
    ? `conic-gradient(${categories.map(item => {
      const start = running;
      running += (item.total / total) * 100;
      return `${item.color} ${start}% ${running}%`;
    }).join(', ')})`
    : 'conic-gradient(#e9edf4 0% 100%)';

  return (
    <div className="category-chart-layout">
      <div className="donut-wrap">
        <div className="donut-chart" style={{ background: gradient }} role="img" aria-label={`Spending by category, ${formatMoney(total)} total`}>
          <div className="donut-center">
            <span>{selected ? selected.name : 'This month'}</span>
            <strong>{formatMoney(selected ? selected.total : total)}</strong>
            {selected && total > 0 && <small>{Math.round((selected.total / total) * 100)}% of spend</small>}
          </div>
        </div>
      </div>
      <div className="category-legend">
        {categories.length ? categories.map(item => (
          <button type="button" className="category-legend-item" key={item.name} aria-pressed={selected?.name === item.name} onMouseEnter={() => setActiveCategory(item.name)} onFocus={() => setActiveCategory(item.name)} onClick={() => setActiveCategory(selected?.name === item.name ? '' : item.name)}>
            <span className="category-name"><i style={{ backgroundColor: item.color }} />{item.name}</span>
            <strong>{formatMoney(item.total)}</strong>
          </button>
        )) : <p className="muted-copy">No spending to break down yet.</p>}
      </div>
    </div>
  );
}

function TransactionDialog({ transaction, categories, onClose, onSave }) {
  const {
    currency, currencySymbol, rates, ratesLoading, ratesError,
    convertToUSD, convertFromUSD
  } = useCurrency();
  const [form, setForm] = useState(() => transaction ? {
    description: transaction.description,
    amount: String(convertFromUSD(transaction.amount)),
    type: transaction.type,
    category: transaction.category,
    date: new Date(transaction.date).toISOString().slice(0, 10),
    notes: transaction.notes || ''
  } : {
    description: '', amount: '', type: 'expense',
    category: categories[0]?.name || '', date: new Date().toISOString().slice(0, 10), notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, amount: convertToUSD(Number(form.amount)) });
    } catch (saveError) {
      setError(saveError.response?.data?.message ||
        (saveError.response
          ? 'Could not save this transaction. Please check the details and try again.'
          : 'Could not reach the server. Check that the backend is running, then try again.'));
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{transaction ? 'UPDATE RECORD' : 'NEW RECORD'}</span>
            <h2 id="transaction-dialog-title">{transaction ? 'Edit transaction' : 'Add transaction'}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button>
        </div>
        <form className="dialog-form" onSubmit={submit}>
          <label>Description
            <input autoFocus name="description" value={form.description} onChange={update} maxLength="120" required placeholder="e.g. Weekly groceries" />
          </label>
          <div className="form-grid">
            <label>Amount
              <div className="money-input"><span>{currencySymbol}</span><input name="amount" type="number" min="0.01" max={rates ? 100000000 * rates[currency] : 100000000} step="0.01" value={form.amount} onChange={update} required placeholder="0.00" disabled={!rates} /></div>
            </label>
            <label>Date
              <input name="date" type="date" value={form.date} onChange={update} required />
            </label>
          </div>
          <div className="form-grid">
            <label>Type
              <select name="type" value={form.type} onChange={update}>
                <option value="expense">Expense</option><option value="income">Income</option>
              </select>
            </label>
            <label>Category
              <select name="category" value={form.category} onChange={update} required>
                {categories.map(category => <option key={category._id} value={category.name}>{category.name}</option>)}
              </select>
            </label>
          </div>
          <label>Note <span className="optional-label">Optional</span>
            <textarea name="notes" value={form.notes} onChange={update} maxLength="500" rows="3" placeholder="Add a little context..." />
          </label>
          {error && <p className="inline-error" role="alert">{error}</p>}
          {!rates && <p className="inline-error" role="alert">{ratesError || (ratesLoading ? 'Loading exchange rates…' : 'Exchange rates are required to save this amount.')}</p>}
          {!categories.length && <p className="inline-error">Add a category before creating transactions.</p>}
          <div className="dialog-actions">
            <button type="button" className="button button-quiet" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving || !categories.length || !rates}>
              {saving ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BudgetDialog({ categories, budgets, initialCategory, onClose, onSave }) {
  const {
    currency, currencySymbol, rates, ratesLoading, ratesError, convertToUSD, convertFromUSD
  } = useCurrency();
  const [form, setForm] = useState(() => {
    const category = initialCategory || categories[0]?.name || '';
    const existing = budgets.find(item => item.category === category);
    return { category, amount: existing ? String(convertFromUSD(existing.amount)) : '' };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const updateCategory = event => {
    const category = event.target.value;
    const budget = budgets.find(item => item.category === category);
    setForm({ category, amount: budget ? String(convertFromUSD(budget.amount)) : '' });
  };
  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, amount: convertToUSD(Number(form.amount)), month: currentMonth() });
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Could not save your budget.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card-small" role="dialog" aria-modal="true" aria-labelledby="budget-dialog-title">
        <div className="modal-heading">
          <div><span className="eyebrow">MONTHLY PLAN</span><h2 id="budget-dialog-title">Set a budget</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button>
        </div>
        <form className="dialog-form" onSubmit={submit}>
          <p className="muted-copy">Set a spending limit for {friendlyMonth(currentMonth())}.</p>
          <label>Category
            <select value={form.category} onChange={updateCategory} required>
              {categories.map(category => <option key={category._id} value={category.name}>{category.name}</option>)}
            </select>
          </label>
          <label>Monthly limit
            <div className="money-input"><span>{currencySymbol}</span><input type="number" min="0.01" max={rates ? 100000000 * rates[currency] : 100000000} step="0.01" value={form.amount} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} required placeholder="0.00" disabled={!rates} /></div>
          </label>
          {error && <p className="inline-error" role="alert">{error}</p>}
          {!rates && <p className="inline-error" role="alert">{ratesError || (ratesLoading ? 'Loading exchange rates…' : 'Exchange rates are required to save this amount.')}</p>}
          <div className="dialog-actions">
            <button type="button" className="button button-quiet" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving || !categories.length || !rates}>{saving ? 'Saving…' : 'Save budget'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', icon: Wallet },
  { id: 'categories', label: 'Categories', icon: Tags }
];

const emptySummary = { income: 0, expenses: 0, balance: 0 };

function DashboardContent() {
  const { user, logout } = useAuth();
  const {
    currency, rates, ratesLoading, ratesError, currencyError, ratesUpdatedAt,
    staleRates, retryRates, selectCurrency, convertToUSD, formatMoney
  } = useCurrency();
  const [view, setView] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#8b9cf7');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [filters, setFilters] = useState({ q: '', type: '', category: '', from: '', to: '', min: '', max: '', sort: 'date_desc' });
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionVersion, setTransactionVersion] = useState(0);
  const [transactionItems, setTransactionItems] = useState([]);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionLoading, setTransactionLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    const [dashboardResponse, categoryResponse, budgetResponse] = await Promise.all([
      api.get('/dashboard'),
      api.get('/categories'),
      api.get('/budgets', { params: { month: currentMonth() } })
    ]);
    setOverview(dashboardResponse.data);
    setCategories(categoryResponse.data.items);
    setBudgets(budgetResponse.data.items);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      loadOverview()
        .catch(error => {
          if (active) setPageError(error.response?.data?.message || 'We could not load your account. Please refresh to try again.');
        })
        .finally(() => { if (active) setOverviewLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [loadOverview]);

  useEffect(() => {
    if (view !== 'transactions' || !rates) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setTransactionLoading(true);
      try {
        const params = { ...filters, page: transactionPage, limit: 50 };
        if (filters.min) params.min = String(convertToUSD(Number(filters.min)));
        if (filters.max) params.max = String(convertToUSD(Number(filters.max)));
        const response = await api.get('/transactions', {
          params
        });
        if (!active) return;
        setTransactionItems(response.data.items);
        setTransactionTotal(response.data.total);
        setPageError('');
      } catch (error) {
        if (active) setPageError(error.response?.data?.message || 'Could not load transactions.');
      } finally {
        if (active) setTransactionLoading(false);
      }
    }, filters.q ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [view, filters, transactionPage, transactionVersion, rates, convertToUSD]);

  const refreshOverview = async () => {
    setPageError('');
    try {
      await loadOverview();
    } catch (error) {
      setPageError(error.response?.data?.message || 'Your changes were saved, but the latest summary could not be loaded.');
    }
  };

  const retryOverview = () => {
    setOverviewLoading(true);
    setPageError('');
    loadOverview()
      .catch(error => setPageError(error.response?.data?.message || 'We could not load your account. Please try again.'))
      .finally(() => setOverviewLoading(false));
  };

  const saveTransaction = async data => {
    if (modal?.transaction) await api.patch(`/transactions/${modal.transaction._id}`, data);
    else await api.post('/transactions', data);
    setModal(null);
    setNotice(modal?.transaction ? 'Transaction updated.' : 'Transaction added.');
    await refreshOverview();
    setTransactionVersion(version => version + 1);
  };

  const deleteTransaction = async transaction => {
    if (!window.confirm(`Delete “${transaction.description}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/transactions/${transaction._id}`);
      setNotice('Transaction deleted.');
      await refreshOverview();
      setTransactionVersion(version => version + 1);
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not delete the transaction.');
    }
  };

  const saveBudget = async data => {
    await api.put('/budgets', data);
    setModal(null);
    setNotice('Monthly budget saved.');
    await refreshOverview();
  };

  const deleteBudget = async budget => {
    if (!window.confirm(`Remove the ${budget.category} budget for ${friendlyMonth(budget.month)}?`)) return;
    try {
      await api.delete(`/budgets/${budget._id}`);
      setNotice('Budget removed.');
      await refreshOverview();
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not remove the budget.');
    }
  };

  const addCategory = async event => {
    event.preventDefault();
    setCategorySaving(true);
    setCategoryError('');
    try {
      await api.post('/categories', { name: categoryName, color: categoryColor });
      setCategoryName('');
      setNotice('Category added.');
      await refreshOverview();
    } catch (error) {
      setCategoryError(error.response?.data?.message || 'Could not add that category.');
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategory = async category => {
    if (!window.confirm(`Delete the “${category.name}” category?`)) return;
    try {
      await api.delete(`/categories/${category._id}`);
      setNotice('Category deleted.');
      await refreshOverview();
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not delete the category.');
    }
  };

  const resetFilters = () => {
    setFilters({ q: '', type: '', category: '', from: '', to: '', min: '', max: '', sort: 'date_desc' });
    setTransactionPage(1);
  };
  const summary = overview?.summary || emptySummary;
  const pageCount = Math.max(1, Math.ceil(transactionTotal / 50));
  const selectedTitle = navigation.find(item => item.id === view)?.label || 'Overview';
  const initials = (user?.name || 'You').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const updateFilter = event => {
    setFilters(previous => ({ ...previous, [event.target.name]: event.target.value }));
    setTransactionPage(1);
  };
  const updateCurrency = async event => {
    if (await selectCurrency(event.target.value)) {
      setFilters(previous => ({ ...previous, min: '', max: '' }));
      setTransactionPage(1);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand-lockup" href="/dashboard" onClick={event => { event.preventDefault(); setView('overview'); }}>
          <span className="brand-symbol"><Wallet size={19} /></span>
          <span>trackio<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(item => {
            const Icon = item.icon;
            return (
              <button type="button" key={item.id} className={`nav-item ${view === item.id ? 'nav-item-active' : ''}`} onClick={() => setView(item.id)}>
                <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><CircleHelp size={17} /></span>
            <strong>Good money habits start small.</strong>
            <span>Every little bit you track adds up.</span>
          </div>
          <div className="profile-card">
            <div className="avatar">{initials}</div>
            <div className="profile-copy"><strong>{user?.name || 'Your account'}</strong><span>{user?.email}</span></div>
            <button type="button" className="icon-button profile-logout" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{selectedTitle}</strong></div>
          <div className="topbar-actions">
            <span className="today-label"><CalendarDays size={15} />{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <label className="currency-control"><span className="sr-only">Display currency</span><select className="currency-select" aria-label="Display currency" value={currency} onChange={updateCurrency} disabled={!rates || ratesLoading || Boolean(modal)}><option value="USD">USD</option><option value="PKR">PKR</option><option value="EUR">EUR</option></select></label>
            {ratesUpdatedAt && <span className="rates-date" title={`Rates updated ${ratesUpdatedAt}${staleRates ? ' (using cached rates)' : ''}`}>{staleRates ? 'Cached rates' : 'Rates updated'}</span>}
            <button type="button" className="button button-primary top-add-button" onClick={() => setModal({ transaction: null })} disabled={!rates}><Plus size={17} /> Add transaction</button>
            <button type="button" className="icon-button mobile-logout" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button>
          </div>
        </header>

        <nav className="mobile-nav" aria-label="Main navigation">
          {navigation.map(item => {
            const Icon = item.icon;
            return <button type="button" key={item.id} className={view === item.id ? 'mobile-nav-active' : ''} onClick={() => setView(item.id)}><Icon size={18} /><span>{item.label}</span></button>;
          })}
        </nav>

        <div className="content-wrap">
          {ratesError && <div className="notice notice-error" role="alert"><span>{ratesError}</span><button type="button" className="text-button" onClick={retryRates}>Retry</button></div>}
          {currencyError && <div className="notice notice-error" role="alert"><span>{currencyError}</span></div>}
          {staleRates && ratesUpdatedAt && <div className="currency-notice" role="status">Exchange-rate service is unavailable. Showing cached rates from {ratesUpdatedAt}.</div>}
          {pageError && <div className="notice notice-error" role="alert"><span>{pageError}</span><button type="button" aria-label="Dismiss error" onClick={() => setPageError('')}><X size={17} /></button></div>}
          {notice && <div className="notice notice-success" role="status"><Check size={17} /><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={17} /></button></div>}

          {overviewLoading && !overview ? (
            <div className="loading-state" role="status"><span className="loading-spinner" />Loading your finances…</div>
          ) : !overview ? (
            <section className="panel empty-panel">
              <EmptyState icon={CircleHelp} title="Your dashboard could not load" text={pageError || 'Check your connection and try again.'} action="Try again" onClick={retryOverview} />
            </section>
          ) : (
            <>
              {view === 'overview' && (
                <>
                  <section className="page-intro">
                    <div><span className="eyebrow">YOUR MONEY, IN FOCUS</span><h1>{greeting}, {user?.name?.split(' ')[0] || 'there'} <span className="wave">✦</span></h1><p>Here’s what’s happening with your money this month.</p></div>
                    <button type="button" className="button button-primary intro-add" onClick={() => setModal({ transaction: null })} disabled={!rates}><Plus size={17} /> New transaction</button>
                  </section>

                  <section className="summary-grid" aria-label="This month's summary">
                    <article className="summary-card balance-card">
                      <div className="summary-card-top"><span className="summary-label">Net cash flow</span><span className="summary-icon balance-icon"><Wallet size={17} /></span></div>
                      <strong className="summary-value">{formatMoney(summary.balance)}</strong>
                      <span className="summary-footnote"><span className="positive-dot" />Income minus expenses this month</span>
                    </article>
                    <article className="summary-card">
                      <div className="summary-card-top"><span className="summary-label">Income</span><span className="summary-icon income-icon"><ArrowDownLeft size={17} /></span></div>
                      <strong className="summary-value">{formatMoney(summary.income)}</strong>
                      <span className="summary-footnote">Across your recorded income</span>
                    </article>
                    <article className="summary-card">
                      <div className="summary-card-top"><span className="summary-label">Expenses</span><span className="summary-icon expense-icon"><ArrowUpRight size={17} /></span></div>
                      <strong className="summary-value">{formatMoney(summary.expenses)}</strong>
                      <span className="summary-footnote">Across your recorded spending</span>
                    </article>
                  </section>

                  <section className="analytics-grid">
                    <article className="panel trend-panel">
                      <div className="panel-heading"><div><h2>Cash flow</h2><p>Your income and expenses over time</p></div><span className="range-chip">Last 6 months <ChevronDown size={14} /></span></div>
                      <TrendChart trend={overview?.trend} />
                    </article>
                    <article className="panel category-panel">
                      <div className="panel-heading"><div><h2>Spending by category</h2><p>A look at where it goes</p></div><button type="button" className="icon-button" aria-label="View categories" onClick={() => setView('categories')}><MoreHorizontal size={19} /></button></div>
                      <CategoryChart categories={overview?.categories || []} />
                    </article>
                  </section>

                  <section className="lower-grid">
                    <article className="panel budget-panel">
                      <div className="panel-heading"><div><h2>Monthly budgets</h2><p>Keep your spending on track</p></div><button type="button" className="text-button" onClick={() => setView('budgets')}>See all <ArrowUpRight size={15} /></button></div>
                      {budgets.length ? <div className="budget-list">
                        {budgets.slice(0, 3).map(budget => <BudgetProgress key={budget._id} budget={budget} />)}
                      </div> : <EmptyState icon={Wallet} title="No budgets yet" text="Set a monthly limit for a category and keep your goals in sight." action={rates ? 'Create a budget' : undefined} onClick={() => setModal({ budget: true })} />}
                    </article>
                    <article className="panel recent-panel">
                      <div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest transactions</p></div><button type="button" className="text-button" onClick={() => setView('transactions')}>View all <ArrowUpRight size={15} /></button></div>
                      {overview?.recent?.length ? <div className="recent-list">
                        {overview.recent.slice(0, 5).map(item => <TransactionRow key={item._id} item={item} />)}
                      </div> : <EmptyState icon={CreditCard} title="Nothing here yet" text="Your latest transactions will show up here." action="Add a transaction" onClick={() => setModal({ transaction: null })} />}
                    </article>
                  </section>
                </>
              )}

              {view === 'transactions' && (
                <section className="page-section">
                  <div className="page-intro page-intro-compact">
                    <div><span className="eyebrow">YOUR ACTIVITY</span><h1>Transactions</h1><p>Every amount, accounted for.</p></div>
                    <button type="button" className="button button-primary intro-add" onClick={() => setModal({ transaction: null })} disabled={!rates}><Plus size={17} /> Add transaction</button>
                  </div>
                  <section className="panel transactions-panel">
                    <div className="filter-toolbar">
                      <label className="search-field"><Search size={17} /><input aria-label="Search transactions" name="q" value={filters.q} onChange={updateFilter} placeholder="Search transactions..." /></label>
                      <select aria-label="Transaction type" name="type" value={filters.type} onChange={updateFilter}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
                      <select aria-label="Category" name="category" value={filters.category} onChange={updateFilter}><option value="">All categories</option>{categories.map(item => <option key={item._id} value={item.name}>{item.name}</option>)}</select>
                      <select aria-label="Sort transactions" name="sort" value={filters.sort} onChange={updateFilter}><option value="date_desc">Newest first</option><option value="date_asc">Oldest first</option><option value="amount_desc">Highest amount</option><option value="amount_asc">Lowest amount</option><option value="description_asc">Description A–Z</option></select>
                    </div>
                    <details className="advanced-filters">
                      <summary><Settings2 size={15} /> More filters</summary>
                      <div className="advanced-filter-fields">
                        <label>From<input type="date" name="from" value={filters.from} onChange={updateFilter} /></label>
                        <label>To<input type="date" name="to" value={filters.to} onChange={updateFilter} /></label>
                        <label>Min amount ({currency})<input type="number" name="min" min="0" step="0.01" value={filters.min} onChange={updateFilter} placeholder="0.00" disabled={!rates} /></label>
                        <label>Max amount ({currency})<input type="number" name="max" min="0" step="0.01" value={filters.max} onChange={updateFilter} placeholder="No limit" disabled={!rates} /></label>
                        <button type="button" className="text-button clear-filter" onClick={resetFilters}>Clear filters</button>
                      </div>
                    </details>
                    <div className="table-scroll">
                      <table className="transaction-table">
                        <thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Type</th><th className="amount-column">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody>
                          {transactionLoading ? <tr><td colSpan="6"><div className="table-loading"><span className="loading-spinner" />Loading transactions…</div></td></tr>
                            : transactionItems.map(item => <TransactionTableRow key={item._id} item={item} categories={categories} onEdit={() => setModal({ transaction: item })} onDelete={() => deleteTransaction(item)} />)}
                        </tbody>
                      </table>
                      {!transactionLoading && !transactionItems.length && <EmptyState icon={Search} title="No transactions found" text={filters.q || filters.type || filters.category || filters.from || filters.to || filters.min || filters.max ? 'Try adjusting your filters, or clear them to see everything.' : 'Add your first transaction and your activity will appear here.'} action={transactionTotal ? 'Clear filters' : 'Add a transaction'} onClick={transactionTotal ? resetFilters : () => setModal({ transaction: null })} />}
                    </div>
                    <div className="pagination">
                      <span>{transactionTotal ? `Showing ${(transactionPage - 1) * 50 + 1}–${Math.min(transactionPage * 50, transactionTotal)} of ${transactionTotal}` : 'No results'}</span>
                      <div><button type="button" aria-label="Previous page" disabled={transactionPage <= 1 || transactionLoading} onClick={() => setTransactionPage(page => page - 1)}><ChevronLeft size={17} /></button><span>Page {transactionPage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={transactionPage >= pageCount || transactionLoading} onClick={() => setTransactionPage(page => page + 1)}><ChevronRight size={17} /></button></div>
                    </div>
                  </section>
                </section>
              )}

              {view === 'budgets' && (
                <section className="page-section">
                  <div className="page-intro page-intro-compact">
                    <div><span className="eyebrow">PLAN WITH PURPOSE</span><h1>Budgets</h1><p>Your spending limits for {friendlyMonth(currentMonth())}.</p></div>
                    <button type="button" className="button button-primary intro-add" onClick={() => setModal({ budget: true })} disabled={!rates}><Plus size={17} /> Set a budget</button>
                  </div>
                  {budgets.length ? <div className="budget-grid">{budgets.map(budget => <article className="panel budget-card" key={budget._id}>
                    <div className="budget-card-heading"><span className="category-color-dot" style={{ backgroundColor: budget.color }} /><div><h2>{budget.category}</h2><p>{friendlyMonth(budget.month)}</p></div><button type="button" className="icon-button danger-hover" aria-label={`Remove ${budget.category} budget`} onClick={() => deleteBudget(budget)}><Trash2 size={17} /></button></div>
                    <BudgetProgress budget={budget} large />
                    <button type="button" className="text-button budget-edit" onClick={() => setModal({ budget: true, category: budget.category })} disabled={!rates}>Edit budget <ArrowUpRight size={15} /></button>
                  </article>)}                  </div> : <div className="panel empty-panel"><EmptyState icon={Wallet} title="Start with a spending plan" text="Create a monthly budget for a category to see your progress here." action={rates ? 'Set your first budget' : undefined} onClick={() => setModal({ budget: true })} /></div>}
                </section>
              )}

              {view === 'categories' && (
                <section className="page-section">
                  <div className="page-intro page-intro-compact"><div><span className="eyebrow">MAKE IT YOURS</span><h1>Categories</h1><p>Organize your transactions the way you think about money.</p></div></div>
                  <div className="category-management-grid">
                    <section className="panel category-form-panel">
                      <div className="panel-heading"><div><h2>Create a category</h2><p>Give a spending group a name and a color.</p></div><span className="form-icon"><Tags size={18} /></span></div>
                      <form className="category-create-form" onSubmit={addCategory}>
                        <label>Category name<input value={categoryName} onChange={event => setCategoryName(event.target.value)} maxLength="40" required placeholder="e.g. Pet care" /></label>
                        <label>Color<span className="color-control"><input type="color" value={categoryColor} onChange={event => setCategoryColor(event.target.value)} /><span>{categoryColor.toUpperCase()}</span></span></label>
                        {categoryError && <p className="inline-error" role="alert">{categoryError}</p>}
                        <button type="submit" className="button button-primary" disabled={categorySaving}>{categorySaving ? 'Adding…' : <><Plus size={16} /> Add category</>}</button>
                      </form>
                    </section>
                    <section className="panel category-list-panel">
                      <div className="panel-heading"><div><h2>Your categories</h2><p>{categories.length} categories available to you</p></div></div>
                      <div className="managed-category-list">
                        {categories.map(category => <div className="managed-category" key={category._id}><span className="category-color-dot" style={{ backgroundColor: category.color }} /><strong>{category.name}</strong><button type="button" className="icon-button danger-hover" onClick={() => deleteCategory(category)} aria-label={`Delete ${category.name}`} title="Delete category"><Trash2 size={17} /></button></div>)}
                        {!categories.length && <p className="muted-copy">No categories yet. Add one to organize your transactions.</p>}
                      </div>
                      <p className="category-help">Categories in use by transactions or budgets can’t be deleted until those records are removed.</p>
                    </section>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {view !== 'overview' && <button type="button" className="mobile-fab" onClick={() => setModal(view === 'budgets' ? { budget: true } : { transaction: null })} aria-label={view === 'budgets' ? 'Set a budget' : 'Add transaction'} disabled={!rates}><Plus size={22} /></button>}
      {modal?.budget && <BudgetDialog categories={categories} budgets={budgets} initialCategory={modal.category} onClose={() => setModal(null)} onSave={saveBudget} />}
      {modal && !modal.budget && <TransactionDialog transaction={modal.transaction} categories={categories} onClose={() => setModal(null)} onSave={saveTransaction} />}
    </div>
  );
}

export default function Dashboard() {
  return <CurrencyProvider><DashboardContent /></CurrencyProvider>;
}

function BudgetProgress({ budget, large = false }) {
  const { formatMoney } = useCurrency();
  const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const capped = Math.min(100, percent);
  const isOver = percent >= 100;
  return (
    <div className={`budget-progress ${large ? 'budget-progress-large' : ''}`}>
      <div className="budget-amounts"><strong>{formatMoney(budget.spent)}</strong><span>of {formatMoney(budget.amount)}</span></div>
      <div className="progress-track" role="progressbar" aria-label={`${budget.category} budget used`} aria-valuenow={Math.round(Math.min(100, percent))} aria-valuemin="0" aria-valuemax="100">
        <span className={isOver ? 'progress-fill progress-over' : 'progress-fill'} style={{ width: `${capped}%`, backgroundColor: isOver ? '#e57773' : budget.color }} />
      </div>
      <div className={`budget-remaining ${isOver ? 'budget-over-copy' : ''}`}>
        {isOver ? <><TrendingUp size={14} />{formatMoney(budget.spent - budget.amount)} over budget</> : <><TrendingDown size={14} />{formatMoney(budget.amount - budget.spent)} remaining</>}
      </div>
    </div>
  );
}

function TransactionRow({ item }) {
  const { formatMoney } = useCurrency();
  return (
    <div className="recent-item">
      <div className={`transaction-type-icon ${item.type === 'income' ? 'transaction-income-icon' : 'transaction-expense-icon'}`}>
        {item.type === 'income' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
      </div>
      <div className="recent-copy"><strong>{item.description}</strong><span>{item.category} <i /> {readableDate(item.date)}</span></div>
      <strong className={`recent-amount ${item.type === 'income' ? 'income-text' : ''}`}>{item.type === 'income' ? '+' : '−'}{formatMoney(item.amount)}</strong>
    </div>
  );
}

function TransactionTableRow({ item, categories, onEdit, onDelete }) {
  const { formatMoney } = useCurrency();
  const category = categories.find(entry => entry.name === item.category);
  return (
    <tr>
      <td><div className="table-description"><span className={`transaction-type-icon ${item.type === 'income' ? 'transaction-income-icon' : 'transaction-expense-icon'}`}>{item.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><span><strong>{item.description}</strong>{item.notes && <small>{item.notes}</small>}</span></div></td>
      <td><span className="category-pill"><i style={{ backgroundColor: category?.color || '#9aa5b5' }} />{item.category}</span></td>
      <td className="date-cell">{readableDate(item.date)}</td>
      <td><span className={`type-pill ${item.type === 'income' ? 'type-income' : 'type-expense'}`}>{item.type}</span></td>
      <td className={`amount-column table-amount ${item.type === 'income' ? 'income-text' : ''}`}>{item.type === 'income' ? '+' : '−'}{formatMoney(item.amount)}</td>
      <td><div className="row-actions"><button type="button" className="icon-button" aria-label={`Edit ${item.description}`} onClick={onEdit}><Settings2 size={16} /></button><button type="button" className="icon-button danger-hover" aria-label={`Delete ${item.description}`} onClick={onDelete}><Trash2 size={16} /></button></div></td>
    </tr>
  );
}

function EmptyState({ icon: Icon, title, text, action, onClick }) {
  return (
    <div className="empty-state"><span className="empty-icon"><Icon size={21} /></span><strong>{title}</strong><p>{text}</p>{action && <button type="button" className="text-button" onClick={onClick}>{action}<ArrowUpRight size={15} /></button>}</div>
  );
}
