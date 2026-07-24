import assert from 'node:assert';
import helper from '../helper.js';
import testing from '@taskcluster/lib-testing';

const THIS_VERSION = parseInt(/.*\/0*(\d+)_test\.js/.exec(import.meta.url)[1], 10);
const PREV_VERSION = THIS_VERSION - 1;

suite(testing.suiteName(), () => {
  helper.withDbForVersion();

  test('audit history supports ordered pagination', async () => {
    await testing.resetDb({ testDbUrl: helper.dbUrl });
    await helper.upgradeTo(PREV_VERSION);
    await helper.upgradeTo(THIS_VERSION);

    const db = await helper.setupDb('auth');
    await helper.withDbClient(client =>
      client.query(`
        insert into audit_history (entity_id, entity_type, client_id, action_type, created)
        values
          ('entity-1', 'client', 'actor', 'first',  '2026-01-01T00:00:00Z'),
          ('entity-1', 'client', 'actor', 'second', '2026-01-02T00:00:00Z'),
          ('entity-1', 'client', 'actor', 'third',  '2026-01-03T00:00:00Z'),
          ('entity-1', 'client', 'actor', 'fourth', '2026-01-04T00:00:00Z')
      `)
    );

    const defaultPage = await db.fns.get_combined_audit_history_2(
      null,
      'entity-1',
      'client',
      null,
      null,
      2,
      0
    );
    assert.deepEqual(
      defaultPage.map(entry => entry.action_type),
      ['fourth', 'third']
    );

    const descendingPage2 = await db.fns.get_combined_audit_history_2(
      null,
      'entity-1',
      'client',
      null,
      'desc',
      2,
      2
    );
    assert.deepEqual(
      descendingPage2.map(entry => entry.action_type),
      ['second', 'first']
    );

    const ascendingPage1 = await db.fns.get_combined_audit_history_2(
      null,
      'entity-1',
      'client',
      'created',
      'asc',
      2,
      0
    );
    assert.deepEqual(
      ascendingPage1.map(entry => entry.action_type),
      ['first', 'second']
    );

    const ascendingPage2 = await db.fns.get_combined_audit_history_2(
      null,
      'entity-1',
      'client',
      'created',
      'asc',
      2,
      2
    );
    assert.deepEqual(
      ascendingPage2.map(entry => entry.action_type),
      ['third', 'fourth']
    );

    const actionTypeOrder = await db.fns.get_combined_audit_history_2(
      null,
      'entity-1',
      'client',
      'action_type',
      'asc',
      4,
      0
    );
    assert.deepEqual(
      actionTypeOrder.map(entry => entry.action_type),
      ['first', 'fourth', 'second', 'third']
    );

    const oldFunction = await db.deprecatedFns.get_combined_audit_history(null, 'entity-1', 'client', 2, 0);
    assert.deepEqual(
      oldFunction.map(entry => entry.action_type),
      ['first', 'second']
    );

    await assert.rejects(
      () =>
        db.fns.get_combined_audit_history_2(
          null,
          'entity-1',
          'client',
          null,
          'sideways',
          2,
          0
        ),
      /sort_direction_in must be asc or desc/
    );

    await assert.rejects(
      () =>
        db.fns.get_combined_audit_history_2(
          null,
          'entity-1',
          'client',
          'unknown',
          'asc',
          2,
          0
        ),
      /sort_by_in must be/
    );
  });
});
