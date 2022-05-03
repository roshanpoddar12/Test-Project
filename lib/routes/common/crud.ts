import { Persistable } from "../../db/persistable/persistable"
import { Application, Request, Response } from 'express';
import * as mongoose from 'mongoose'

export class Crud {
    
    constructor(){
        
    }
    crudRoutes = async (req: Request, res: Response,schema) => {
        let route = req.params.route
        if(route == 'fetch'){
            console.log(req.body)
            if(Object.keys(req.body.filter).includes('_id'))
                req.body.filter['_id'] = new mongoose.Types.ObjectId(req.body.filter['_id'])
            let persistable = await new Persistable(schema).fetch(req.body)
            res.send(persistable)
        }
        if(route == 'upsert'){
            let persistable = await new Persistable(schema).upsert(req.body)
            res.send(persistable)
        }
    } 
}