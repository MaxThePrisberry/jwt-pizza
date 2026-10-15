import { Page } from '@playwright/test';
import { expect } from './testSetup';
import { Franchise, Role, User } from '../src/service/pizzaService';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    'a@jwt.com': { id: '1', name: '常用名字', email: 'a@jwt.com', password: 'admin', roles: [{ role: Role.Admin }] },
    'd@jwt.com': { id: '2', name: 'pizza diner', email: 'd@jwt.com', password: 'diner', roles: [{ role: Role.Diner }] },
    'f@jwt.com': { id: '3', name: 'pizza franchisee', email: 'f@jwt.com', password: 'franchisee', roles: [{ role: Role.Diner }, { role: Role.Franchisee, objectId: '1' }] },
    't@jwt.com': { id: '4', name: 'pizza tester', email: 't@jwt.com', password: 'test', roles: [{ role: Role.Diner }] },
  };
  for (let id = 7; id <= 16; id++) {
    validUsers[`diner${id}@jwt.com`] = { id: String(id), name: `diner ${id}`, email: `diner${id}@jwt.com`, password: 'diner', roles: [{ role: Role.Diner }] };
  }
  const franchises: Franchise[] = [
    {
      id: '1',
      name: 'pizzaPocket',
      admins: [{ id: '3', name: 'pizza franchisee', email: 'f@jwt.com' }],
      stores: [
        { id: '1', name: 'SLC', totalRevenue: 0.032 },
        { id: '2', name: 'Provo', totalRevenue: 0 },
      ],
    },
    {
      id: '2',
      name: 'LotaPizza',
      admins: [{ id: '5', name: 'pizza owner', email: 'o@jwt.com' }],
      stores: [
        { id: '3', name: 'Lehi', totalRevenue: 0 },
        { id: '4', name: 'Springville', totalRevenue: 0 },
        { id: '5', name: 'American Fork', totalRevenue: 0 },
      ],
    },
    { id: '3', name: 'PizzaCorp', admins: [{ id: '5', name: 'pizza owner', email: 'o@jwt.com' }], stores: [{ id: '6', name: 'Spanish Fork', totalRevenue: 0 }] },
    { id: '4', name: 'topSpot', admins: [{ id: '5', name: 'pizza owner', email: 'o@jwt.com' }], stores: [] },
  ];
  let nextFranchiseId = 5;
  let nextStoreId = 7;

  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'DELETE') {
      expect(route.request().headers()['authorization']).toBe('Bearer abcdef');
      loggedInUser = undefined;
      await route.fulfill({ json: { message: 'logout successful' } });
      return;
    }
    if (route.request().method() === 'POST') {
      const registerReq = route.request().postDataJSON();
      loggedInUser = { id: '6', name: registerReq.name, email: registerReq.email, password: registerReq.password, roles: [{ role: Role.Diner }] };
      validUsers[registerReq.email] = loggedInUser;
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

  await page.route(/\/api\/user(\?.*)?$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers()['authorization']).toBe('Bearer abcdef');
    const params = new URL(route.request().url()).searchParams;
    const pageNumber = Number(params.get('page') ?? 0);
    const limit = Number(params.get('limit') ?? 10);
    const namePattern = new RegExp('^' + (params.get('name') ?? '*').replace(/\*/g, '.*') + '$', 'i');
    const matches = Object.values(validUsers)
      .filter((user) => namePattern.test(user.name!))
      .sort((a, b) => Number(a.id) - Number(b.id));
    const users = matches.slice(pageNumber * limit, (pageNumber + 1) * limit).map((user) => ({ ...user, password: undefined }));
    await route.fulfill({ json: { users, more: matches.length > (pageNumber + 1) * limit } });
  });

  await page.route(/\/api\/user\/\d+$/, async (route) => {
    expect(route.request().method()).toBe('PUT');
    expect(route.request().headers()['authorization']).toBe('Bearer abcdef');
    const userId = route.request().url().split('/').pop();
    const user = Object.values(validUsers).find((user) => user.id === userId)!;
    const updateReq = route.request().postDataJSON();
    delete validUsers[user.email!];
    user.name = updateReq.name || user.name;
    user.email = updateReq.email || user.email;
    user.password = updateReq.password || user.password;
    validUsers[user.email!] = user;
    loggedInUser = user;
    await route.fulfill({ json: { user: { ...user, password: undefined }, token: 'abcdef' } });
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
    if (route.request().method() === 'POST') {
      const franchiseReq = route.request().postDataJSON();
      const unknownAdmin = franchiseReq.admins.find((admin: User) => !validUsers[admin.email!]);
      if (unknownAdmin) {
        await route.fulfill({ status: 404, json: { message: `unknown user for franchise admin ${unknownAdmin.email} provided` } });
        return;
      }
      const admins = franchiseReq.admins.map((admin: User) => ({ email: admin.email!, id: validUsers[admin.email!].id, name: validUsers[admin.email!].name }));
      const franchise = { id: String(nextFranchiseId++), name: franchiseReq.name, admins, stores: [] };
      franchises.push(franchise);
      await route.fulfill({ json: { name: franchise.name, admins, id: franchise.id } });
      return;
    }
    expect(route.request().method()).toBe('GET');
    const params = new URL(route.request().url()).searchParams;
    const pageNumber = Number(params.get('page') ?? 0);
    const limit = Number(params.get('limit') ?? 10);
    const namePattern = new RegExp('^' + (params.get('name') ?? '*').replace(/\*/g, '.*') + '$', 'i');
    const matches = franchises.filter((franchise) => namePattern.test(franchise.name));
    const pageOfFranchises = matches.slice(pageNumber * limit, (pageNumber + 1) * limit);
    const isAdmin = loggedInUser?.roles?.some((role) => role.role === Role.Admin);
    const franchiseList = isAdmin ? pageOfFranchises : pageOfFranchises.map((franchise) => ({ id: franchise.id, name: franchise.name, stores: franchise.stores.map((store) => ({ id: store.id, name: store.name })) }));
    await route.fulfill({ json: { franchises: franchiseList, more: matches.length > (pageNumber + 1) * limit } });
  });

  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      const franchiseId = route.request().url().split('/').pop();
      franchises.splice(
        franchises.findIndex((franchise) => franchise.id === franchiseId),
        1
      );
      await route.fulfill({ json: { message: 'franchise deleted' } });
      return;
    }
    expect(route.request().method()).toBe('GET');
    const userId = route.request().url().split('/').pop();
    await route.fulfill({ json: franchises.filter((franchise) => franchise.admins?.some((admin) => admin.id === userId)) });
  });

  await page.route(/\/api\/franchise\/\d+\/store$/, async (route) => {
    expect(route.request().method()).toBe('POST');
    const [, franchiseId] = route.request().url().match(/\/api\/franchise\/(\d+)\/store$/)!;
    const franchise = franchises.find((franchise) => franchise.id === franchiseId);
    if (!franchise) {
      await route.fulfill({ status: 404, json: { message: 'unknown franchise' } });
      return;
    }
    const store = { id: String(nextStoreId++), name: route.request().postDataJSON().name, totalRevenue: 0 };
    franchise.stores.push(store);
    await route.fulfill({ json: { id: store.id, franchiseId: franchise.id, name: store.name } });
  });

  await page.route(/\/api\/franchise\/\d+\/store\/\d+$/, async (route) => {
    expect(route.request().method()).toBe('DELETE');
    const [, franchiseId, storeId] = route.request().url().match(/\/api\/franchise\/(\d+)\/store\/(\d+)$/)!;
    const franchise = franchises.find((franchise) => franchise.id === franchiseId);
    if (!franchise) {
      await route.fulfill({ status: 404, json: { message: 'unknown franchise' } });
      return;
    }
    franchise.stores = franchise.stores.filter((store) => store.id !== storeId);
    await route.fulfill({ json: { message: 'store deleted' } });
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

export { basicInit };
