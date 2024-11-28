import { TestUser } from './TestUser.ts';

// Create and save a TestUser:

const user = new TestUser();
user.firstName = 'John';
await user.save();
console.log({ user });

// You can also set properties directly in the constructor

const user2 = new TestUser({ firstName: 'Doe' });
await user2.save();
console.log({ user2 });

// Find all TestUsers:

const allUsers = await TestUser.findAll();
console.log({ allUsers: allUsers.result });

// Find a TestUser by firstName:

const byFirstName = await TestUser.findByField('firstName', 'John');
console.log({ byFirstName });

// Update a TestUser:

user.age = 84;
await user.save();
console.log({ updatedUser: user });
