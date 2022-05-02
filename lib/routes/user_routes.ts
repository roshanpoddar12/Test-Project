import { Application, Request, Response } from 'express';
import { Crud } from './common/crud';
import { UserController } from '../controllers/userController';
import * as student from '../schema/student/schema';

export class TestRoutes {

    private user_controller: UserController = new UserController();
    public crud = new Crud()

    public route(app: Application) {
        
        app.post('/api/user', (req: Request, res: Response) => {
            this.user_controller.create_user(req, res);
        });

        app.get('/api/user', (req: Request, res: Response) => {
            this.user_controller.get_user(req, res);
        });

        // app.put('/api/user', (req: Request, res: Response) => {
        //     this.user_controller.update_user(req, res);
        // });

        // app.delete('/api/user/:id', (req: Request, res: Response) => {
        //     this.user_controller.delete_user(req, res);
        // });
        app.get('/api/user/:route', (req: Request, res: Response)=> {
            this.crud.crudRoutes(req, res, student)
        })
    }
}