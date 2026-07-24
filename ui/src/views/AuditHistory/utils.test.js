import { sortAuditHistory } from './utils';

describe('audit history sorting', () => {
  const auditHistory = [
    { actionType: 'updated', created: '2026-01-02T00:00:00Z' },
    { actionType: 'created', created: '2026-01-01T00:00:00Z' },
  ];

  it('sorts creation time in descending order', () => {
    expect(
      sortAuditHistory(auditHistory, 'created', 'desc').map(
        entry => entry.actionType
      )
    ).toEqual(['updated', 'created']);
  });

  it('sorts another field in ascending order without mutating the input', () => {
    expect(
      sortAuditHistory(auditHistory, 'actionType', 'asc').map(
        entry => entry.actionType
      )
    ).toEqual(['created', 'updated']);
    expect(auditHistory[0].actionType).toBe('updated');
  });
});
