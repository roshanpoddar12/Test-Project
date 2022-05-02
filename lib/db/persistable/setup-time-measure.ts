import { setGlobalTimeMeasurer } from './time-measure'

setGlobalTimeMeasurer(() => {
    const time = process.hrtime()
    return (time[0]*1000 + time[1]/1e6)
})