import { Bucket, Storage } from '@google-cloud/storage';
import { configService } from './config.service';
import { v4 as uuidv4 } from 'uuid';

class StorageService {
    private storage;
    private storageBucket?: Bucket;

    constructor() {
        this.storage = new Storage();
    }

    getUniqueFilename(originalFilename: string, prefix = uuidv4()) {
        return `${prefix}/${originalFilename}`;
    }

    getFileReference(uniqueFilename: string) {
        this.storageBucket = this.storageBucket || this.storage.bucket(configService.gcp_storage_bucket_name);
        return this.storageBucket.file(uniqueFilename);
    }
}

export const storageService = new StorageService();
