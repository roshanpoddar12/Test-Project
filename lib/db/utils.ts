import { PersistableObject, FilterSpec, ProjectionSpec } from "db/persistable/db"
import { Persistable, txt } from "./persistable/persistable"




export interface IndexMap<T> {
    i: number
    obj: T
}

export const idVersionMap = async <T, U extends T & PersistableObject>(ids: string[], db: Persistable<T, U>): Promise<Map<string, number>> => {
    const fetchRes = await db.fetch({
        filter: { id: { $in: ids } } as FilterSpec<U>,
        project: { id: 1, version: 1 } as ProjectionSpec<U>,
        limit: -1
    })
    const idMap = new Map<string, number>()
    for (let i = 0; i < fetchRes.objs.length; i++) {
        const { _id, version } = fetchRes.objs[i]
        idMap.set(_id as string, version as number)
    }
    return idMap
}

export const getVersion = async <T, U extends T & PersistableObject>(id: string, db: Persistable<T, U>) => {
    const filterSpec = { id } as FilterSpec<U>
    const fetchRes = await db.fetch({
        filter: filterSpec,
        project: { id: 1, version: 1 } as ProjectionSpec<U>
    })
    if (fetchRes.objs.length != 1) {
        throw new Error(`Found ${fetchRes.objs.length} objs for spec ${JSON.stringify(filterSpec)} on collection ${db.collectionName}. Expected 1.`+ "NO_MATCH")
    }
    const version = fetchRes.objs[0].version
    if (!version) {
        throw new Error(`No version found on object with spec ${JSON.stringify(filterSpec)} on collection ${db.collectionName}`+ "INVALID_STATE")
    }
    return version
}

export const retryWithVersion = async <T, R, U extends T & PersistableObject = T & PersistableObject>(
    id: string,
    initVersion: number,
    execFunc: (filter: FilterSpec<U>) => Promise<R>,
    successFunc: (result: R) => boolean,
    db: Persistable<T, U>): Promise<R> => {

    let tryCount = 0
    const maxTries = 3
    let version = initVersion
    let errMsg: string
    let filterSpec: FilterSpec<U>
    do {
        ++tryCount
        filterSpec = { id, version } as FilterSpec<U>
        const result = await execFunc(filterSpec)
        if (successFunc(result)) {
            return result
        }
        errMsg = `Spec ${txt(filterSpec)} did not match any documents. collection=${db.collectionName} try=${tryCount}`
        console.warn({ message: errMsg, status: "NO_MATCH" })
        //In case something updated the version. Try again with the new version
        version = await getVersion(id, db)
    } while (tryCount < maxTries)

    throw new Error(errMsg+ "NO_MATCH")
}