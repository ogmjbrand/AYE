export type DiningTransactionStatus = 'ordered' | 'served' | 'eating' | 'paid' | 'cancelled';

export interface DiningTransaction {
  id: string;
  dishId: string;
  status: DiningTransactionStatus;
}

export function createDiningTransaction(id: string, dishId: string): DiningTransaction {
  return { id, dishId, status: 'ordered' };
}

export function transitionDiningTransaction(
  transaction: DiningTransaction,
  next: DiningTransactionStatus,
): DiningTransaction | null {
  const allowed: Readonly<Record<DiningTransactionStatus, readonly DiningTransactionStatus[]>> = {
    ordered: ['served', 'cancelled'],
    served: ['eating', 'cancelled'],
    eating: ['served', 'paid', 'cancelled'],
    paid: [],
    cancelled: [],
  };
  return allowed[transaction.status].includes(next) ? { ...transaction, status: next } : null;
}

export function settleDiningTransaction(
  transaction: DiningTransaction,
  price: number,
): { transaction: DiningTransaction; payment: number } {
  const settled = Number.isFinite(price) && price > 0
    ? transitionDiningTransaction(transaction, 'paid')
    : null;
  return settled ? { transaction: settled, payment: price } : { transaction, payment: 0 };
}

export function cancelDiningTransaction(transaction: DiningTransaction | null): DiningTransaction | null {
  if (!transaction || transaction.status === 'paid' || transaction.status === 'cancelled') return transaction;
  return transitionDiningTransaction(transaction, 'cancelled');
}
