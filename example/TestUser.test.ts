import { assertEquals, assertExists, assertFalse, assertGreater, assertNotEquals } from 'jsr:@std/assert';
import { TestUser } from './TestUser.ts';

let userId: string = '';
let userVersionStamp: string = '';

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test('[prepare tests]', async () => {
    const kv = await Deno.openKv();
    const res = kv.list({ prefix: TestUser.getKeyPath() });
    for await (const entry of res) {
        await kv.delete(entry.key);
    }

    kv.close();
});

Deno.test('create and set properties - creates test user', async () => {
    const newUser = new TestUser();
    newUser.firstName = 'Test';

    assertEquals(newUser.isNewDocument(), true);
    await newUser.save();
    assertEquals(newUser.isNewDocument(), false);
    assertExists(newUser.id);
    assertGreater(newUser.id.length, 5);
    userId = newUser.id;
    userVersionStamp = newUser.getVersionStamp() ?? '';
});

Deno.test('create by passing properties - creates test user', async () => {
    const newUser = new TestUser({ firstName: 'TestConstructor' });
    await newUser.save();
    assertEquals(newUser.firstName, 'TestConstructor');
    await newUser.delete();
});

Deno.test('tryFindById - returns test user', async () => {
    const user = await TestUser.tryFindById(userId!);
    assertEquals(user?.id, userId);
    assertEquals(user?.getVersionStamp(), userVersionStamp);
});

Deno.test('findOrCreateById - returns existing user', async () => {
    const user = await TestUser.findOrCreateById(userId!);
    assertEquals(user?.id, userId);
    assertEquals(user?.getVersionStamp(), userVersionStamp);
});

Deno.test('findOrCreateById - no result and creates a user', async () => {
    const user = await TestUser.findOrCreateById('other_id');
    assertEquals(user?.id, 'other_id');
    assertEquals(user?.firstName, '');
    assertNotEquals(user?.getVersionStamp(), userVersionStamp);
});

Deno.test('save user with expiry and verify deleted', async () => {
    const user = new TestUser();
    user.firstName = 'ExpiryUser';
    await user.save(null, 500);

    const existingUser = await TestUser.tryFindById(user.id!);
    assertExists(existingUser);

    await wait(600);

    const missingUser = await TestUser.tryFindById(user.id!);
    assertEquals(missingUser, null);
});

Deno.test('setDefaults - has been executed', async () => {
    const user = await TestUser.tryFindById(userId!);
    assertEquals(user?.age, 42);
});

Deno.test('tryFindByField - returns test user by first name', async () => {
    const user = await TestUser.tryFindByField('firstName', 'Test');
    assertEquals(user?.firstName, 'Test');
});

Deno.test('findAll - returns all users (1)', async () => {
    const users = (await TestUser.findAll()).result;
    assertEquals(users.length, 1);
    assertEquals(users[0].firstName, 'Test');
});

Deno.test('[create second user]', async () => {
    const secondUser = new TestUser();
    secondUser.firstName = 'SecondTest';
    await secondUser.save();
});

Deno.test('findAll - scroll test users with cursor', async () => {
    const { result: firstResult, cursor: firstCursor } = await TestUser.findAll(false, 1);
    assertEquals(firstResult.length, 1);
    assertEquals(firstResult[0].firstName, 'Test');

    const { result: secondResult } = await TestUser.findAll(false, 1, firstCursor);
    assertEquals(secondResult.length, 1);
    assertEquals(secondResult[0].firstName, 'SecondTest');
});

Deno.test('tryFindFirst - returns test user', async () => {
    const user = await TestUser.tryFindFirst();
    assertEquals(user?.firstName, 'Test');
});

Deno.test('tryFindLast - returns second test user', async () => {
    const user = await TestUser.tryFindLast();
    assertEquals(user?.firstName, 'SecondTest');
});

Deno.test('[delete all test users and assert empty]', async () => {
    const users = (await TestUser.findAll()).result;

    for await (const user of users) {
        await user.delete();
    }

    const afterDelete = (await TestUser.findAll()).result;
    assertEquals(afterDelete.length, 0);

    const kv = await Deno.openKv();
    const res = kv.list({ prefix: TestUser.getKeyPath() });
    for await (const entry of res) {
        assertFalse(entry, 'Not all database entries were deleted');
    }

    kv.close();
});

Deno.test('tryFindById - no result', async () => {
    const user = await TestUser.tryFindById(userId!);
    assertEquals(user, null);
});

Deno.test('tryFindByField - no result', async () => {
    const user = await TestUser.tryFindByField('firstName', 'Test');
    assertEquals(user, null);
});

Deno.test('findAll - no result', async () => {
    const users = await TestUser.findAll();
    assertEquals(0, users.result.length);
});

Deno.test('tryFindFirst - no result', async () => {
    const user = await TestUser.tryFindFirst();
    assertEquals(user, null);
});

Deno.test('tryFindLast - no result', async () => {
    const user = await TestUser.tryFindLast();
    assertEquals(user, null);
});
