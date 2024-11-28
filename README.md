# deno-kv-document

A wrapper around Deno KV

### Create a model by extending KvDocument:

```
// TestUser.ts

import { KvDocument } from '@nilsd/deno-kv-document';

export class TestUser extends KvDocument {
    static override getKeyPath(): string[] {
        return ['test-users'];
    }

    static override getIndexedFields(): string[] {
        return ['firstName'];
    }

    override setDefaults(): void {
        this.age = 42;
    }

    get firstName(): string {
        return this.doc.firstName ?? '';
    }
    set firstName(v: string) {
        this.doc.firstName = v;
    }
    get age(): number {
        return this.doc.age ?? 0;
    }
    set age(v: number) {
        this.doc.age = v;
    }
}
```

##### Example usage:

```
// index.ts

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
```
