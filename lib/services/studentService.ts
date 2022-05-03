
import { Persistable } from '../db/persistable/persistable';
import * as student from '../schema/student/schema';
import * as mongoose from 'mongoose'
import { PersonalInfoPersistable, StudentInfoModel } from 'interfaces/personal-info/personal-info-model';

export default class UserService {
    
    public async createStudent(body: PersonalInfoPersistable) {
        let persistable
        try{
         persistable = await new Persistable(student).insert(body)
        }catch(err){
            console.log(err)
        }
        return persistable
    }

    public async filterStudent(query: any) {
        console.log(query)
        let persistable = await new Persistable(student).fetch(
           query
        )
        console.log(persistable)
        return(persistable)
        // Students.find(query, callback);
    }

//     public async updateStudent() {
//         // const query = { _id: user_params._id };
//         let persistable = await new Persistable(users).update({
//             filter:{
//                 phone_number: '8585'
//             },
//             update:{
//                 phone_number: '225'
//             }
//         })
//         console.log(persistable)
//         return persistable
//     }
    
//     public deleteUser(_id: String, callback: any) {
//         const query = { _id: _id };
//         users.deleteOne(query, callback);
//     }

}