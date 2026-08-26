import assert from 'node:assert';
import taskcluster from '@taskcluster/client';
import gql from 'graphql-tag';
import testing from '@taskcluster/lib-testing';
import helper from '../helper.js';

helper.secrets.mockSuite(testing.suiteName(), [], (mock, skipping) => {
  helper.withDb(mock, skipping);
  helper.withClients(skipping);
  helper.withServer(skipping);
  helper.resetTables();

  suite('Roles GraphQL', () => {
    test('list role ids query works', async () => {
      const client = helper.getHttpClient();
      const roleId = taskcluster.slugid();
      const role = {
        scopes: ['scope1'],
        description: 'Test Scope 1',
      };
      const listRoleIdsQuery = await helper.loadFixture('listRoleIds.graphql');

      // 1. create role
      await helper.clients().auth.createRole(roleId, role);

      // 2. get role Ids
      const response = await client.query({
        query: gql`${listRoleIdsQuery}`,
      });

      assert.equal(response.data.listRoleIds.edges.length, 1);
      assert.equal(response.data.listRoleIds.edges[0].node.roleId, roleId);
    });
  });
});
