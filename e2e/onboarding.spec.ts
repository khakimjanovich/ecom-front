import { expect, type Page, test } from '@playwright/test';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'local-only';
const PASSWORD = 'correct-horse-battery-42';
const PDF = '%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n';
const REQUIRED = ['Company charter', "Director's passport"];

/** One document's card (the outer Documents card also contains every heading, so the inner one is last). */
const documentCard = (page: Page, type: string) =>
  page.locator('.mantine-Card-root', { has: page.getByRole('heading', { name: type }) }).last();

/** The newest one-time code Mailpit received for this address. */
async function codeFor(page: Page, email: string): Promise<string> {
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`${MAILPIT}/api/v1/search?query=to:${email}`)).json()).messages_count,
    )
    .toBeGreaterThan(0);
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

test('a merchant signs up in Uzbek, gives its documents, two admins activate it, it creates an API client, gets a website switched on with a terminal and a fee agreed by two admins, and the bank checks card schemes', async ({
  page,
}) => {
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
  await page
    .getByLabel('Kod')
    .first()
    .pressSequentially(await codeFor(page, email));
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

  // The merchant gives the bank its company documents (KYB).
  await page.goto('/merchant/documents');
  await signIn(page, email, PASSWORD);
  for (const type of REQUIRED) {
    const card = documentCard(page, type);
    const chooser = page.waitForEvent('filechooser');
    await card.getByRole('button', { name: 'Choose file' }).click();
    await (
      await chooser
    ).setFiles({ name: 'document.pdf', mimeType: 'application/pdf', buffer: Buffer.from(PDF) });
    await card.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(card.getByText('Waiting for review')).toBeVisible();
  }
  await expect(page.getByText('Being checked').first()).toBeVisible();
  await signOut(page);

  // Admin aziz: verifies each document, approves the company, signs the contract, asks for activation.
  await page.goto('/admin/partners');
  await signIn(page, 'aziz', ADMIN_PASSWORD);
  await page.getByPlaceholder('Search by company or email').fill(email);
  await page.getByRole('link', { name: company }).click();
  for (const type of REQUIRED) {
    const card = documentCard(page, type);
    await card.getByRole('button', { name: 'Verify' }).click();
    await expect(card.getByText('Verified by aziz')).toBeVisible();
  }
  await expect(page.getByText('Every required document is verified.', { exact: false })).toBeVisible();
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
  await page
    .locator('.mantine-Card-root', { hasText: company })
    .getByRole('button', { name: 'Approve' })
    .click();
  await expect(page.getByText(`${company} is now active`)).toBeVisible();
  await signOut(page);

  // The merchant is live and creates an API client; the secret is shown once, and the signing key
  // waits for the bank to put it into Vault.
  await page.goto('/merchant');
  await signIn(page, email, PASSWORD);
  await expect(page.getByText('Active').first()).toBeVisible();
  await page.getByRole('link', { name: 'API clients' }).click();
  await page.getByRole('button', { name: 'New client' }).click();
  const secret = page.getByRole('dialog');
  await expect(
    secret.getByText('This is the only time you will see this secret.', { exact: false }),
  ).toBeVisible();
  await expect(secret.getByRole('button', { name: 'Done' })).toBeDisabled();
  await secret.getByRole('checkbox').check();
  await secret.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('cell', { name: /partner-/ })).toBeVisible();
  await expect(page.getByText('Not set yet')).toBeVisible();

  await page.getByRole('button', { name: 'Rotate secret' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Rotate secret' }).click();
  await expect(page.getByRole('dialog').getByText('New secret')).toBeVisible();

  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();

  // A website: a return address on another domain is refused by the server; a correct one makes a draft.
  const site = `https://shop-${Date.now()}.example.uz`;
  await page.getByRole('link', { name: 'Websites' }).click();
  await page.getByRole('button', { name: 'Add website' }).click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Name').fill('Main shop');
  await add.getByLabel('Website').fill(site);
  await add.getByLabel('Return addresses').fill('https://evil.example/steal');
  await add.getByLabel('Return addresses').press('Enter');
  await add.getByRole('button', { name: 'Add website' }).click();
  await expect(add.getByText('Return URLs must be on the website', { exact: false })).toBeVisible();
  await add.getByLabel('Return addresses').press('Backspace'); // removes the last address
  await add.getByLabel('Return addresses').fill(`${site}/done`);
  await add.getByLabel('Return addresses').press('Enter');
  await add.getByRole('button', { name: 'Add website' }).click();
  await expect(page.getByText('Draft')).toBeVisible();
  await signOut(page);

  // The bank: a failed check blocks switching on; a passed check, the terms, then it takes payments.
  await page.goto('/admin/partners');
  await signIn(page, 'aziz', ADMIN_PASSWORD);
  await page.getByPlaceholder('Search by company or email').fill(email);
  await page.getByRole('link', { name: company }).click();
  await page.getByRole('link', { name: 'Main shop' }).click();
  await page.getByRole('radiogroup', { name: 'Result' }).getByText('Failed').click();
  await page.getByLabel('What you found').fill('No refund policy page');
  await page.getByRole('button', { name: 'Record a check' }).click();
  await page.getByRole('checkbox', { name: 'Uzcard' }).check();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Switch on' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Switch on' }).click();
  await expect(page.getByText('latest check must have passed', { exact: false })).toBeVisible();

  await page.getByRole('radiogroup', { name: 'Result' }).getByText('Passed').click();
  await page.getByRole('button', { name: 'Record a check' }).click();
  await page.getByRole('button', { name: 'Switch on' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Switch on' }).click();
  await expect(page.getByText('Taking payments').first()).toBeVisible();

  // Its Uzcard terminal, from what the processing center issued; payments now have a route.
  const mid = `${Date.now()}`.slice(-12);
  await page.getByLabel('MID').fill(mid);
  await page.getByLabel('TID').fill('T0000001');
  await page.getByRole('button', { name: 'Register terminal' }).click();
  await expect(page.getByRole('cell', { name: new RegExp(mid) })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(mid) }).getByText('Live')).toBeVisible();

  // The bank's Terminals page finds it by part of its MID, with its history.
  await page.getByRole('link', { name: 'Terminals' }).click();
  await page.getByPlaceholder('Search MID or TID').fill(mid.slice(2, 9));
  await page.getByRole('row', { name: new RegExp(mid) }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByText('Terminal', { exact: true })).toBeVisible();
  await expect(drawer.getByText('Registered').last()).toBeVisible();
  await page.keyboard.press('Escape');

  // A fee for that website: aziz proposes it, can't approve it himself, malika approves.
  await page.getByRole('link', { name: 'Fees' }).click();
  await page.getByRole('button', { name: 'New rule' }).click();
  const rule = page.getByRole('dialog');
  await rule.getByLabel('Merchant').fill(email);
  await page.getByRole('option', { name: new RegExp(company) }).click();
  await rule.getByLabel('Website').click();
  await page.getByRole('option', { name: /Main shop/ }).click();
  await rule.getByLabel('Percent').fill('1');
  await rule.getByLabel("Fixed fee, so'm").fill('1');
  await rule.getByRole('button', { name: 'Send for approval' }).click();
  await expect(page.getByText('Waiting for approval').first()).toBeVisible();
  await page.getByText('Waiting for approval', { exact: true }).first().click(); // the filter
  await page
    .getByRole('row', { name: new RegExp(company) })
    .first()
    .click();
  await expect(page.getByRole('dialog').getByText('Rule proposed')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: 'Approvals' }).click();
  await page.getByRole('tab', { name: /Fee changes/ }).click();
  const feeChange = page.locator('.mantine-Card-root', { hasText: company });
  await expect(feeChange.getByRole('button', { name: 'Approve' })).toBeDisabled();
  await signOut(page);

  await page.goto('/admin/approvals');
  await signIn(page, 'malika', ADMIN_PASSWORD);
  await page.getByRole('tab', { name: /Fee changes/ }).click();
  await page
    .locator('.mantine-Card-root', { hasText: company })
    .getByRole('button', { name: 'Approve' })
    .click();
  await expect(page.locator('.mantine-Card-root', { hasText: company })).toHaveCount(0);

  // The calculator: 1% of 100 000 so'm plus 1 so'm.
  await page.getByRole('link', { name: 'Fees' }).click();
  const calculator = page.locator('.mantine-Card-root', { hasText: 'Fee calculator' });
  await calculator.getByLabel('Merchant').fill(email);
  await page.getByRole('option', { name: new RegExp(company) }).click();
  await calculator.getByLabel('Website').click();
  await page.getByRole('option', { name: /Main shop/ }).click();
  await calculator.getByRole('button', { name: 'Calculate' }).click();
  await expect(calculator.getByText(/1,001\.00/)).toBeVisible();

  // Cards: the BIN registry knows both schemes, and the vault finds nothing it hasn't stored.
  await page.getByRole('link', { name: 'Cards' }).click();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText(/Synced: Uzcard \d+, Humo \d+ ranges/)).toBeVisible();
  await expect(page.getByRole('cell', { name: '860014' })).toBeVisible();
  await page.getByLabel("Check a card's first digits").fill('98600901');
  await expect(page.getByText('Humo', { exact: true }).first()).toBeVisible();
  await page.getByLabel("Check a card's first digits").fill('41111111');
  await expect(page.getByText('No scheme issues cards starting with these digits.')).toBeVisible();
  await page.getByLabel('Card number').fill('8600 1402 0000 0033');
  await page.getByRole('button', { name: 'Find card' }).click();
  await expect(page.getByText('No such card.')).toBeVisible();

  // Payments: none yet for this merchant; its server creates them with signed requests.
  await page.getByRole('link', { name: 'Payments' }).click();
  await page.getByPlaceholder('All merchants').fill(email);
  await page.getByRole('option', { name: new RegExp(company) }).click();
  await expect(page.getByText('No payments yet')).toBeVisible();
});
