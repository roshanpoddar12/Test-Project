import * as BPromise from 'bluebird'
import { IndexMap } from 'db/utils'
import { groupBy, isEqual, pick, zipObject } from 'lodash'
import { IdObject, PersistableObject, ObjWithPossibleId, FilterSpec, ObjKeys, ProjectionSpec, ObjWithId } from 'db/persistable/db'
import { Persistable, singleOpConcurrency } from './persistable'

export interface SegregatedObjs<T> {
    onDb: IndexMap<T & IdObject>[]
    notOnDb: IndexMap<T>[]
}

export const segregateByIds = async <T, U extends T & PersistableObject>(iObjMap: IndexMap<ObjWithPossibleId<T>>[], db: Persistable<T, U>): Promise<SegregatedObjs<T>> => {
    const objsWithIds = iObjMap.filter(m => m.obj._id)
    if (objsWithIds.length == 0) {
        return { onDb: [], notOnDb: iObjMap }
    }
    const objsWithoutIds = iObjMap.filter(m => !m.obj._id)
    const segObjs = await segBySingleField(objsWithIds, db, "_id")
    segObjs.notOnDb = segObjs.notOnDb.concat(objsWithoutIds)
    return segObjs
}

const checkValidVal = (val: any, field: string | number) => {
    //boolean, and 0 number is allowed so !val should not be used
    if (val == null || val == ""  || typeof val == 'symbol') {
        throw new Error(`Value ${JSON.stringify(val)} of field ${field.toString()} has type ${typeof val} and cannot be used for upsert. Only non empty primitives are currently allowed`+ "INVALID_DATA")
    }
}

const validateFilterSpec = <T>(filterSpec: FilterSpec<T>): FilterSpec<T> => {
    filterSpec = Object.assign({}, filterSpec)
    const filterKeys = Object.keys(filterSpec)

    //For each is 50% slower. Using for loop to help with speed.
    for (let k = 0; k < filterKeys.length; k++) {
        const field = filterKeys[k]
        let val = filterSpec[field]
        //If there is only value and is supposed to be unique, we can create the right query.
        if (Array.isArray(val)) {
            //To throw the error if the array is empty
            checkValidVal(val[0], field)
            for (let i = 1; i < val.length; i++) {
                checkValidVal(val[i], field)
            }
            filterSpec = { ...filterSpec, field: { $in: val } }
            val = val[0]
        } else {
            checkValidVal(val, field)
        }
    }
    return filterSpec
}

const segBySingleField = async <T, U extends T & PersistableObject = T & PersistableObject>(
    iObjMap: IndexMap<ObjWithPossibleId<T>>[],
    db: Persistable<T, U>,
    uniqueField: ObjKeys<ObjWithPossibleId<T>>) => {

    if (iObjMap.length == 0) {
        return { onDb: [], notOnDb: [] }
    }
    const values = iObjMap.map<unknown>(m => {
        const val = m.obj[uniqueField]
        checkValidVal(val, uniqueField)
        return val
    })
    const filter = { [uniqueField]: { $in: values } } as FilterSpec<U>
    const project = { _id: 1, [uniqueField]: 1 } as ProjectionSpec<U>
    const fetchResult = await db.fetch({ filter, project, limit: -1 })

    type ValueType = typeof values[0]
    const valIdMap = new Map<ValueType, string>()
    const fetchedValues: ValueType[] = []
    fetchResult.objs.forEach(obj => {
        const val = obj[uniqueField] as ValueType
        if (val != null && (val as any) != "") {
            valIdMap.set(val, obj._id as string)
            fetchedValues.push(val)
        }
    })

    const groupedObjs = groupBy(iObjMap, iObj => !!iObj.obj[uniqueField] && fetchedValues.indexOf(iObj.obj[uniqueField]) != -1)
    const onDb = groupedObjs.true || []
    const dbObjsWithId = onDb.map(({ i, obj }) => {
        const id = valIdMap.get(obj[uniqueField])
        return { i, obj: Object.assign({}, obj, { id }) }
    })
    //We keep adding the objs that are on db
    return {
        onDb: dbObjsWithId,
        notOnDb: groupedObjs.false || []
    } as SegregatedObjs<T>
}

//The output onDb has the ids populated
export const segByMultiFields = async <T, U extends T & PersistableObject>(iObjMap: IndexMap<ObjWithPossibleId<T>>[], db: Persistable<T, U>, uniqueFields: (keyof ObjWithPossibleId<T>)[]): Promise<SegregatedObjs<T>> => {
    if (uniqueFields.length < 2) {
        throw new Error(`Found only ${uniqueFields.length} unique fields. Need 2 or more.`+ "INVALID_STATE")
    }
    const ids: string[] = []

    const filterSpecs: IndexMap<FilterSpec<U>>[] = iObjMap.map((iObj, i) => ({ i, obj: pick(iObj.obj, uniqueFields) as FilterSpec<U> }))
    const projection = Object.assign({ id: 1 }, zipObject(uniqueFields, Array(uniqueFields.length).fill(1))) as ProjectionSpec<U>

    //Doing it in a batches. Doing one by one is too time and resource consuming.
    //Doing all makes the worst case scenario of matching the returned obj with iObjMap really bad (it is n^2)
    //For instance for 500 objs,
    //  500 batch => (500 iObjMap * 500 res objs) * 1 db call = 250000 matching
    //  50 batch => (50 iObjMap * 50 res objs) * 10 db calls = 25000 matching
    //  20 batch => (20 iObjMap * 20 res objs) * 25 db calls = 10000 matching
    //  10 batch => (10 iObjMap * 10 res objs) * 50 db calls = 5000 matching
    //  1 batch => no matching req, 500 Db calls

    const batchSize = 20
    const filterSpec2DArr: (typeof filterSpecs)[] = []
    for (var start = 0; start < filterSpecs.length; start += batchSize) {
        filterSpec2DArr.push(filterSpecs.slice(start, start + batchSize))
    }

    const fetchOp = async (filterSpecs: IndexMap<FilterSpec<U>>[]) => {
        const fetchRes = await db.fetch({
            filter: { $or: filterSpecs.map(spec => spec.obj) } as any,
            project: projection,
            limit: -1
        })

        fetchRes.objs.forEach(fetchObj => {
            for (var fi = 0; fi < filterSpecs.length; fi++) {
                const { i, obj } = filterSpecs[fi]
                if (isEqual(obj, pick(fetchObj, uniqueFields))) {
                    ids[i] = fetchObj._id as string
                    break
                }
            }
        })
    }

    await BPromise.map(filterSpec2DArr, fetchOp, { concurrency: singleOpConcurrency })

    const onDb: IndexMap<ObjWithId<T>>[] = []
    const notOnDb: IndexMap<T>[] = []
    //Put id in the object and segregate. Using for because for each is 50% slower and the data can be huge.
    for (let index = 0; index < iObjMap.length; index++) {
        const iObj = iObjMap[index]
        if (ids[index]) {
            let newObj = Object.assign({}, iObj.obj, { _id: ids[index] })
            onDb.push({ i: iObj.i, obj: newObj })
        } else {
            notOnDb.push(iObj)
        }
    }
    return { onDb, notOnDb }
}

const segregateObjsForOneUniqueFieldSet = async <T, U extends T & PersistableObject>(segregatedObjs: SegregatedObjs<T>,
    db: Persistable<T, U>, uniqueFieldSet: (ObjKeys<ObjWithPossibleId<T>>)[]): Promise<SegregatedObjs<T>> => {

    if (segregatedObjs.notOnDb.length == 0) return segregatedObjs

    const segByField = await (uniqueFieldSet.length == 1 ?
        segBySingleField(segregatedObjs.notOnDb, db, uniqueFieldSet[0]) :
        segByMultiFields(segregatedObjs.notOnDb, db, uniqueFieldSet))

    return {
        onDb: segregatedObjs.onDb.concat(segByField.onDb),
        notOnDb: segByField.notOnDb
    }
}

const segregateObjsForExceptNullUniqueFieldSet = async <T, U extends T & PersistableObject>(segregatedObjs: SegregatedObjs<T>,
    db: Persistable<T, U>, exceptNullUniqueField: ObjKeys<T>): Promise<SegregatedObjs<T>> => {

    //filter the non empty fields
    const couldBeOnDb = segregatedObjs.notOnDb.filter(o => o.obj[exceptNullUniqueField] != null)
    const cannotBeVerified = segregatedObjs.notOnDb.filter(o => o.obj[exceptNullUniqueField] == null)

    const segByField = await segBySingleField(couldBeOnDb, db, exceptNullUniqueField)

    return {
        onDb: segregatedObjs.onDb.concat(segByField.onDb),
        notOnDb: cannotBeVerified.concat(segByField.notOnDb)
    }
}


export const segregateObjs = async <T, U extends T & PersistableObject>(
    indexObjMap: IndexMap<ObjWithPossibleId<T>>[],
    db: Persistable<T, U>,
    uniqueFieldSets?: (ObjKeys<T>)[][],
    exceptNullUniqueFieldSet?: (ObjKeys<T>)[]): Promise<SegregatedObjs<T>> => {
    console.log(uniqueFieldSets)
    let segregatedObjs = await segregateByIds(indexObjMap, db)
    console.log(segregatedObjs)
    if (uniqueFieldSets) {
        for (let ufIndex = 0; (ufIndex < uniqueFieldSets.length && segregatedObjs.notOnDb.length > 0); ufIndex++) {
            const uniqueFieldSet = uniqueFieldSets[ufIndex]
            segregatedObjs = await segregateObjsForOneUniqueFieldSet(segregatedObjs, db, uniqueFieldSet)
        }
    }
    if (exceptNullUniqueFieldSet) {
        for (let ufIndex = 0; (ufIndex < exceptNullUniqueFieldSet.length && segregatedObjs.notOnDb.length > 0); ufIndex++) {
            const uniqueField = exceptNullUniqueFieldSet[ufIndex]
            segregatedObjs = await segregateObjsForExceptNullUniqueFieldSet(segregatedObjs, db, uniqueField)
        }
    }

    return segregatedObjs
}