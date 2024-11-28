import { monotonicUlid } from '@std/ulid';
import { KvDatabase, type KvDatabaseManyResult } from './KvDatabase.ts';
import { KvDocumentError } from './KvDocumentError.ts';

/** Main document class. Extend this to create your models. */
export class KvDocument {
    private _doc: any;

    /** Returns an instance of the Deno KV database wrapper */
    static getDbInstance(): KvDatabase {
        return new KvDatabase();
    }

    /** When extending KvDocument specify the key path where documents of this type should be stored */
    static getKeyPath(): string[] {
        throw new Error('Must override');
    }

    /** Specify fields that you want to index on, returning the id of a document when accessed */
    static getIndexedFields(): string[] {
        return [];
    }

    protected get doc(): any {
        return this._doc || {};
    }
    protected set doc(v: any) {
        this._doc = v;
    }
    private set _id(v: string | null | undefined) {
        this.doc._id = v;
    }
    private get _id(): string | null | undefined {
        return this.doc._id;
    }
    private get _versionStamp() {
        return this.doc._versionStamp;
    }
    private set _versionStamp(v: string) {
        this.doc._versionStamp = v;
    }
    get createdAt(): string | null | undefined {
        return this.doc.createdAt;
    }
    set createdAt(v: string | null | undefined) {
        this.doc.createdAt = v;
    }
    get updatedAt(): string | null | undefined {
        return this.doc.updatedAt;
    }
    set updatedAt(v: string | null | undefined) {
        this.doc.updatedAt = v;
    }

    set id(v: string | null) {
        this._id = v;
    }

    get id(): string | null {
        if (!this._id) {
            return null;
        }

        return this._id;
    }

    constructor(doc: any = {}, id: string | null = null) {
        this.doc = doc;
        this.doc.type = this.constructor.name;
        if (id) {
            this.id = id;
        }
        this.setDefaults();
    }

    getVersionStamp(): string | null | undefined {
        return this.doc._versionStamp;
    }

    isNewDocument(): boolean {
        return !this.doc._versionStamp;
    }

    /** Override in sub class to set default values on construct */
    setDefaults() {}

    getValues(): object {
        return JSON.parse(JSON.stringify(this.doc));
    }

    async refresh(): Promise<void> {
        if (!this.id) {
            return;
        }

        const obj = await (this.constructor as typeof KvDocument).findById(this.id);
        if (!obj) {
            return;
        }

        this.handleRefresh(obj, obj._versionStamp);
    }

    handleRefresh(doc: any = undefined, versionStamp: string | null | undefined): void {
        if (!doc || Object.keys(doc).length === 0) {
            return;
        }

        if (versionStamp && versionStamp !== this._versionStamp) {
            this.doc = doc;
        }
    }

    /**
     * @param id Specify an ID to bypass automatic ID generation. Note that automatic IDs are sortable.
     * @param expireIn Deletes the document automatically after specified number of milliseconds
     */
    async save(id?: string | null, expireIn?: number): Promise<void> {
        if (id) {
            this._id = `${id}`;
        }
        if (!this.id) {
            this.id = monotonicUlid();
        }

        if (!this.createdAt) {
            this.createdAt = new Date().toISOString();
        } else {
            this.updatedAt = new Date().toISOString();
        }

        const result = await (this.constructor as typeof KvDocument)
            .getDbInstance().put(
                this.getValues(),
                (this.constructor as typeof KvDocument).getKeyPath(),
                this.id,
                (this.constructor as typeof KvDocument).getIndexedFields(),
                expireIn,
            ) as any;

        this.handleRefresh(result, result._versionStamp);
    }

    delete(): Promise<void> {
        return (this.constructor as typeof KvDocument).getDbInstance().delete(
            this._doc,
            (this.constructor as typeof KvDocument).getKeyPath(),
            (this.constructor as typeof KvDocument).getIndexedFields(),
        );
    }

    static findById<T extends typeof KvDocument>(
        this: T,
        id: string,
    ): Promise<InstanceType<T> | null> {
        return this.findByKeyPath([...this.getKeyPath(), 'by_id', id]);
    }

    static tryFindById<T extends typeof KvDocument>(
        this: T,
        id: string,
    ): Promise<InstanceType<T> | null> {
        return this.tryFindByKeyPath([...this.getKeyPath(), 'by_id', id]);
    }

    static async findByKeyPath<T extends typeof KvDocument>(
        this: T,
        keyPath: string[],
    ): Promise<InstanceType<T> | null> {
        const doc = await this.getDbInstance().get(keyPath);
        if (!doc) {
            throw new KvDocumentError('Not found', 404);
        }

        const instance = new (this.prototype.constructor as typeof KvDocument)(
            doc,
        );

        return (instance as unknown) as InstanceType<T>;
    }

    static async tryFindByKeyPath<T extends typeof KvDocument>(
        this: T,
        keyPath: string[],
    ): Promise<InstanceType<T> | null> {
        try {
            const result = await this.findByKeyPath(keyPath);

            return result;
        } catch (error) {
            if (error instanceof KvDocumentError && error.isNotFound()) {
                return Promise.resolve(null);
            }

            throw error;
        }
    }

    static async findByField<T extends typeof KvDocument>(
        this: T,
        field: string,
        val: any,
    ): Promise<InstanceType<T> | null> {
        const id = await this.getDbInstance().getIdFromSecondaryIndex([
            ...this.getKeyPath(),
            'by_field',
            field,
            val,
        ]);

        if (!id) {
            throw new KvDocumentError('Not found', 404);
        }

        return this.tryFindById(id);
    }

    static async tryFindByField<T extends typeof KvDocument>(
        this: T,
        field: string,
        val: any,
    ): Promise<InstanceType<T> | null> {
        try {
            const result = await this.findByField(field, val);

            return result;
        } catch (error) {
            if (error instanceof KvDocumentError && error.isNotFound()) {
                return Promise.resolve(null);
            }

            throw error;
        }
    }

    static async findAll<T extends typeof KvDocument>(
        this: T,
        descending: boolean = false,
        limit?: number,
        cursor?: string,
    ): Promise<{ result: InstanceType<T>[]; cursor?: string }> {
        const { docs, cursor: resultCursor } = await this.getDbInstance().findAll(
            [...this.getKeyPath(), 'by_id'],
            descending,
            limit,
            cursor,
        ) as KvDatabaseManyResult;

        return {
            result: docs.map((doc: any) => new (this.prototype.constructor as typeof KvDocument)(doc))
                .map((instance) => (instance as unknown) as InstanceType<T>),
            cursor: resultCursor,
        };
    }

    static async findByIdRange<T extends typeof KvDocument>(
        this: T,
        descending: boolean = false,
        fromId: string,
        toId: string,
        limit?: number,
        cursor?: string,
    ): Promise<{ result: InstanceType<T>[]; cursor?: string }> {
        const { docs, cursor: resultCursor } = await this.getDbInstance().findRange(
            [...this.getKeyPath(), 'by_id', fromId],
            [...this.getKeyPath(), 'by_id', toId],
            descending,
            limit,
            cursor,
        ) as KvDatabaseManyResult;

        return {
            result: docs.map((doc: any) => new (this.prototype.constructor as typeof KvDocument)(doc))
                .map((instance) => (instance as unknown) as InstanceType<T>),
            cursor: resultCursor,
        };
    }

    static async findOrCreateById<T extends typeof KvDocument>(
        this: T,
        id: string,
    ): Promise<InstanceType<T>> {
        const existing = await this.tryFindById(id);
        if (existing) {
            return existing;
        }

        const instance = new (this.prototype.constructor as typeof KvDocument)({}, id);

        return (instance as unknown) as InstanceType<T>;
    }

    static async tryFindFirst<T extends typeof KvDocument>(
        this: T,
    ): Promise<InstanceType<T> | null> {
        const response = await this.findAll(false, 1);

        return response.result[0] ?? null;
    }

    static async tryFindLast<T extends typeof KvDocument>(
        this: T,
    ): Promise<InstanceType<T> | null> {
        const response = await this.findAll(true, 1);

        return response.result[0] ?? null;
    }
}
