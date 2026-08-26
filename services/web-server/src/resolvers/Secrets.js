export default {
  Query: {
    secrets(_parent, { connection, searchTerm }, { loaders }) {
      return loaders.secrets.load({ connection, searchTerm });
    },
  },
};
