import { Request, Response } from 'express';
// import { insufficientParameters, mongoError, successResponse, failureResponse } from '../modules/common/service';
import UserService from '../services/studentService';
import e = require('express');
import { Persistable } from 'db/persistable/persistable';
import * as student from '../schema/student/schema';

export class StudentController {

    private studentService: UserService = new UserService();

    public async createStudent(req: Request, res: Response) {
        // this check whether all the filds were send through the erquest or not
        try{
            const userObj = await this.studentService.createStudent(req.body);
            res.send(userObj)

        }catch(e){
            res.send(e)

        }
        
    }

    public async  getStudent(req: Request, res: Response) {
            const user_filter = req.body;
           const userObj = await this.studentService.filterStudent(user_filter);

           res.send(userObj)
    }

    // public async update_user(req: Request, res: Response) {
        
    //         const updateUser = await this.user_service.updateUser()
    //     res.send({updateUser})
    // }

   
}