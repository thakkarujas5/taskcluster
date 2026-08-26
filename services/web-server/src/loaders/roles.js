import substringFilter from '../utils/searchFilter.js';
import ConnectionLoader from '../ConnectionLoader.js';

export default ({ auth }, _isAuthed, _rootUrl, _monitor, _strategies, _req, _cfg, _requestId) => {
  const roleIds = new ConnectionLoader(async ({ searchTerm, options }) => {
    const raw = await auth.listRoleIds(options);
    const roleIds = raw.roleIds.map(roleId => ({ roleId }));
    const roles = substringFilter(searchTerm, 'roleId', roleIds);

    return {
      ...raw,
      items: roles,
    };
  });

  return {
    roleIds,
  };
};
