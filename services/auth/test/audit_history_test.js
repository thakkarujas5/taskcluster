import assert from 'node:assert';
import helper from './helper.js';
import slugid from 'slugid';
import testing from '@taskcluster/lib-testing';
import taskcluster from '@taskcluster/client';

helper.secrets.mockSuite('audit', ['gcp'], (mock, skipping) => {
  helper.withDb(mock, skipping);
  helper.withCfg(mock, skipping);
  helper.withPulse(skipping);
  helper.withServers(skipping);
  helper.resetTables();

  let clientId;
  clientId = slugid.v4();
  suiteSetup(async function () {
    if (skipping()) {
      this.skip();
    }
  });

  setup(async () => {
    await testing.resetTables({ tableNames: ['audit_history'] });
  });

  test('get audit history', async () => {
    const entityType = 'client';

    await helper.apiClient.createClient(clientId, {
      expires: taskcluster.fromNowJSON('1 day'),
      description: 'test client...',
      scopes: [`auth:audit-history:${entityType}`],
    });

    await helper.apiClient.updateClient(clientId, {
      expires: taskcluster.fromNowJSON('2 days'),
      description: 'updated description',
      scopes: [`auth:audit-history:${entityType}`],
    });

    const longClientId = 'test/client/id/with/slashes';
    await helper.apiClient.createClient(longClientId, {
      expires: taskcluster.fromNowJSON('2 days'),
      description: 'updated description',
      scopes: [],
    });

    const audit_history = await helper.apiClient.getEntityHistory(entityType, clientId);

    assert.equal(audit_history.auditHistory.length, 2);
    assert.equal(audit_history.auditHistory[0].clientId, 'static/taskcluster/root');
    assert.equal(audit_history.auditHistory[0].actionType, 'updated');
    assert.equal(audit_history.auditHistory[1].clientId, 'static/taskcluster/root');
    assert.equal(audit_history.auditHistory[1].actionType, 'created');

    const audit_history_long = await helper.apiClient.getEntityHistory(entityType, longClientId);

    assert.equal(audit_history_long.auditHistory.length, 1);
    assert.equal(audit_history_long.auditHistory[0].clientId, 'static/taskcluster/root');
    assert.equal(audit_history_long.auditHistory[0].actionType, 'created');
  });

  test('list client audit history', async () => {
    await helper.apiClient.createClient(clientId, {
      expires: taskcluster.fromNowJSON('1 day'),
      description: 'test client...',
      scopes: [],
    });

    await helper.apiClient.updateClient(clientId, {
      expires: taskcluster.fromNowJSON('2 days'),
      description: 'updated description',
      scopes: [],
    });

    const audit_history = await helper.apiClient.listAuditHistory('static/taskcluster/root');

    assert.equal(audit_history.auditHistory.length, 2);
    assert.equal(audit_history.auditHistory[0].clientId, 'static/taskcluster/root');
    assert.equal(audit_history.auditHistory[0].actionType, 'updated');
    assert.equal(audit_history.auditHistory[1].clientId, 'static/taskcluster/root');
    assert.equal(audit_history.auditHistory[1].actionType, 'created');
  });

  test('audit history ordering and pagination', async () => {
    const entityType = 'client';
    const entityId = 'ordered-client';

    await helper.withDbClient(client =>
      client.query(
        `
          insert into audit_history (entity_id, entity_type, client_id, action_type, created)
          values
            ($1, $2, 'audit-actor', 'first',  '2026-01-01T00:00:00Z'),
            ($1, $2, 'audit-actor', 'second', '2026-01-02T00:00:00Z'),
            ($1, $2, 'audit-actor', 'third',  '2026-01-03T00:00:00Z'),
            ($1, $2, 'audit-actor', 'fourth', '2026-01-04T00:00:00Z')
        `,
        [entityId, entityType]
      )
    );

    const defaultPage1 = await helper.apiClient.getEntityHistory(entityType, entityId, { limit: 2 });
    assert.deepEqual(
      defaultPage1.auditHistory.map(entry => entry.actionType),
      ['fourth', 'third']
    );
    assert(defaultPage1.continuationToken);

    const defaultPage2 = await helper.apiClient.getEntityHistory(entityType, entityId, {
      limit: 2,
      continuationToken: defaultPage1.continuationToken,
    });
    assert.deepEqual(
      defaultPage2.auditHistory.map(entry => entry.actionType),
      ['second', 'first']
    );
    assert.equal(defaultPage2.continuationToken, undefined);

    const ascendingPage1 = await helper.apiClient.getEntityHistory(entityType, entityId, {
      limit: 2,
      sortDirection: 'asc',
    });
    assert.deepEqual(
      ascendingPage1.auditHistory.map(entry => entry.actionType),
      ['first', 'second']
    );
    assert(ascendingPage1.continuationToken);

    const ascendingPage2 = await helper.apiClient.getEntityHistory(entityType, entityId, {
      limit: 2,
      continuationToken: ascendingPage1.continuationToken,
      sortDirection: 'asc',
    });
    assert.deepEqual(
      ascendingPage2.auditHistory.map(entry => entry.actionType),
      ['third', 'fourth']
    );
    assert.equal(ascendingPage2.continuationToken, undefined);

    const actionTypeOrder = await helper.apiClient.getEntityHistory(entityType, entityId, {
      limit: 4,
      sortBy: 'actionType',
      sortDirection: 'asc',
    });
    assert.deepEqual(
      actionTypeOrder.auditHistory.map(entry => entry.actionType),
      ['first', 'fourth', 'second', 'third']
    );

    const clientHistoryPage1 = await helper.apiClient.listAuditHistory('audit-actor', {
      limit: 2,
      sortBy: 'created',
      sortDirection: 'asc',
    });
    assert.deepEqual(
      clientHistoryPage1.auditHistory.map(entry => entry.actionType),
      ['first', 'second']
    );
    assert(clientHistoryPage1.continuationToken);

    const clientHistoryPage2 = await helper.apiClient.listAuditHistory('audit-actor', {
      limit: 2,
      continuationToken: clientHistoryPage1.continuationToken,
      sortDirection: 'asc',
    });
    assert.deepEqual(
      clientHistoryPage2.auditHistory.map(entry => entry.actionType),
      ['third', 'fourth']
    );
    assert.equal(clientHistoryPage2.continuationToken, undefined);
  });
});
