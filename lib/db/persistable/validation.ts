import { map } from 'lodash'
export const validateFieldsPresence = <T>(objs: T[], fields: (keyof T)[], printObjInError: boolean = false) => {
    if (fields.length == 0) return

    fields.forEach(field => {
        let vals = map(objs, field)
        if (vals.length != objs.length || vals.some(val => val == undefined)) {
            const objStr = printObjInError ? ` in ${(JSON.stringify(objs))}` : ""
            throw new Error(`Missing required field '${field}'${objStr}`)
        }
    })
}