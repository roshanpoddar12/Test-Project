import * as mongoose from 'mongoose';
import {NameTitlesEnum, NameTitlesEnumList, NameTitlesType} from './../../interfaces/personal-info/name'
import { GenderEnum, StudentInfoModel, LeaderboardData, PersonalInfoPersistable, GenderEnumList } from './../../interfaces/personal-info/personal-info-model';

const Schema = mongoose.Schema;
export const referCodeRegEx = /^[A-Z][A-Z0-9]{5}$/

const referCodeValidator = { $type: 'string', $regex: referCodeRegEx }
const schema = new Schema({
    _id: String,
    title: {
        type: String,
        required: false,
        enum: {
            values: NameTitlesEnumList,
            message: '{VALUES} is not supported'
        }
    }, 
    firstName:{
        type: String,
        required: true
    },
    middleNames: {
        type: String,
        required: false
    },
    lastName:{
        type: String,
        required: false
    },
    gender: {
        type: String,
        required: false,
        enum: {
            values: GenderEnumList,
            message: '{VALUE} is not supported'
        }
    },
    profilePic: {
        type: String,
        required: false
    },
    dob: {
        type: String,
        required: false
    },
    referCode: {
        type: String,
        required: false,
        unique: true,
        validate: [referCodeValidator.$regex, 'Did not matched the validator']
    },
    parentIds: {
        type: [String],
        required: false,
        default: void 0
    }, //TODO
    phone: {
        type: String,
        required: false
    },  //To be taken as parent phone number.
    whatsappPhone: {
        type: String,
        required: false
    },
    teacherIds: {
        type: [String],
        required: false,
        default: void 0
    },
    username: {
        type: String,
        required: false
    },
    //In case school information is missing. Board is determined from here.
    // board: BoardType
    email: {
        type: String,
        required: false
    },
    badges: {
        type: [String],
        required: false,
        default: void 0

    },
    googleId: {
        type: String,
        required: false
    },
    facebookId: {
        type: String,
        required: false
    },
    interests: {
        type: [String],
        required: false,
        default: void 0
    },
    starsSpent: {
        type: Number,
        required: false
    },
    gainedStars: {
        type: Number,
        required: false
    },
    balanceStars: {
        type: Number,
        required: false
    },
    meta: {
        created: {
            type: Date,
            index: true
        },
        modified: Date
    },
    version: Number
},{versionKey:false,
    virtuals: true,
    transform: function (doc, ret) {   delete ret._id  }
});

schema.set('toJSON', {
    
  });
schema.index( { referCode: 1})

const student = mongoose.model('students', schema);
module.exports = student;

