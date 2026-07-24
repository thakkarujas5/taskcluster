export const sortAuditHistory = (auditHistory, sortBy, sortDirection) => {
  if (!auditHistory || !sortBy) {
    return auditHistory;
  }

  return [...auditHistory].sort((first, second) => {
    const firstValue =
      sortDirection === 'desc' ? second[sortBy] : first[sortBy];
    const secondValue =
      sortDirection === 'desc' ? first[sortBy] : second[sortBy];

    if (sortBy === 'created') {
      return (
        new Date(firstValue).getTime() - new Date(secondValue).getTime()
      );
    }

    return String(firstValue || '').localeCompare(String(secondValue || ''));
  });
};
