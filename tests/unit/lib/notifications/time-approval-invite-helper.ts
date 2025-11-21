/**
 * Helper functions for time-approval-invite tests
 */

// Shared call counter across all time_entries queries
let timeEntriesQueryCount = 0;

export function resetTimeEntriesQueryCount() {
  timeEntriesQueryCount = 0;
}

export function createTimeEntriesMock(entry: any, pendingCount: number = 1) {
  return {
    select: jest.fn().mockImplementation((...args: any[]) => {
      timeEntriesQueryCount++;
      if (timeEntriesQueryCount === 1) {
        // First query: fetch entry with .eq().single()
        return {
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: entry,
              error: null,
            }),
          }),
        };
      } else {
        // Second query: pendingCount with .eq().eq().in().not()
        const eqChain: any = {
          eq: jest.fn(),
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: pendingCount,
              error: null,
            }),
          }),
        };
        eqChain.eq.mockReturnValue(eqChain); // Allow chaining .eq().eq()
        return eqChain;
      }
    }),
  };
}

export function createPendingCountQuery(count: number = 1) {
  const eqChain: any = {
    eq: jest.fn(),
    in: jest.fn().mockReturnValue({
      not: jest.fn().mockResolvedValue({
        count,
        error: null,
      }),
    }),
  };
  eqChain.eq.mockReturnValue(eqChain); // Allow chaining .eq().eq()
  return eqChain;
}

