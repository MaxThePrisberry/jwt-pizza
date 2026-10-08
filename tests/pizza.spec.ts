import { Page } from '@playwright/test';
import { test, expect } from './testSetup';
import { Role, User } from '../src/service/pizzaService';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    'd@jwt.com': { id: '2', name: 'pizza diner', email: 'd@jwt.com', password: 'diner', roles: [{ role: Role.Diner }] },
    'f@jwt.com': { id: '3', name: 'pizza franchisee', email: 'f@jwt.com', password: 'franchisee', roles: [{ role: Role.Diner }, { role: Role.Franchisee, objectId: '1' }] },
  };
  const pizzaPocket = {
    id: 1,
    name: 'pizzaPocket',
    admins: [{ id: 3, name: 'pizza franchisee', email: 'f@jwt.com' }],
    stores: [
      { id: 1, name: 'SLC', totalRevenue: 0.032 },
      { id: 2, name: 'Provo', totalRevenue: 0 },
    ],
  };

  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'DELETE') {
      expect(route.request().headers()['authorization']).toBe('Bearer abcdef');
      loggedInUser = undefined;
      await route.fulfill({ json: { message: 'logout successful' } });
      return;
    }
    if (route.request().method() === 'POST') {
      const registerReq = route.request().postDataJSON();
      loggedInUser = { id: '6', name: registerReq.name, email: registerReq.email, roles: [{ role: Role.Diner }] };
      await route.fulfill({ json: { user: loggedInUser, token: 'abcdef' } });
      return;
    }
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 404, json: { message: 'unknown user' } });
      return;
    }
    loggedInUser = validUsers[loginReq.email];
    const loginRes = {
      user: loggedInUser,
      token: 'abcdef',
    };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [{ id: 1, name: 'pizzaPocket', stores: [{ id: 1, name: 'SLC' }] }],
      more: false,
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    const userId = route.request().url().split('/').pop();
    await route.fulfill({ json: userId === '3' ? [pizzaPocket] : [] });
  });

  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'GET') {
      const orderHistoryRes = {
        dinerId: 2,
        orders: [
          {
            id: 23,
            franchiseId: 1,
            storeId: 1,
            date: '2026-10-08T06:09:25.000Z',
            items: [
              { id: 1, menuId: 1, description: 'Veggie', price: 0.0038 },
              { id: 2, menuId: 2, description: 'Pepperoni', price: 0.0042 },
            ],
          },
        ],
        page: 1,
      };
      await route.fulfill({ json: orderHistoryRes });
      return;
    }
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: 23 },
      jwt: 'eyJpYXQ',
    };
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ json: orderRes });
  });

  await page.goto('/');
}

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
