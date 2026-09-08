/** Identity for a completed percentage change over `days` compound days. */
export function compoundGrowth(rate: number, days: number): number {
	return (1 + rate) ** days;
}
