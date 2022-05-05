import { Persistable } from './../db/persistable/persistable';
import { Request, Response } from 'express';
import * as resource from '../schema/resource.schema'
import { ResourceModel } from 'interfaces/resource/resource.model';

export const syncResources = async(req: Request, res: Response) => {
    const { id } = req.body;
   const resourceObj = (await  new Persistable<ResourceModel>(resource).fetch({
        filter:{id},
        limit: 6
   })).objs
   resourceObj[0].contentIds = resourceObj[0].contentIds.slice(0,6)
   res.send(resourceObj)
}