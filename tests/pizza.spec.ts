import { test, expect } from './testSetup';
import { basicInit } from './basicInit';

test('home page', async ({ page }) => {
  await page.goto('/');

  expect(await page.title()).toBe('JWT Pizza');
});

test('purchase with login', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Order' }).click();
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('Here is your JWT Pizza!')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('0.008 ₿');
});

test('verify pizza', async ({ page }) => {
  await basicInit(page);
  await page.route('*/**/api/order/verify', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({ jwt: 'eyJpYXQ' });
    await route.fulfill({ json: { message: 'valid', payload: { vendor: { id: 'supermp' }, diner: { id: 2 }, order: { id: 23 } } } });
  });

  await page.getByRole('button', { name: 'Order now' }).click();
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Pay now' }).click();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.locator('h3')).toHaveText('JWT Pizza - valid');
});

test('login', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'pd' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0);
});

test('login with wrong password', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('wrong');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await expect(page.getByRole('main')).toContainText('{"code":404,"message":"unknown user"}');
  await expect(page.getByRole('link', { name: 'pd' })).toHaveCount(0);
});

test('logout', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Logout' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'pd' })).toHaveCount(0);
});

test('register', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza reg');
  await page.getByRole('textbox', { name: 'Email address' }).fill('r@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('reg');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('link', { name: 'pr' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register' })).toHaveCount(0);
});

test('diner dashboard', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza diner');
  await expect(page.getByRole('main')).toContainText('d@jwt.com');
  await expect(page.getByRole('main')).toContainText('role: diner');
  await expect(page.getByRole('row', { name: '23 0.008 ₿ 2026-10-08T06:09:25.000Z' })).toBeVisible();
});

test('diner dashboard with no orders', async ({ page }) => {
  await basicInit(page);
  await page.route('*/**/api/order', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: { dinerId: 2, orders: [], page: 1 } });
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('How have you lived this long without having a pizza?');
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('franchise page as diner', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('main')).toContainText('So you want a piece of the pie?');
  await expect(page.getByRole('button', { name: 'Create store' })).toHaveCount(0);
});

test('franchise dashboard', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('franchisee');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('heading', { name: 'pizzaPocket' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'SLC 0.032 ₿ Close' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Provo 0 ₿ Close' })).toBeVisible();
  await expect(page.getByText('So you want a piece of the pie?')).toHaveCount(0);
});

test('create store', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('franchisee');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByRole('textbox', { name: 'store name' }).fill('Orem');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('row', { name: 'Orem 0 ₿ Close' })).toBeVisible();
});

test('close store', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'Login', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('franchisee');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('row', { name: 'Provo 0 ₿ Close' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('row', { name: 'SLC 0.032 ₿ Close' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Provo/ })).toHaveCount(0);
});

test('admin dashboard', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: "Mama Ricci's kitchen" })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('LotaPizza');
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('PizzaCorp');
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('pizzaPocket');
  await page.getByRole('button', { name: '»' }).click();
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('topSpot');
  await expect(page.getByRole('table', { name: 'Franchises' })).not.toContainText('pizzaPocket');
  await page.getByRole('button', { name: '«' }).click();
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('pizzaPocket');
});

test('filter franchises', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('pizzaPocket');
  await page.getByRole('textbox', { name: 'Filter franchises' }).fill('Lota');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('LotaPizza');
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('pizza owner');
  await expect(page.getByRole('table', { name: 'Franchises' })).not.toContainText('pizzaPocket');
  await expect(page.getByRole('table', { name: 'Franchises' })).not.toContainText('PizzaCorp');
});

test('create franchise', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).fill('testFranchisee');
  await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('t@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: '»' }).click();
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('testFranchisee');
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('pizza tester');
});

test('close franchise', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('button', { name: '»' }).click();
  await page.getByRole('row', { name: 'topSpot pizza owner' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('pizzaPocket');
  await expect(page.getByRole('button', { name: '»' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Filter franchises' }).fill('topSpot');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('table', { name: 'Franchises' })).not.toContainText('pizzaPocket');
  await expect(page.getByRole('table', { name: 'Franchises' })).not.toContainText('topSpot');
});

test('close store as admin', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('row', { name: 'Spanish Fork 0 ₿ Close' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('table', { name: 'Franchises' })).toContainText('PizzaCorp');
  await expect(page.getByRole('row', { name: /Spanish Fork/ })).toHaveCount(0);
});

test('about page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('main')).toContainText('The secret sauce');
  await expect(page.getByRole('main')).toContainText('our employees are more than just pizza makers');
});

test('history page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'Mama Rucci, my my' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Pizza has a long and rich history');
});

test('not found page', async ({ page }) => {
  await page.goto('/nowhere');
  await expect(page.getByRole('heading', { name: 'Oops' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('dropped a pizza on the floor');
});
