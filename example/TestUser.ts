import { KvDocument } from '../src/KvDocument.ts';

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
