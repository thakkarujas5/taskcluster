export default {
  Query: {
    listRoleIds(_parent, { connection, searchTerm }, { loaders }) {
      return loaders.roleIds.load({ searchTerm, connection });
    },
  },
};
