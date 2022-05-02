// import { ObjKeys } from 'shared/src/common/types'

import { IOTime } from './misc'

export interface IdObject { _id: string }
export type ObjKeys<T> = Extract<keyof T, string | number>

export type ObjWithId<T> = T & IdObject
export type ObjWithPossibleId<T> = T & Partial<IdObject>
export type ObjWithPossiblePersistable<T> = T & Partial<PersistableObject>

export interface MetaObj {
    meta: Meta
}
export interface VersionMetaObj extends MetaObj { version: number }
export interface PersistableObject extends IdObject, VersionMetaObj { }

export type MetaKeyType = "meta.modified" | "meta.created"
export type UnderScoreIdType = "_id"
export interface Meta {
    created: Date
    modified: Date
}

export enum SortOrder {
    ASCENDING = 1,
    DESCENDING = -1
}

export type InsertSpec<T> = {
    objs: ObjWithPossibleId<T>[]
    checkFieldsPresence?: (keyof T)[]
}

export type DbOneObjType<T> = IdObject & T & Partial<VersionMetaObj>

//Cannot restrict the fields because to query embedded documents, it needs to use dot notation. No other way.
//Having keyof T helps with auto complete
export type FilterSpec<T> = { [K in keyof T | MetaKeyType | UnderScoreIdType]?: any } & { [x: string]: any }
export type ProjectionSpec<T> = { [K in keyof T | UnderScoreIdType]?: number } & { [x: string]: any }
export type SortSpec<T> = { [K in keyof T | MetaKeyType | UnderScoreIdType]?: SortOrder } & { [x: string]: SortOrder }

export interface CountSpec<T> {
    filter?: FilterSpec<T>
    limit?: number
}

export interface FetchSpec<T> {
    filter?: FilterSpec<T>
    project?: ProjectionSpec<T>
    skip?: number
    limit?: number
    sort?: SortSpec<T>
    //If this is set, the sent reponse will have Content-Type as text/csv; charset=utf-8
    //The response will contain the csvHeader and then the values quoted
    csvHeader?: string
}

export interface UpdateSpec<T extends PersistableObject> {
    filter: FilterSpec<T>
    update: object
    options?: DbUpdateOptions
}

export interface UpsertSpec<T> extends InsertSpec<T> {
    //for objs without id, values of fields from uniqueFieldSet is used to figure out the obj to update.
    // Combination of values of these fields should be unique
    uniqueFieldSet?: (ObjKeys<T>)[]
}

export interface ReplaceSpec<T, U extends T & PersistableObject = T & PersistableObject> {
    filter: FilterSpec<U>
    replacement: ObjWithPossiblePersistable<T>
}

export interface DeleteSpec<T extends PersistableObject> {
    filter?: FilterSpec<T>
    all?: boolean
}


export const makeUpdateSpec = <T extends PersistableObject>(id: string, version: number, newFields: Partial<T>): UpdateSpec<T> => {
    return {
        filter: { id, version } as FilterSpec<T>,
        update: { $set: newFields }
    }
}

//Result Objs
export interface InsertResult extends IOTime { insertedIds: string[] }
export interface UpsertResult extends IOTime {
    insertedCount: number
    updatedCount: number
    ids: string[]
}

export interface UpdateResult<T extends PersistableObject> extends IOTime {
    matchedCount: number
    modifiedCount: number
    //Updated obj is returned if matched and modified 1 object
    objs?: T[]
}

export interface ReplaceResult<T> extends IOTime { obj: T }

export interface UpdateOneObjResult<T> extends IOTime { obj: T }

export interface DeleteResult extends IOTime { deletedCount: number }
//export interface UpsertResult<T extends PersistableObject> extends UpdateResult<T> { }
//Depending on the projection, T may not be PersistableObject
export interface FetchResult<T> extends IOTime { objs: T[] }
export interface CountResult extends IOTime { count: number }
//If there is no obj with the id, obj is undefined
export interface GetResult<T extends PersistableObject> extends IOTime { obj: T | undefined }

// export const mergeFetchResult = <T>(fRes1: FetchResult<T>, fRes2: FetchResult<T>): FetchResult<T> => {
//     const addValues = (val1?: number, val2?: number): number | undefined =>
//         (val1 != null && val2 != null) ? val1 + val2 : undefined

//     let dbTime = addValues(fRes1.dbTime, fRes2.dbTime)
//     let netTime = addValues(fRes1.netTime, fRes2.netTime)
//     let diskTime = addValues(fRes1.diskTime, fRes2.diskTime)
//     return {
//         objs: [...fRes1.objs, ...fRes2.objs],
//         dbTime,
//         netTime,
//         diskTime
//     }
// }

interface DbMultiOption { multi?: boolean }
//export interface DbUpsertOptions { }
export interface DbUpdateOptions extends DbMultiOption { }
export interface DbDeleteOptions extends DbMultiOption { }

export interface PersistableActionsModel<T, U extends T & PersistableObject = T & PersistableObject> {
    // get(obj: string | IdObject): Promise<GetResult<U>>

    //Inserts the object or the array of object and returns the generated ids in the same order
    insert(obj: InsertSpec<T>): Promise<InsertResult>

    //Used to find some object in the database. Returns the array of objects
    fetch(spec?: FetchSpec<U>): Promise<FetchResult<U>>

    //Used to count documents in the database. Returns the count
    count(spec?: CountSpec<U>): Promise<CountResult>

    //They will use this api
    //This is a lower level api
    update(spec: UpdateSpec<U>): Promise<UpdateResult<U>>

    //Uses update to update the provided obj and sets the values set in this obj except the version and meta fields.
    updateOneObj(obj: DbOneObjType<T>): Promise<UpdateOneObjResult<U>>

    //Updates the object if found else inserts it. Returns the array of ids of objects in the order the objects were provided.
    //Queries the database by the fields if 'id' is not present on the obj. 
    //If 0 objects are found, creates one. 
    //If 1 object is found, it replaces the whole object with obj.
    //If more than 1 object is found, it errors. 
    upsert(spec: UpsertSpec<T>): Promise<UpsertResult>

    //Takes a query and a replacement object. Replaces the object selected by query. Increments the version and updates meta field.    
    // replaceOne(spec: ReplaceSpec<T, U>): Promise<ReplaceResult<U>>

    //Uses replaceOne to replace the obj provided except the version and meta field of the obj. Filters by the id present in the obj.
    // replaceOneObj(obj: DbOneObjType<T>): Promise<ReplaceResult<U>>

    delete(filter: object): Promise<DeleteResult>
}

export const removePersistable = <T>(objs: (T & { id: any, version: any, meta: any })[], preserveId: boolean = false): T[] => {
    const a = objs.map(obj => {
        if (!preserveId)
            delete obj.id
        delete obj.meta
        delete obj.version
        return obj
    })
    return a
}