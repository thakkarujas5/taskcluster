import { sortArtifacts, getPriority } from './sort';

it('should define priority based on name', () => {
  expect(getPriority({})).toBe(4);
  expect(getPriority({ name: 'private/file.log' })).toBe(4);
  expect(getPriority({ name: 'public/file.log' })).toBe(3);
  expect(getPriority({ name: 'public/live_backing.log' })).toBe(2);
  expect(getPriority({ name: 'public/live.log' })).toBe(1);
});

it('should sort by name with priority', () => {
  const unsortedArtifacts = [
    { name: 'private/b.out' },
    { name: 'private/a.out' },
    { name: 'public/live.log' },
    { name: 'private/coverage.json' },
    { name: 'public/live_backing.log' },
  ];
  const sorted = sortArtifacts(unsortedArtifacts);

  expect(sorted).toHaveLength(5);
  expect(sorted[0].name).toBe('public/live.log');
  expect(sorted[1].name).toBe('public/live_backing.log');
  expect(sorted[2].name).toBe('private/a.out');
  expect(sorted[3].name).toBe('private/b.out');
  expect(sorted[4].name).toBe('private/coverage.json');
});
