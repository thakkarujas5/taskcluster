import { test, expect } from './fixtures.mjs';
import { SecretsPage } from './pages/SecretsPage.mjs';

test('secrets page loads without errors', async ({ page, issues }) => {
  const secretsPage = new SecretsPage(page);

  await secretsPage.open();

  expect(await secretsPage.hasNotFound(), 'SPA rendered NotFound').toBe(false);

  const allIssues = Object.entries(issues).flatMap(([kind, items]) =>
    items.map((item) => `[${kind}] ${item}`)
  );

  expect(allIssues, 'page had errors').toEqual([]);
  await expect(secretsPage.tableHeader).toBeVisible();
});
