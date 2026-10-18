import { expect, type Page, test } from '@playwright/test';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'local-only';
const PASSWORD = 'correct-horse-battery-42';

/** The newest one-time code Mailpit received for this address. */
async function codeFor(page: Page, email: string): Promise<string> {
  await expect.poll(async () => (await (await page.request.get(`${MAILPIT}/api/v1/search?query=to:${email}`)).json()).messages_count).toBeGreaterThan(0);
  const { messages } = await (await page.request.get(`${MAILPIT}/api/v1/search?query=to:${email}`)).json();
  const message = await (await page.request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
  return message.Text.match(/\b\d{6}\b/)[0];
}

async function signIn(page: Page, username: string, password: string) {
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: /account|hisob|аккаунт/i }).click();
  await page.getByRole('menuitem').click();
  await expect(page).toHaveURL(/localhost:5180\/?$/);
}

test('a merchant signs up in Uzbek, two admins activate it, and it creates an API client', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.uz`;
  const company = `Aziza Shoes ${Date.now()}`;

  // Sign up, in Uzbek.
  await page.goto('/');
  await page.getByRole('button', { name: 'Language' }).click();
  await page.getByRole('menuitem', { name: 'Oʻzbekcha' }).click();
  await page.getByRole('link', { name: 'Merchant hisobini yaratish' }).click();
  await page.getByLabel('Kompaniya nomi').fill(company);
  await page.getByLabel('Ish emaili').fill(email);
  await page.getByLabel('Parol').fill(PASSWORD);
  await page.getByRole('button', { name: 'Hisob yaratish' }).click();

  // The emailed code, typed into the six boxes; the email itself is in Uzbek.
  await expect(page.getByRole('heading', { name: 'Emailingizni tekshiring' })).toBeVisible();
  await page.getByLabel('Kod').first().pressSequentially(await codeFor(page, email));
  await expect(page.getByRole('heading', { name: 'Email tasdiqlandi' })).toBeVisible();

  // A wrong action shows the server's message in the screen language.
  await page.goto('/signup');
  await page.getByLabel('Kompaniya nomi').fill(company);
  await page.getByLabel('Ish emaili').fill(email);
  await page.getByLabel('Parol').fill(PASSWORD);
  await page.getByRole('button', { name: 'Hisob yaratish' }).click();
  await expect(page.getByText(`${email} allaqachon roʻyxatdan oʻtgan.`)).toBeVisible();

  // Back to English for the bank side.
  await page.getByRole('button', { name: 'Til' }).click();
  await page.getByRole('menuitem', { name: 'English' }).click();

  // Admin aziz: documents, contract, activation request.
  await page.goto('/admin/partners');
  await signIn(page, 'aziz', ADMIN_PASSWORD);
  await page.getByPlaceholder('Search by company or email').fill(email);
  await page.getByRole('link', { name: company }).click();
  await page.getByRole('button', { name: 'Approve documents' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve documents' }).click();
  await expect(page.getByText('Waiting for contract').first()).toBeVisible();

  await page.getByRole('button', { name: 'Sign contract' }).click();
  await page.getByLabel('Contract number').fill(`HP-${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Sign contract' }).click();
  await expect(page.getByText('Approved').first()).toBeVisible();

  await page.getByRole('button', { name: 'Request activation' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Request activation' }).click();
  await page.getByRole('link', { name: 'Approvals' }).click();
  const request = page.locator('.mantine-Card-root', { hasText: company });
  await expect(request.getByRole('button', { name: 'Approve' })).toBeDisabled(); // four eyes: not by the maker
  await signOut(page);

  // Admin malika approves.
  await page.goto('/admin/approvals');
  await signIn(page, 'malika', ADMIN_PASSWORD);
  await page.locator('.mantine-Card-root', { hasText: company }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText(`${company} is now active`)).toBeVisible();
  await signOut(page);

  // The merchant is live and creates an API client; the secret is shown once.
  await page.goto('/merchant');
  await signIn(page, email, PASSWORD);
  await expect(page.getByText('Active').first()).toBeVisible();
  await page.getByRole('link', { name: 'API clients' }).click();
  await page.getByRole('button', { name: 'New client' }).click();
  const secret = page.getByRole('dialog');
  await expect(secret.getByText('This is the only time you will see this secret.', { exact: false })).toBeVisible();
  await expect(secret.getByRole('button', { name: 'Done' })).toBeDisabled();
  await secret.getByRole('checkbox').check();
  await secret.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('cell', { name: /partner-/ })).toBeVisible();

  await page.getByRole('button', { name: 'Rotate secret' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Rotate secret' }).click();
  await expect(page.getByRole('dialog').getByText('New secret')).toBeVisible();
});
