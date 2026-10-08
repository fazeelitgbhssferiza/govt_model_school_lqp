'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import SalaryInvoiceView from '../components/SalaryInvoiceView';
import { downloadSalaryInvoicePdf } from '../utils/salaryInvoicePdf';

function PrintInvoicePageClient() {
  const searchParams = useSearchParams();
  const invoiceKey = searchParams.get('invoiceKey');
  const invoiceData = useMemo(() => {
    if (!invoiceKey || typeof window === 'undefined') return null;

    const rawInvoice = localStorage.getItem(invoiceKey);
    if (!rawInvoice) return null;

    try {
      return JSON.parse(rawInvoice);
    } catch (error) {
      console.error('Failed to parse salary invoice payload:', error);
      return null;
    }
  }, [invoiceKey]);

  useEffect(() => {
    if (!invoiceData || typeof window === 'undefined') return;

    const printTimer = window.setTimeout(() => {
      window.print();
    }, 350);

    return () => window.clearTimeout(printTimer);
  }, [invoiceData]);

  useEffect(() => {
    if (!invoiceKey || typeof window === 'undefined') return undefined;

    const clearInvoiceData = () => {
      try {
        localStorage.removeItem(invoiceKey);
      } catch (error) {
        console.error('Failed to clear salary invoice payload:', error);
      }
    };

    window.addEventListener('pagehide', clearInvoiceData);

    return () => {
      window.removeEventListener('pagehide', clearInvoiceData);
    };
  }, [invoiceKey]);

  if (!invoiceData) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Print Invoice</h1>
          <p className="mt-3 text-slate-500">
            No salary invoice data was found for this page. Please reopen the invoice and use the `Print Invoice` button again.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 print:bg-white print:px-0 print:py-0">
      <SalaryInvoiceView
        teacher={invoiceData.teacher}
        month={invoiceData.month}
        year={invoiceData.year}
        actions={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => window.close()}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Close Page
            </button>
            <button
              onClick={() => downloadSalaryInvoicePdf(invoiceData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download PDF
            </button>
          </div>
        }
      />
    </main>
  );
}

export default dynamic(() => Promise.resolve(PrintInvoicePageClient), {
  ssr: false,
});
