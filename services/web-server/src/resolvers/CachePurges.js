export default {
  Mutation: {
    async purgeCache(_parent, { provisionerId, workerType, payload }, { clients }) {
      await clients.purgeCache.purgeCache(`${provisionerId}/${workerType}`, payload);

      return { provisionerId, workerType };
    },
  },
};
