// import { Error } from './error'
// import { GeniusLogger } from './log'
import { roundTo2Decimal } from '../../common/transform'

// const log = new GeniusLogger("time-measure")

//number is in milliseconds
export type CurrentTimeFunc = () => number

let globalTimeMeasurer: CurrentTimeFunc | undefined
export const setGlobalTimeMeasurer = (fn: CurrentTimeFunc) => { globalTimeMeasurer = fn }
export const getCurrentTime = () => {
    if (!globalTimeMeasurer) {
        throw new Error("Global TimeMeasurer not set")
    }
    return globalTimeMeasurer()
}

export class TimeMeasure {
    private startTime: number | undefined
    private measuredTime: number | undefined

    constructor(start: boolean = true) {
        if (start)
            this.startTime = getCurrentTime()
    }

    start(): void {
        if (!this.startTime)
            this.startTime = getCurrentTime()
    }

    end(): number {
        if (!this.startTime)
            throw new Error("Time measure hasn't started")
        if (!this.measuredTime) {
            //Gives two digits beyond ms
            this.measuredTime = roundTo2Decimal(getCurrentTime() - this.startTime)
        }
        return this.measuredTime
    }
}

export const measureExecTime = <T extends (...args: any[]) => any>(funcName: string, func: T): T => {
    if (typeof func != 'function') {
        throw new Error("Measure exec time runs only on functions")
    }
    return ((...args: any[]) => {
        const tm = new TimeMeasure(true)
        const val = func(...args)
        console.log({ context: funcName, time: tm.end() })
        return val
    }) as T
}