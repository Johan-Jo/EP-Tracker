'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Box, Receipt, Car, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface CostItem {
	id: string;
	description?: string | null;
	[key: string]: any;
}

interface CostsByCategory {
	materials: {
		total: number;
		count: number;
		items: Array<{
			id: string;
			description?: string | null;
			qty?: number | null;
			unitPrice?: number | null;
			total?: number | null;
			createdAt?: string;
		}>;
	};
	expenses: {
		total: number;
		count: number;
		items: Array<{
			id: string;
			description?: string | null;
			amount?: number | null;
			expenseDate?: string | null;
			createdAt?: string;
		}>;
	};
	mileage: {
		total: number;
		count: number;
		items: Array<{
			id: string;
			distanceKm?: number | null;
			ratePerKm?: number | null;
			total?: number | null;
			tripDate?: string | null;
			createdAt?: string;
		}>;
	};
	total: number;
}

interface ProjectCostsSummaryProps {
	costsByCategory: CostsByCategory;
	budgetAmount?: number | null;
}

export function ProjectCostsSummary({ costsByCategory, budgetAmount }: ProjectCostsSummaryProps) {
	const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

	const toggleCategory = (category: string) => {
		setExpandedCategory(expandedCategory === category ? null : category);
	};

	const { materials, expenses, mileage, total } = costsByCategory;
	const budgetUsed = budgetAmount ? Math.round((total / budgetAmount) * 100) : 0;
	const remaining = budgetAmount ? budgetAmount - total : null;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Material & Kostnader</CardTitle>
					<div className="text-right">
						<p className="text-3xl font-bold">{total.toLocaleString('sv-SE')} kr</p>
						{budgetAmount && (
							<p className="text-sm text-muted-foreground">
								{budgetUsed}% av budget ({budgetAmount.toLocaleString('sv-SE')} kr)
							</p>
						)}
					</div>
				</div>
				{budgetAmount && (
					<div className="mt-4">
						<div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
							<div
								className="h-full bg-orange-500 transition-all"
								style={{ width: `${Math.min(100, budgetUsed)}%` }}
							/>
						</div>
						{remaining !== null && (
							<div className="mt-2 flex justify-between text-sm">
								<span className="text-muted-foreground">Återstående budget</span>
								<span className={`font-medium ${remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
									{remaining.toLocaleString('sv-SE')} kr
								</span>
							</div>
						)}
					</div>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Materials */}
				<div className="border rounded-lg">
					<button
						onClick={() => toggleCategory('materials')}
						className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
					>
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-green-100">
								<Box className="h-5 w-5 text-green-600" />
							</div>
							<div className="text-left">
								<p className="font-medium">Material</p>
								<p className="text-sm text-muted-foreground">
									{materials.count} {materials.count === 1 ? 'artikel' : 'artiklar'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<p className="text-lg font-bold">{materials.total.toLocaleString('sv-SE')} kr</p>
							{expandedCategory === 'materials' ? (
								<ChevronUp className="h-5 w-5 text-muted-foreground" />
							) : (
								<ChevronDown className="h-5 w-5 text-muted-foreground" />
							)}
						</div>
					</button>
					{expandedCategory === 'materials' && materials.items.length > 0 && (
						<div className="border-t p-4 bg-muted/30">
							<div className="space-y-2">
								{materials.items.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between p-2 bg-background rounded"
									>
										<div className="flex-1 min-w-0">
											<p className="font-medium truncate">{item.description || 'Ingen beskrivning'}</p>
											{item.qty && item.unitPrice && (
												<p className="text-sm text-muted-foreground">
													{item.qty} × {item.unitPrice.toLocaleString('sv-SE')} kr
												</p>
											)}
											{item.createdAt && (
												<p className="text-xs text-muted-foreground">
													{format(new Date(item.createdAt), 'yyyy-MM-dd', { locale: sv })}
												</p>
											)}
										</div>
										<p className="font-medium ml-4">
											{item.total?.toLocaleString('sv-SE') || '0'} kr
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Expenses */}
				<div className="border rounded-lg">
					<button
						onClick={() => toggleCategory('expenses')}
						className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
					>
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-blue-100">
								<Receipt className="h-5 w-5 text-blue-600" />
							</div>
							<div className="text-left">
								<p className="font-medium">Utgifter</p>
								<p className="text-sm text-muted-foreground">
									{expenses.count} {expenses.count === 1 ? 'utgift' : 'utgifter'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<p className="text-lg font-bold">{expenses.total.toLocaleString('sv-SE')} kr</p>
							{expandedCategory === 'expenses' ? (
								<ChevronUp className="h-5 w-5 text-muted-foreground" />
							) : (
								<ChevronDown className="h-5 w-5 text-muted-foreground" />
							)}
						</div>
					</button>
					{expandedCategory === 'expenses' && expenses.items.length > 0 && (
						<div className="border-t p-4 bg-muted/30">
							<div className="space-y-2">
								{expenses.items.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between p-2 bg-background rounded"
									>
										<div className="flex-1 min-w-0">
											<p className="font-medium truncate">{item.description || 'Ingen beskrivning'}</p>
											{item.expenseDate && (
												<p className="text-sm text-muted-foreground">
													{format(new Date(item.expenseDate), 'yyyy-MM-dd', { locale: sv })}
												</p>
											)}
										</div>
										<p className="font-medium ml-4">
											{item.amount?.toLocaleString('sv-SE') || '0'} kr
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Mileage */}
				<div className="border rounded-lg">
					<button
						onClick={() => toggleCategory('mileage')}
						className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
					>
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-purple-100">
								<Car className="h-5 w-5 text-purple-600" />
							</div>
							<div className="text-left">
								<p className="font-medium">Körsträcka</p>
								<p className="text-sm text-muted-foreground">
									{mileage.count} {mileage.count === 1 ? 'resa' : 'resor'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<p className="text-lg font-bold">{mileage.total.toLocaleString('sv-SE')} kr</p>
							{expandedCategory === 'mileage' ? (
								<ChevronUp className="h-5 w-5 text-muted-foreground" />
							) : (
								<ChevronDown className="h-5 w-5 text-muted-foreground" />
							)}
						</div>
					</button>
					{expandedCategory === 'mileage' && mileage.items.length > 0 && (
						<div className="border-t p-4 bg-muted/30">
							<div className="space-y-2">
								{mileage.items.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between p-2 bg-background rounded"
									>
										<div className="flex-1 min-w-0">
											{item.tripDate && (
												<p className="font-medium">
													{format(new Date(item.tripDate), 'yyyy-MM-dd', { locale: sv })}
												</p>
											)}
											{item.distanceKm && item.ratePerKm && (
												<p className="text-sm text-muted-foreground">
													{item.distanceKm} km × {item.ratePerKm.toLocaleString('sv-SE')} kr/km
												</p>
											)}
										</div>
										<p className="font-medium ml-4">
											{item.total?.toLocaleString('sv-SE') || '0'} kr
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

