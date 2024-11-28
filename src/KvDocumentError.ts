export class KvDocumentError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }

    isNotFound(): boolean {
        return this.status === 404;
    }
}
