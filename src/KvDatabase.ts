export interface KvDatabaseManyResult {
    docs: Array<object>;
    cursor?: string;
}

export class KvDatabase {
    async put(
        doc: any,
        keyPath: string[],
        id: string,
        indexedFields: string[],
        expireIn?: number,
    ): Promise<object | null> {
        const kv = await Deno.openKv();

        await kv.set([...keyPath, 'by_id', id], doc, { expireIn });

        for await (const field of indexedFields) {
            await kv.set([...keyPath, 'by_field', field, doc[field]], id, { expireIn });
        }

        kv.close();

        return this.get([...keyPath, 'by_id', id]);
    }

    async get(keyPath: string[]): Promise<object | null> {
        const kv = await Deno.openKv();
        const result = await kv.get(keyPath);
        kv.close();

        if (!result?.value) {
            return null;
        }

        return {
            ...result.value,
            _versionStamp: result.versionstamp,
        };
    }

    async getIdFromSecondaryIndex(keyPath: string[]): Promise<string | null> {
        const kv = await Deno.openKv();
        const result = await kv.get(keyPath);
        kv.close();

        if (!result?.value) {
            return null;
        }

        return result.value as string;
    }

    async findAll(
        keyPath: string[],
        descending: boolean = false,
        limit?: number,
        cursor: string | undefined = undefined,
    ): Promise<KvDatabaseManyResult | null> {
        const kv = await Deno.openKv();
        const entries = kv.list({ prefix: keyPath }, { reverse: descending, limit, cursor });
        const result = [];

        for await (const entry of entries) {
            if (entry.value) {
                result.push(
                    {
                        ...entry.value,
                        _versionStamp: entry.versionstamp,
                    },
                );
            }
        }

        kv.close();

        return {
            docs: result,
            cursor: entries.cursor,
        };
    }

    async findRange(
        keyPathStart: string[],
        keyPathEnd: string[],
        descending: boolean = false,
        limit?: number,
        cursor: string | undefined = undefined,
    ): Promise<KvDatabaseManyResult | null> {
        const kv = await Deno.openKv();
        const entries = kv.list({ start: keyPathStart, end: keyPathEnd }, { limit, reverse: descending, cursor });
        kv.close();

        const result = [];

        for await (const entry of entries) {
            if (entry.value) {
                result.push(
                    {
                        ...entry.value,
                        _versionStamp: entry.versionstamp,
                    },
                );
            }
        }

        return {
            docs: result,
            cursor: entries.cursor,
        };
    }

    async delete(doc: any, keyPath: string[], indexedFields: string[]): Promise<void> {
        const kv = await Deno.openKv();
        await kv.delete([...keyPath, 'by_id', doc._id]);

        for await (const field of indexedFields) {
            await kv.delete([...keyPath, 'by_field', field, doc[field]]);
        }

        kv.close();
    }
}
