import substringFilter from '../utils/searchFilter.js';
import ConnectionLoader from '../ConnectionLoader.js';

export default ({ secrets }, _isAuthed, _rootUrl, _monitor, _strategies, _req, _cfg, _requestId) => {
  const secretsList = new ConnectionLoader(async ({ searchTerm, options }) => {
    const raw = await secrets.list(options);
    const secretsList = raw.secrets.map(name => ({ name }));

    return {
      ...raw,
      items: substringFilter(searchTerm, 'name', secretsList),
    };
  });

  return {
    secrets: secretsList,
  };
};
