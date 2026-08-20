import { BasePage } from './BasePage.mjs';

export class SecretsPage extends BasePage {
  async open() {
    return this.navigate('/secrets');
  }

  get searchInput() {
    return this.page.getByPlaceholder('Secret contains');
  }

  get tableHeader() {
    return this.page.getByText('Secret ID', { exact: true });
  }

  secretLink(name) {
    return this.page.getByRole('link', { name, exact: true });
  }

  get createButton() {
    return this.page.getByTitle('Create Secret');
  }
}
