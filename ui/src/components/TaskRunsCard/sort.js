export const getPriority = a => {
  if (a?.name?.includes('live.log')) {
    return 1;
  }

  if (a?.name?.includes('live_backing.log')) {
    return 2;
  }

  return a?.name?.startsWith('public/') ? 3 : 4;
};

export const sortArtifacts = artifacts => {
  return artifacts
    .map(a => ({ ...a, priority: getPriority(a) }))
    .sort((a, b) => {
      if (a.priority === b.priority) {
        return a.name?.localeCompare(b.name);
      }

      return a.priority - b.priority;
    });
};
