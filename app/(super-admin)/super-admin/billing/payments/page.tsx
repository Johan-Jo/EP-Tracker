import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/billing/mrr-calculator';
import { CheckCircle, Clock, XCircle, RefreshCw, FileText } from 'lucide-react';

/**
 * Payments Tracking Page
 * 
 * View and manage all payment transactions.
 * Super admins can record payments and update payment status.
 */

export default async function PaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      organization:organizations(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  // Calculate summary stats
  const paidPayments = payments?.filter(p => p.status === 'paid') || [];
  const pendingPayments = payments?.filter(p => p.status === 'pending') || [];
  const failedPayments = payments?.filter(p => p.status === 'failed') || [];
  
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount_sek, 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount_sek, 0);

  // Get payment status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'refunded':
        return <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'refunded':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Payments
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track payment transactions and invoices
          </p>
        </div>
        
        <button className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500">
          Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Paid
          </h3>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalPaid)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {paidPayments.length} transactions
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Pending
          </h3>
          <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(totalPending)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {pendingPayments.length} transactions
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Failed
          </h3>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {failedPayments.length}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            transactions
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Success Rate
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {payments && payments.length > 0
              ? Math.round((paidPayments.length / payments.length) * 100)
              : 0}%
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            of all transactions
          </p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {payments && payments.map((payment) => {
                const org = payment.organization as any;
                
                return (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                          {payment.invoice_number || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {org?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount_sek)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                        {payment.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(payment.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        <FileText className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {(!payments || payments.length === 0) && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No payments recorded yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

