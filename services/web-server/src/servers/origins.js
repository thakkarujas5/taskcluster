export const normalizeAllowedOrigins = origins =>
  origins
    .map(origin => {
      if (typeof origin === 'string' && origin.startsWith('/') && origin.endsWith('/')) {
        return new RegExp(origin.slice(1, -1));
      }

      return origin;
    })
    .filter(origin => origin && origin !== '');

export const isOriginAllowed = (origin, allowedOrigins) => {
  // Non-browser WebSocket clients commonly omit Origin. Authentication and
  // authorization still apply to these connections.
  if (!origin) {
    return true;
  }

  return allowedOrigins.some(allowed => {
    if (allowed === '*') {
      return true;
    }
    if (allowed instanceof RegExp) {
      allowed.lastIndex = 0;
      return allowed.test(origin);
    }

    return allowed === origin;
  });
};
