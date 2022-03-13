import { Bucket, File, Storage } from '@google-cloud/storage';
import { configService } from './config.service';
import { v4 as uuidv4 } from 'uuid';
import { FileMeta, IFileMeta } from '../../file-meta/models/file-meta.model';
import { fileMetaQueryService } from '../../file-meta/services/file-meta-query.service';
import { StorageMeta } from '../../storage-meta/models/storage-meta.model';
import { BadRequestError, NotFoundError } from '../types/errors';
import { FileStreamData } from '../types/interfaces';

class StorageService {
    private storage;
    private storageBucket?: Bucket;

    constructor() {
        this.storage = new Storage();
    }

    getUniqueFilePrefix(): string {
        return uuidv4();
    }

    getFileReference(uniqueFilename: string): File {
        this.storageBucket = this.storageBucket || this.storage.bucket(configService.gcp_storage_bucket_name);
        return this.storageBucket.file(uniqueFilename);
    }

    async uploadFile(uploaderUserId: string, storageOwner: string, file: Express.Multer.File): Promise<IFileMeta> {

        const [capacityData] = await FileMeta
            .aggregate(fileMetaQueryService.usedCapacityAggregateQuery(storageOwner));

        const usedCapacity = capacityData ? capacityData.usedCapacity : 0;

        const storageMeta = await StorageMeta.findOne({userId: storageOwner});

        const totalCapacity = storageMeta ? storageMeta.capacity : + configService.storage_default_capacity;

        if (usedCapacity + file.size > totalCapacity) {
            throw new BadRequestError('Not enough storage');
        }

        const filePrefix = this.getUniqueFilePrefix();

        const uniqueFilename = `${filePrefix}/${file.originalname}`;

        const fileReference = this.getFileReference(uniqueFilename);

        await fileReference.save(file.buffer);

        const [fileData] = await fileReference.get();

        let createdFileMeta;

        if (fileData && fileData.metadata) {
            const fileMeta = {
                filename: file.originalname,
                size: fileData.metadata.size,
                prefix: filePrefix,
                uploadedBy: uploaderUserId,
                storageOwner: storageOwner,
                available: true
            };

            createdFileMeta = await FileMeta.create(fileMeta);

            return createdFileMeta;
        } else {
            throw new NotFoundError('File not found');
        }
    }

    async deleteFile(fileId: string): Promise<void> {
        const fileMeta = await FileMeta.findById(fileId);

        if (!fileMeta) {
            throw new NotFoundError('file not found');
        }

        const uniqueFilename = `${fileMeta.prefix}/${fileMeta.filename}`;
        const fileReference = this.getFileReference(uniqueFilename);
        await fileReference.delete();
        await fileMeta.deleteOne();
    }

    async getFileStreamData(fileId: string): Promise<FileStreamData> {
        const fileMeta = await FileMeta.findById(fileId);

        if (!fileMeta) {
            throw new NotFoundError('file not found');
        }

        const uniqueFilename = `${fileMeta.prefix}/${fileMeta.filename}`;

        const fileReference = this.getFileReference(uniqueFilename);

        return {
            fileMeta,
            readStream: fileReference.createReadStream()
        };
    }
}

export const storageService = new StorageService();
