import * as mongoose from 'mongoose';
import {NameTitlesEnum, NameTitlesEnumList, NameTitlesType} from './../../interfaces/personal-info/name'
import { GenderEnumList, StudentDocument } from './../../interfaces/personal-info/personal-info-model';


const Schema = mongoose.Schema;
export const referCodeRegEx = /^[A-Z][A-Z0-9]{5}$/

const referCodeValidator = { $type: 'string', $regex: referCodeRegEx }
const schema = new Schema<StudentDocument>({
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
        type: [String],
        required: false
    },
    lastName:{
        type: String,
        required: false
    },
    gender: {
        type: String,
        required: false,
        default: void 0,
        enum: {
            values: GenderEnumList,
            message: '{VALUE} is not supported'
        },
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
        required: false,
        index: {
            unique: true,
            partialFilterExpression: {phone: {$type: "string"}}
          }
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
        required: false,
        index: {
            unique: true,
            partialFilterExpression: {username: {$type: "string"}}
          }
    },
    //In case school information is missing. Board is determined from here.
    // board: BoardType
    email: {
        type: String,
        required: false,
        index: {
            unique: true,
            partialFilterExpression: {email: {$type: "string"}}
          }
    },
    badges: {
        type: [String],
        required: false,
        default: void 0

    },
    googleId: {
        type: String,
        required: false,
        index: {
            unique: true,
            partialFilterExpression: {googleId: {$type: "string"}}
          }
    },
    facebookId: {
        type: String,
        required: false,
        index: {
            unique: true,
            partialFilterExpression: {googleId: {$type: "string"}}
          }
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
},{versionKey:false
});

//   const options: AssignerPluginOptions    = {
//     modelName: 'students',
//     fields: {  // if no _id field config, assigner auto adds _id field with type = "ObjectId"
//       _id: 'UUID',
//     }
//   };
//   schema.plugin(MongooseIdAssigner.plugin, options);
schema.index( { referCode: 1})

const student = mongoose.model('students', schema);
// const doc = students.create(
//         {
//             "firstName": "newton_2607",
//             "gender": "m",
//             "phone": "asade",
//             "referCode": "NEN6PK",
//             "email": null,
//             "username": null
//         }
// );
// console.log(doc._id)
module.exports = student;

