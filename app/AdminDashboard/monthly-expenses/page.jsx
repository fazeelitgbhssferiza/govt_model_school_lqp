'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { hasPermission } from '../authservice/auth';
import { useAuth } from '../authservice/useAuth';
import { showToast } from '../../utils/helpers';

const DEFAULT_EXPENSES = [
  { category: 'Maintenance', amount: 45000, date: new Date().toISOString().split('T')[0] },
  { category: 'Utilities', amount: 35000, date: new Date().toISOString().split('T')[0] },
  { category: 'Stationery', amount: 15000, date: new Date().toISOString().split('T')[0] },
];

function normalizeExpenses(expenses) {
  return expenses.map((expense, index) => ({
    ...expense,
    id: expense.id ?? Date.now() + index,
  }));
}

export default function MonthlyExpensesPage() {
  const { permissions } = useAuth();
  const canViewMonthlyExpenses = hasPermission(permissions, 'MONTHLY_EXPENSES_VIEW');
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const savedExpenses = localStorage.getItem('school_expenses');
    if (savedExpenses) {
      try {
        const normalizedExpenses = normalizeExpenses(JSON.parse(savedExpenses));
        setExpenses(normalizedExpenses);
        localStorage.setItem('school_expenses', JSON.stringify(normalizedExpenses));
        return;
      } catch {
        // fall through to defaults
      }
    }

    const normalizedDefaults = normalizeExpenses(DEFAULT_EXPENSES);
    setExpenses(normalizedDefaults);
    localStorage.setItem('school_expenses', JSON.stringify(normalizedDefaults));
  }, []);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses]
  );

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setNewExpense({ category: '', amount: 0, date: new Date().toISOString().split('T')[0] });
  };

  const handleAddExpense = () => {
    if (!newExpense.category || !newExpense.amount || !newExpense.date) {
      showToast('Please complete category, amount, and date.', 'error');
      return;
    }

    const nextExpenses = editingExpenseId
      ? expenses.map((expense) =>
          expense.id === editingExpenseId
            ? { ...expense, ...newExpense, amount: Number(newExpense.amount) }
            : expense
        )
      : [...expenses, { ...newExpense, id: Date.now(), amount: Number(newExpense.amount) }];
    setExpenses(nextExpenses);
    localStorage.setItem('school_expenses', JSON.stringify(nextExpenses));
    setShowModal(false);
    resetExpenseForm();
    showToast(editingExpenseId ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setNewExpense({
      category: expense.category || '',
      amount: Number(expense.amount || 0),
      date: expense.date || new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleDeleteExpense = (expenseId) => {
    const nextExpenses = expenses.filter((expense) => expense.id !== expenseId);
    setExpenses(nextExpenses);
    localStorage.setItem('school_expenses', JSON.stringify(nextExpenses));
    showToast('Expense deleted successfully!', 'success');
  };

  if (!canViewMonthlyExpenses) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20 flex items-center justify-center p-6">
        <div className="max-w-sm rounded-3xl border border-white/60 bg-white/80 p-10 text-center shadow-xl backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-slate-800">Access Required</h2>
          <p className="mt-2 text-sm text-slate-500">
            Only roles with Monthly Expenses access can open this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/20 to-orange-50/20 px-4 pb-8 pt-0 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-600">Operations Finance</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Monthly Expenses</h1>
              <p className="mt-2 text-sm text-slate-500">Track all school expenditures</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-right">
                <p className="text-sm text-slate-500">Total Expenses</p>
                <p className="text-2xl font-bold text-rose-600">PKR {totalExpenses.toLocaleString()}</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                + Add Expense
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="px-6 py-5">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-black">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right text-sm font-bold text-rose-600">
                      PKR {Number(expense.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-sm text-black">{expense.date}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="rounded-xl p-2 text-blue-500 transition-colors hover:bg-blue-50"
                          title="Edit expense"
                          aria-label="Edit expense"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="rounded-xl p-2 text-rose-500 transition-colors hover:bg-rose-50"
                          title="Delete expense"
                          aria-label="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-4 shadow-2xl sm:p-6">
              <div className="-mx-4 -mt-4 mb-6 flex items-start justify-between rounded-t-[2rem] bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 px-4 py-5 text-white sm:-mx-6 sm:-mt-6 sm:px-6">
                <div>
                  <h2 className="text-xl font-bold">{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</h2>
                  <p className="mt-1 text-sm text-white/90">
                    {editingExpenseId ? 'Update the expense details and save your changes.' : 'Enter the basic expense details and save.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetExpenseForm();
                  }}
                  className="rounded-lg p-2 text-white/80 hover:bg-white/15 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(event) => setNewExpense({ ...newExpense, category: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Select Category</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Events">Events</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount (PKR)</label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(event) => setNewExpense({ ...newExpense, amount: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(event) => setNewExpense({ ...newExpense, date: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetExpenseForm();
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExpense}
                  className="w-full rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
                >
                  {editingExpenseId ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
