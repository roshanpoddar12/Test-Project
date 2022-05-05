import { DbSanitize } from "./sanitize";
import { Cursor } from 'mongoose';
import { TimeMeasure } from "./time-measure";
import { shortenTxt, toNonEmptyArr } from "../../common/transform";
import { CountSpec, DbOneObjType, DeleteResult, DeleteSpec, FetchResult, FetchSpec, FilterSpec, GetResult, IdObject, ObjWithPossibleId, PersistableActionsModel, PersistableObject, ProjectionSpec, ReplaceResult, ReplaceSpec, UpdateOneObjResult, UpsertResult, UpsertSpec } from "db/persistable/db";
import { getVersion, IndexMap, retryWithVersion } from "../utils";
import { segregateObjs } from "./upsert-utils";
import * as BPromise from "bluebird";
import { validateFieldsPresence } from "./validation";
import * as _ from 'underscore'

export const txt = (obj: any, shorten: boolean = false) => {
  const str = JSON.stringify(obj);
  return shorten ? shortenTxt(str) : str;
};
export const upsertBatchSize = 500;
export const singleOpConcurrency = 20;
export const defaultValidator = {
  version: { $type: "int" },
  "meta.created": { $type: "date" },
  "meta.modified": { $type: "date" },
};
export class Persistable<
  T,
  U extends T & PersistableObject = T & PersistableObject
  > implements PersistableActionsModel<T, U>{
  private readonly sanitize: DbSanitize;
  readonly collectionName: any;

  indexSpec: any;

  constructor(
    collectionName: any,

  ) {
    this.sanitize = new DbSanitize();
    this.collectionName = collectionName;
  }
  // get(obj: string | IdObject): Promise<GetResult<U>> {
  //   throw new Error("Method not implemented.");
  // }
  // updateOneObj(obj: DbOneObjType<T>): Promise<UpdateOneObjResult<U>> {
  //   throw new Error("Method not implemented.");
  // }
  // upsert(spec: UpsertSpec<T>): Promise<UpsertResult> {
  //   throw new Error("Method not implemented.");
  // }
  // replaceOne(spec: ReplaceSpec<T, U>): Promise<ReplaceResult<U>> {
  //   throw new Error("Method not implemented.");
  // }
  // replaceOneObj(obj: DbOneObjType<T>): Promise<ReplaceResult<U>> {
  //   throw new Error("Method not implemented.");
  // }
  // delete(filter: object): Promise<DeleteResult> {
  //   throw new Error("Method not implemented.");
  // }
  async fetch(spec: FetchSpec<U> = {}): Promise<FetchResult<U>> {
    const timer = new TimeMeasure(true);
    const newSpec: any = {
      ...spec,
      sort: this.sanitize.updateSort(spec.sort),
      filter: this.sanitize.updateFilter(spec.filter),
      project: this.sanitize.updateProjection(spec.project),
      limit: this.sanitize.updateLimit(spec.limit),
    };
    this.sanitize.validateFetchSpec(newSpec);
    const message = `fetch spec=${newSpec} coll=${this.collectionName
      }`;

    const { limit, sort, skip, project, filter } = newSpec;
    let cursor: Cursor;
    let filterList = []
    // if (limit != null) cursor = cursor.limit(limit);
    filterList.push({ $match: filter })
    if (sort != null && Object.keys(sort).length > 0)
      filterList.push({ $sort: sort })
    if (skip != null)
      filterList.push({ $skip: skip })

    if (project && Object.keys(project).length > 0)
      filterList.push({ $project: project })
    try {
      cursor = await this.collectionName
        .aggregate(filterList)

    } catch (e) {
      throw new Error(e);
    }
    const objs = await cursor;

    return { objs, dbTime: timer.end() };
  }

  async update(updateSpec) {
    const timer = new TimeMeasure(true);
    if (!this.isObjectLiteral(updateSpec)) {
      throw new Error(
        `invalid spec ${(updateSpec)} for update on '${this.collectionName
        }'`
      );
    }
    let { filter, options } = updateSpec;
    const updateObj = updateSpec.update;
    if (!filter || !updateObj) {
      throw new Error(
        `missing filter or updateObj in ${(updateSpec)} for update on '${this.collectionName
        }'`,
      );
    }
    filter = this.sanitize.validateUpdateFilter(filter, updateObj);
    const newUpdateObj = this.sanitize.prepareObjForUpdate(updateObj);
    const message = `update spec=${{ filter, update: newUpdateObj }
      } coll=${this.collectionName}`;

    let matchedCount: number = 0;
    let modifiedCount: number = 0;
    let updatedObj
    let writeOpResult
    if (options && options.multi) {
      try {
        writeOpResult = await this.collectionName
          .updateMany(filter, newUpdateObj);
      } catch (e) {
        if (e.code === 11000) {
          throw new Error(e);
        }
        throw new Error(e);
      }
      matchedCount = writeOpResult.n;
      modifiedCount = writeOpResult.nModified;
    } else {

      try {
        writeOpResult = await this.collectionName
          .findOneAndUpdate(filter, newUpdateObj, { rawResult: true, new: true });
      } catch (e) {
        if (e.code === 11000) {
          throw new Error(e);
        }
        throw new Error(e);
      }
      if (writeOpResult.lastErrorObject.updatedExisting) {
        matchedCount = 1;
        modifiedCount = 1;
        if (writeOpResult.value) {
          // updatedObj = this.sanitize._idToId(writeOpResult.value);
          updatedObj = writeOpResult.value;

        }
      }
      // console.log({
      //   message: `${message} matchedCount=${matchedCount} modifiedCount=${modifiedCount}`,
      // });
      return {
        matchedCount,
        modifiedCount,
        objs: updatedObj && [updatedObj],
        dbTime: timer.end(),
      };
    }
  }
  async insert(insertSpec) {
    const timer = new TimeMeasure(true);
    if (!this.isObjectLiteral(insertSpec)) {
      throw new Error(
        `Invalid insert spec ${txt(insertSpec)} for insert on '${
          this.collectionName
        }'`
      );
    }
    const { objs, checkFieldsPresence } = insertSpec;
    console.log('objs',objs)
    if (!objs || toNonEmptyArr(objs).length == 0) {
      throw new Error(
        `No objs to insert on '${this.collectionName}'`
      );
    }
    const nonEmptyObjs = toNonEmptyArr(objs).filter((o) => o);
    if (checkFieldsPresence) {
      if (!Array.isArray(checkFieldsPresence))
        throw new Error(
          `Invalid checkFieldsPresence ${(
            checkFieldsPresence
          )} for insert on '${this.collectionName}'`,
        );
      if (checkFieldsPresence.length > 0)
        validateFieldsPresence(nonEmptyObjs, checkFieldsPresence);
    }
    //Doing it later because if id is a field to be validated, it should be done before changing it to _id
    const insertObjs = nonEmptyObjs.map(this.sanitize.prepareObjForInsert);
    // console.log(insertObjs)
    const message = `insert count=${insertObjs.length} spec=${txt(
      insertObjs, true
    )} coll=${this.collectionName}`;
    console.log(message)
    let insertedIds: string[];
    let result
    try {
      result = await this.collectionName.insertMany(insertObjs, { rawResult: true });

    } catch (e) {
      if (e.code === 11000) {
        throw new Error(e);
      }
      throw new Error(e);
    }
    insertedIds = Object.keys(result.insertedIds).map((ind) => result.insertedIds[ind].toString());

    console.log({ message: `${message} a_t=${timer.end()}` });
    return {
      insertedIds,
      dbTime: timer.end(),
    };
  }

  async count(spec: CountSpec<U> = {}) {
    const timer = new TimeMeasure(true);
    if (!this.isObjectLiteral(spec)) {
      throw new Error(
        `Invalid spec ${(spec)} for count on '${this.collectionName}'`
      );
    }
    const newSpec = {
      ...spec,
      filter: this.sanitize.updateFilter(spec.filter),
    };
    const message = `count spec=${(newSpec)} coll=${this.collectionName
      }`;
    const options =
      spec.limit != null ? { limit: spec.limit } : undefined;
    let count: number;
    try {
      count = await this.collectionName
        .countDocuments(newSpec.filter, options);
    } catch (e) {
      throw new Error(e);
    }
    // this.log.verbose({
    //   message: `${message} count=${count} a_t=${timer.end()}`,
    // });
    return { count, dbTime: timer.end() };
  }

  async delete(spec: DeleteSpec<U>): Promise<DeleteResult> {
    const timer = new TimeMeasure(true);
    let { filter, all } = spec;
    if (all) {
      filter = {};
    } else {
      if (!this.isObjectLiteral(filter)) {
        throw new Error(
          `invalid filter ${txt(filter)} for delete on '${this.collectionName
          }'`,

        );
      }
      if (Object.keys(filter).length == 0) {
        throw new Error(
          `empty filter cannot be provided for delete on '${this.collectionName}'`,

        );
      }
    }
    filter = this.sanitize.updateFilter(filter);
    const message = `delete filter=${txt(filter, true)} coll='${this.collectionName
      }'`;
    // await this.backup(filter);
    let result;
    try {
      result = await this.collectionName.deleteMany(filter);
    } catch (e) {
      throw new Error(message+e);
    }
    if (result.deletedCount == null)
      throw new Error(
        `Something went wrong. deletedCount should not be null. Input spec ${txt(
          filter
        )} on '${this.collectionName}'`
      );
    console.log({
      message: `${message} delCount=${result.deletedCount} a_t=${timer.end()}`,
    });
    return {
      deletedCount: result.deletedCount,
      dbTime: timer.end(),
    };
  }

  async deleteAll(): Promise<DeleteResult> {
    return await this.delete({ all: true });
  }
  async replaceOne(replaceSpec: ReplaceSpec<T, U>): Promise<ReplaceResult<U>> {
    const timer = new TimeMeasure(true);
    if (!this.isObjectLiteral(replaceSpec)) {
      throw new Error(
        `Invalid spec ${txt(replaceSpec)} for replaceOne on '${this.collectionName
        }'`,
      );
    }
    const { filter, replacement } = replaceSpec;
    if (!filter || !replacement) {
      throw new Error(
        `missing 'filter' and 'replacement' field in ${txt(
          replaceSpec
        )} for replaceOne on '${this.collectionName}'`,
      );
    }

    const fetchRes = await this.fetch({
      filter: filter as FilterSpec<U>,
      project: { id: 1, version: 1, meta: 1 } as ProjectionSpec<U>,
    });
    if (fetchRes.objs.length == 0) {
      throw new Error(
        `No object found for replace spec filter ${txt(
          filter
        )} on collection '${this.collectionName}'`
      );
    }
    const { _id, version, meta: fetchMeta } = fetchRes.objs[0];
    if (!_id || !version || !fetchMeta) {
      throw new Error(
        `No id, version or meta found on object ${txt(
          fetchRes.objs[0]
        )} for replace spec filter ${txt(filter)} on collection '${this.collectionName
        }'`
      );
    }

    const message = `replace spec=${txt(replaceSpec, true)} coll='${this.collectionName
      }'`;
    const createdTime =
      replacement.meta && replacement.meta.created
        ? new Date(replacement.meta.created)
        : new Date(fetchMeta.created);
    const execFunc = async (filterSpec: FilterSpec<U>) => {
      filterSpec = this.sanitize.updateFilter(filterSpec);
      const newReplacement = Object.assign({}, replacement, {
        _id: _id,
        version: filterSpec.version + 1,
        meta: {
          created: createdTime,
          modified:
            replacement.meta && replacement.meta.modified
              ? new Date(replacement.meta.modified)
              : new Date(),
        },
      });
      delete newReplacement._id;

      try {
        return await this.collectionName
          .findOneAndReplace(filterSpec, newReplacement, {
            returnOriginal: false,
          });
      } catch (e) {
        throw new Error(message+ "DB_ERROR"+ e);
      }
    };
    const result = await retryWithVersion(_id, version, execFunc, (v) => !!v.value, this);

    if (!result.value)
      throw new Error(
        `No obj found to replace with filter ${replaceSpec.filter}. Concurrency bug?`+
        "NO_MATCH"
      );

    console.log({ message: `${message} a_t=${timer.end()}` });
    return { dbTime: timer.end(), obj: this.sanitize._idToId(result.value) };
  }

  async replaceOneObj(obj: DbOneObjType<T>): Promise<ReplaceResult<U>> {
    const timer = new TimeMeasure(true);
    if (!this.isObjectLiteral(obj)) {
      throw new Error(
        `invalid obj ${txt(obj)} for replaceOneObj on '${this.collectionName}'`,
      );
    }
    let { _id, version } = obj;
    if (!_id)
      throw new Error(
        `Missing _id on the object ${txt(obj)} for replaceOneObj on '${this.collectionName
        }'`+
        "MISSING_DATA"
      );
    if (!version) version = await getVersion(_id, this);
    const filterSpec = { _id, version } as FilterSpec<U>;
    const replaceSpec: ReplaceSpec<T, U> = {
      filter: filterSpec,
      replacement: obj,
    };
    const result = await this.replaceOne(replaceSpec);
    console.log({
      message: `replaceOneObj spec=${txt(filterSpec, true)} obj=${txt(
        obj,
        true
      )} a_t=${timer.end()}`,
    });
    return { dbTime: timer.end(), obj: result.obj };
  }


  async get(obj: string | IdObject): Promise<GetResult<U>> {
    const timer = new TimeMeasure(true);
    if (!obj || Array.isArray(obj)) {
      throw new Error(
        `Invalid input ${txt(obj)} for get on '${this.collectionName}'`,
      );
    }
    const message = `get obj=${txt(obj, true)} coll=${this.collectionName}`;
    const _id = typeof obj == "string" ? obj : obj._id;
    if (!_id) {
      throw new Error(
        `Missing _id in obj ${txt(obj)} for get on '${this.collectionName}'`,
      );
    }
    let result;
    try {
      result = this.collectionName
        .find({ _id: _id })
        .toArray();
    } catch (e) {
      throw new Error(message+ "DB_ERROR"+ e);
    }
    console.log({ message: `${message} a_t=${timer.end()}` });
    return {
      obj:
        result && result.length > 0
          ? this.sanitize._idToId(result[0])
          : undefined,
      dbTime: timer.end(),
    };
  }




  async updateOneObj(obj: DbOneObjType<T>): Promise<UpdateOneObjResult<U>> {
    const timer = new TimeMeasure(true);
    if (!this.isObjectLiteral(obj)) {
      throw new Error(
        `invalid obj ${txt(obj)} for updateOneObj on '${this.collectionName}'`,
      );
    }
    let { _id } = obj;
    console.log('object',obj)
    if (!_id)
      throw new Error(
        `Missing _id on the obj ${txt(obj)} for updateOneObj in ${this.collectionName
        }`+
        "MISSING_DATA"
      );
    const newObj = Object.assign({}, obj);
    delete newObj._id;
    delete newObj.version;
    delete newObj.meta;
    const updateRes = await this.update({
      filter: { _id },
      update: { $set: newObj },
    });

    let updatedObj: U;
    if (updateRes.objs && updateRes.objs[0]) {
      updatedObj = updateRes.objs[0];
    } else {
      const getObj = await this.get(_id);
      if (!getObj.obj)
        throw new Error(`Found no object with _id ${_id}`);
      updatedObj = getObj.obj;
    }
    console.log({
      message: `updateOneObj spec=${txt({ _id })} obj=${txt(
        obj,
        true
      )} a_t=${timer.end()}`,
    });
    return {
      dbTime: timer.end(),
      obj: updatedObj,
    };
  }

  async upsert(upsertSpec: UpsertSpec<T>): Promise<UpsertResult> {
    const timer = new TimeMeasure(true);
    if (!this.isObjectLiteral(upsertSpec)) {
      throw new Error(
        `invalid spec ${txt(upsertSpec)} for upsert on '${
          this.collectionName
        }'`
      );
    }
  let { objs, uniqueFieldSet, checkFieldsPresence } = upsertSpec;
  // console.log(upsertSpec)
    let uniqueFieldSets
    if (!objs || toNonEmptyArr(objs).length == 0) {
      throw new Error(
        `no objs in upsertSpec ${txt(upsertSpec)} to upsert on '${
          this.collectionName
        }'`
      );
    }
    const upsertObjs = toNonEmptyArr(objs);
    let insertedCount: number = 0;
    let updatedCount: number = 0;
    const indexedIds: IndexMap<string>[] = [];
    let nullIndexes: any[] = []
    
    if(!uniqueFieldSets){
      let indexes: any[] = []
      let indexesObj = await this.collectionName.collection.getIndexes({full: true})
      indexesObj.map(obj => {
        if(obj.unique && !obj.partialFilterExpression )
          indexes.push(Object.keys(obj.key)[0])
        if(obj.unique && obj.partialFilterExpression)
          nullIndexes.push(Object.keys(obj.key)[0])

      })
      uniqueFieldSets = [indexes]
    }
    for (
      var mainIndex = 0;
      mainIndex < upsertObjs.length;
      mainIndex += upsertBatchSize
    ) {
      const batchObjs = upsertObjs.slice(
        mainIndex,
        mainIndex + upsertBatchSize
      );
      const indexObjMap: IndexMap<ObjWithPossibleId<T>>[] = batchObjs.map(
        (obj, index) => ({ i: mainIndex + index, obj })
      );

      //onDb objs contain id
      const { onDb, notOnDb } = await segregateObjs(
        indexObjMap,
        this,
        uniqueFieldSets,
        nullIndexes
      );
      if (notOnDb.length > 0) {
        const { insertedIds } = await this.insert({
          objs: notOnDb.map((o) => o.obj),
          checkFieldsPresence,
        });
        insertedCount += insertedIds.length;
        notOnDb.forEach((iObj, index) => {
          indexedIds.push({ i: iObj.i, obj: insertedIds[index] });
        });
      }

      if (onDb.length > 0) {
        const updateOp = async ({ i, obj }: IndexMap<T & IdObject>) => {
          await this.updateOneObj(obj);
          return obj._id;
        };
        const updatedIds = await BPromise.map(onDb, updateOp, {
          concurrency: singleOpConcurrency,
        });
        updatedCount += updatedIds.length;
        onDb.forEach((iObj, index) => {
          indexedIds.push({ i: iObj.i, obj: updatedIds[index] });
        });
      }
    }
    const ids: string[] = [];
    indexedIds.forEach((m) => (ids[m.i] = m.obj));

    console.log({
      message: `upsert insertedCount=${insertedCount} updatedCount=${updatedCount} a_t=${timer.end()}`,
    });
    return {
      ids,
      insertedCount,
      updatedCount,
      dbTime: timer.end(),
    };
  }

  isObjectLiteral = (obj?: unknown): obj is Object => typeof obj == 'object' && obj instanceof Object && !Array.isArray(obj)

}