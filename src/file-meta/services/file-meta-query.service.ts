import { Types } from 'mongoose';
import { queryService } from '../../common/services/query.service';

class FileMetaQueryService {
    usedCapacityAggregateQuery(storageOwner: string) {
        return [
            {
                $match: {
                    storageOwner
                }
            },
            {
                $group: {
                    _id: '$storageOwner',
                    usedCapacity: {
                        $sum: '$size'
                    }
                }
            }
        ]
    }
}

export const fileMetaQueryService = new FileMetaQueryService();
