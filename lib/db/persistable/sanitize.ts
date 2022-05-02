import * as MDb from 'mongodb'
// import { GeniusError } from 'shared/src/common/error'
// import { isValidIsoDate } from 'shared/src/common/validation'
// import { FetchSpec, FilterSpec, PersistableObject, ProjectionSpec, SortSpec, VersionMetaObj } from 'shared/src/models/db'

export interface MDbIdObject {
    _id: string
}

export class DbSanitize {
    //We want to remove _id from the objs returned from mongodb to send objs with only id
    //Readonly doesn't seem to work well with intersection types

    //We store the same _id and id to the mongodb.
    //It helps in querying. Any object can be queried using _id as well as id
    _idToId(obj: any) {
        //https://github.com/Microsoft/TypeScript/issues/10727
        //Can't do it with rest operator right now as it is not supported on generics.
        let newObj: typeof obj
        //In scenarios like projection set to {id: 0}, we will not get id or _id
        if (obj._id || obj.id) {
            newObj = Object.assign({}, obj, { id: obj._id || obj.id })
        } else {
            newObj = Object.assign({}, obj)
        }
        delete newObj._id
        return newObj
    }
    idTo_Id(obj: any) {
        let id = obj.id
        if (!id) {
            id = new MDb.ObjectID().toHexString()
        }
        const newObj = Object.assign({}, obj, { _id: id })
        delete newObj.id
        return newObj
    }

    prepareObjForInsert = (obj: any) => {
        const newObj = this._idToId(obj)
        const currentDate = new Date()
        //If the meta is already present, use that and insert as it is. Don't modify.
        //Should be used to move data across clusters, sync offline data from phones with phone time stamps, etc.
        return Object.assign({}, newObj, {
            version: 1,
            meta: {
                created: (newObj.meta && newObj.meta.created) ? new Date(newObj.meta.created) : currentDate,
                modified: (newObj.meta && newObj.meta.modified) ? new Date(newObj.meta.modified) : currentDate
            }
        })
    }

    validateFetchSpec = (spec?: any): void => {
        if (spec != null) {
            if (typeof spec != 'object') {
                throw new Error("FetchSpec " + JSON.stringify(spec) + " is not an object")
            }
            let specKeys = Object.keys(spec)
            let specFields = ["filter", "project", "skip", "limit", "sort"]
            if (specKeys.some(key => specFields.indexOf(key) == -1)) {
                throw new Error("Unsupported key in spec object " + JSON.stringify(spec))
            }
        }
    }

    //Any -ve number means no limit
    updateLimit = (limit?: number): number | undefined => {
        if (limit != null) {
            return limit >= 0 ? limit : undefined
        } else {
            //If no limit specified, specify a max limit
            return 100
        }
    }

    prepareObjForUpdate(updateObj: object): object {
        let newObj: any = { ...updateObj }
        var currentDateOp = "$currentDate"
        if (newObj[currentDateOp]) {
            newObj[currentDateOp]["meta.modified"] = true
        } else {
            newObj[currentDateOp] = { "meta.modified": true }
        }

        newObj["$inc"] = { _v: 1 }

        if (newObj.$set && newObj.$set.id != null) {
            newObj.$set._id = newObj.$set.id
            delete newObj.$set.id
        }
        return newObj
    }
    updateSort(sortSpec?: any) {
        if (!sortSpec) return
        if (sortSpec.id) {
            sortSpec._id = sortSpec.id
            delete sortSpec.id
        }
        return sortSpec
    }
    updateFilter(filter?: any) {
        if (!filter) return {}
        const newFilter = Object.assign({}, filter)
        if (newFilter["meta.modified"]) {
            newFilter["meta.modified"] = this.transformDateString(newFilter["meta.modified"])
        }
        if (newFilter["meta.created"]) {
            newFilter["meta.created"] = this.transformDateString(newFilter["meta.created"])
        }
        //To ensure all filters run on _id because _id is always indexed.
        if (newFilter.id) {
            newFilter._id = newFilter.id
            delete newFilter.id
        }
        return newFilter
    }
    updateProjection(project?: any) {
        if (!project || Object.keys(project).length == 0) {
            return {}
        }
        const newProject = Object.assign({}, project)
        if (newProject.id != undefined) {
            newProject._id = newProject.id
        }
        delete newProject.id
        //If version is explicitly set to false or 0, delete meta else put the version in
        // if (newProject.version == 0 || (<any>newProject).version == false) {
        //     delete newProject.version
        // } else {
        //     newProject.version = 1
        // }
        return newProject
    }
    transformDateString(obj: any): any {
        return Object.keys(obj)
            .map(k => {
                let val = obj[k]
                //ensuring that it is a date time string
                return { [k]: this.isValidIsoDate(val) ? new Date(val) : val }
            })
            .reduce((x, y) => ({ ...x, ...y }), {})
    }

    validateUpdateFilter(filter, obj: Object) {
        const textChangeOps = ["$set", "$unset", "$currentDate"]
        let updateOps = Object.keys(obj)
        if (updateOps.some(op => textChangeOps.indexOf(op) != -1)) {
            // If this is the case,  filter needs to have the version field, else throw an error
            // if (!filter.version) {
            //     throw new GeniusError(`Filter ${JSON.stringify(filter)} needs 'version' field for update ${JSON.stringify(obj)}`, "INVALID_PARAMS")
            // }
        }
        return this.updateFilter(filter)
    }

    isValidIsoDate = (date?: any): boolean => {
        const dateRegex = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/

        return !!(date && typeof date == 'string' && dateRegex.test(date))
    }

}