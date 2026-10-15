import { test, expect } from './testSetup';
import { basicInit } from './basicInit';

test('update user', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill('user@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();

  await page.getByRole('textbox', { name: 'Email address' }).fill('user@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

test('update email and password', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('textbox').nth(1).fill('dx@jwt.com');
  await page.getByRole('textbox').nth(2).fill('dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();

  await page.getByRole('textbox', { name: 'Email address' }).fill('dx@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('dinerx');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('dx@jwt.com');
});

test('update user as franchisee', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('franchisee');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pf' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('textbox').first().fill('pizza franchiseex');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza franchiseex');
  await expect(page.getByRole('main')).toContainText('Franchisee on 1');
});

test('update user as admin', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: '常' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('textbox').first().fill('admin user');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('admin user');
  await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
});

test('list users', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();

  const usersTable = page.getByRole('table', { name: 'Users' });
  await expect(usersTable.getByRole('row', { name: 'pizza diner' })).toContainText('d@jwt.com');
  await expect(usersTable.getByRole('row', { name: 'pizza franchisee' })).toContainText('diner, franchisee');
});

test('list users in pages', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();

  const usersTable = page.getByRole('table', { name: 'Users' });
  await expect(usersTable).toContainText('pizza diner');
  await expect(usersTable).not.toContainText('diner 16');
  await expect(page.getByRole('button', { name: 'Prev' })).toBeDisabled();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(usersTable).toContainText('diner 16');
  await expect(usersTable).not.toContainText('pizza diner');
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();

  await page.getByRole('button', { name: 'Prev' }).click();
  await expect(usersTable).toContainText('pizza diner');
});

test('filter users by name', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();

  const usersTable = page.getByRole('table', { name: 'Users' });
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(usersTable).toContainText('diner 16');

  await page.getByRole('textbox', { name: 'Filter users' }).fill('franchisee');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(usersTable).toContainText('pizza franchisee');
  await expect(usersTable).not.toContainText('pizza diner');

  await page.getByRole('textbox', { name: 'Filter users' }).fill('diner');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(usersTable).toContainText('diner 15');
  await expect(usersTable).not.toContainText('pizza franchisee');

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(usersTable).toContainText('diner 16');
  await expect(usersTable).not.toContainText('diner 15');
});

test('delete user', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();

  const usersTable = page.getByRole('table', { name: 'Users' });
  await expect(usersTable).not.toContainText('diner 13');
  await usersTable.getByRole('row', { name: 'pizza tester' }).getByRole('button', { name: 'Delete' }).click();

  await expect(usersTable).not.toContainText('pizza tester');
  await expect(usersTable).toContainText('diner 13');
});
