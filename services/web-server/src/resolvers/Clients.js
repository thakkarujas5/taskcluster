export default {
  Query: {
    clients(_parent, { clientOptions, connection, searchTerm }, { loaders }) {
      return loaders.clients.load({ clientOptions, connection, searchTerm });
    },
  },
};
