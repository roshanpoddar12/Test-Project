import { ResourceDocument } from 'interfaces/resource/resource.model';
import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const schema = new Schema<ResourceDocument>({
    _id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: false,
        unique: true
    },
    posterImgSrc: {
        type: String,
        required: false
    },
    subTitle: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    },
    estimatedTime: {
        type: Number,
        required: false
    },     //in minutes
    contentIds: {
        type: [String],
        required: false,
        default: void 0
    },
    topics: {
        type: [String],
        required: true
    },
    subTopics: {
        type: [String],
        required: true
    },
    meta: {
        created: {
            type: Date,
            index: true
        },
        modified: Date
    },
    version: Number
},{versionKey:false
});


const resource = mongoose.model('resource', schema);
module.exports = resource;