import { Request, Response } from 'express';
// import { insufficientParameters, mongoError, successResponse, failureResponse } from '../modules/common/service';
import UserService from '../services/service';
import e = require('express');
import { Persistable } from 'db/persistable/persistable';
import * as student from '../schema/student/schema';

export class UserController {

    private user_service: UserService = new UserService();

    public async create_user(req: Request, res: Response) {
        // this check whether all the filds were send through the erquest or not
        try{
            const userObj = await this.user_service.createUser(req.body);
            res.send(userObj)

        }catch(e){
            res.send(e)

        }
        
    }

    public async  get_user(req: Request, res: Response) {
            const user_filter = req.body;
           const userObj = await this.user_service.filterUser(user_filter);

           res.send(userObj)
    }

    // public async update_user(req: Request, res: Response) {
        
    //         const updateUser = await this.user_service.updateUser()
    //     res.send({updateUser})
    // }

   
}