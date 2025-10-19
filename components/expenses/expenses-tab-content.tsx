'use client';

import { useState } from 'react';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { ExpensesList } from '@/components/expenses/expenses-list';
import { ExpenseWithRelations } from '@/lib/schemas/expense';

interface ExpensesTabContentProps {
	orgId: string;
}

export function ExpensesTabContent({ orgId }: ExpensesTabContentProps) {
	const [editingExpense, setEditingExpense] = useState<ExpenseWithRelations | null>(null);

	return (
		<div className="space-y-6">
			<ExpenseForm 
				orgId={orgId} 
				initialData={editingExpense}
				onSuccess={() => setEditingExpense(null)}
			/>
			<div>
				<h2 className="text-xl font-semibold mb-4">Utlägg</h2>
				<ExpensesList 
					orgId={orgId} 
					onEdit={(expense) => setEditingExpense(expense)}
				/>
			</div>
		</div>
	);
}

