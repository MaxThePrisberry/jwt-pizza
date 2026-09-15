# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component | Backend endpoints | Database SQL |
| --------------------------------------------------- | ------------------ | ----------------- | ------------ |
| View home page                                      | src/views/home.tsx |     N/A just goes to the order page    |  N/A does not interact with the database  |
| Register new user<br/>(t@jwt.com, pw: test)         | src/views/register.tsx     |    /api/auth POST   |   DB.addUser  ` INSERT INTO user (name, email, password) VALUES (?, ?, ?); INSERT INTO userRole (userId, role, objectId) VALUES (?, ?, ?)` |
| Login new user<br/>(t@jwt.com, pw: test)            |  src/views/login.tsx  |  /api/auth PUT  | DB.getUser `SELECT * FROM user WHERE email=?; SELECT * FROM userRole WHERE userId=?` |
| Order pizza                                         |  src/views/menu.tsx  |  /api/order/menu AND api/franchise?{stuff to paginate}  |  DB.getFranchises, DB.getMenu `SELECT id, name FROM franchise WHERE name LIKE ? LIMIT` AND `SELECT * FROM menu` |
| Verify pizza                                        |  src/views/delivery.tsx  |  Actual URL + /api/order/verify  | N/A not in frontend or backend, in factory |
| View profile page                                   |  src/views/dinerDashboard.tsx  |  /api/order  GET  | DB.getOrders `SELECT id, franchiseId, storeId, date FROM dinerOrder WHERE dinerId=? LIMIT ${offset},${config.db.listPerPage}` |
| View franchise<br/>(as diner)                       |  src/views/franchiseDashboard.tsx |  /api/franchise/{user.id}| DB.getUserFranchises `SELECT objectId FROM userRole WHERE role='franchisee' AND userId=?` |
| Logout                                              |  src/views/logout.tsx | /api/auth DELETE | DB.logoutUser `DELETE FROM auth WHERE token=?` |
| View About page                                     |  src/views/about.tsx  | N/A | N/A |
| View History page                                   |  src/views/history.tsx  | N/A | N/A |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) |  src/views/login.tsx  |  SAME AS LOGIN BUT FRANCHISE PATH | SAME AS LOGIN BUT FRANCHISE PATH |
| View franchise<br/>(as franchisee)                  |  src/views/franchiseDashboard.tsx |  /api/franchise/{user.id}| DB.getUserFranchises `SELECT id, name FROM franchise WHERE id in (${franchiseIds.join(',')})`  |
| Create a store                                      |  src/views/createStore.tsx  | /api/franchise/{franchise}/store POST | DB.createStore `INSERT INTO store (franchiseId, name) VALUES (?, ?)` |
| Close a store                                       |  src/views/closeStore.tsx  |  /api/franchise/{franchise}/store/{store} DELETE | DB.deleteStore `DELETE FROM store WHERE franchiseId=? AND id=?` |
| Login as admin<br/>(a@jwt.com, pw: admin)           |  src/views/login.tsx |  SAME AS LOGIN  |  SAME AS LOGIN  |
| View Admin page                                     |  src/views/adminDashboard.tsx  |  Close franchise, close store, filter, create franchise  | DB functions as seen above |
| Create a franchise for t@jwt.com                    |  src/views/createFranchise.tsx |  /api/franchise POST  | DB.createFranchise `INSERT INTO franchise (name) VALUES (?)` |
| Close the franchise for t@jwt.com                   |  src/views/closeFranchise.tsx  |  /api/franchise/{franchise} DELETE  |  DB.deleteFranchise `DELETE FROM store, userRole, franchise WHERE franchiseId=?` |
