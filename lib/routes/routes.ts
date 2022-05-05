import { Application, Request, Response } from 'express';
import { Crud } from './common/crud';
import * as student from '../schema/student/schema';
import * as resource from '../schema/resource.schema'
const studentRouter = require('./studentRouter');
const resourceRouter = require('./resourceRouter');


export class Routes {

    public crud = new Crud()

    public route(app: Application) {
        app.use('/api/student',studentRouter)
        app.use('/api/resource', resourceRouter)
        
        app.post('/api/user/:route', (req: Request, res: Response)=> {
            console.log(req)
            this.crud.crudRoutes(req, res, student)
        })
        app.post('/api/resource/:route', (req: Request, res: Response)=> {
            console.log(req)
            this.crud.crudRoutes(req, res, resource)
        })
    }
}



