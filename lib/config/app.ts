import * as express from "express";
import * as bodyParser from "body-parser";
import * as mongoose from 'mongoose';
import { Routes } from "../routes/routes";
import { CommonRoutes } from "../routes/common_routes";

class App {

   public app: express.Application;
   public mongoUrl: string = 'mongodb://localhost/db_test_project_local';

   private routes: Routes = new Routes();
   private common_routes: CommonRoutes = new CommonRoutes();

   constructor() {
      this.app = express();
      this.config();
      this.mongoSetup();
      this.routes.route(this.app);
      this.common_routes.route(this.app);
   }

   private config(): void {
      // support application/json type post data
      this.app.use(express.json());
      //support application/x-www-form-urlencoded post data
      this.app.use(express.urlencoded({ extended: false }));
      
   }

   private mongoSetup(): void {
      mongoose.set('toJSON', {
         virtuals: true,
         transform: (doc, converted) => {
           delete converted._id;
         }
       });
      mongoose.connect(this.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
   }

}
export default new App().app;