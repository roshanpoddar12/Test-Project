export const toAtLeast2DigitStr = (val: number) => toAtLeastNDigitStr(val, 2)

export const toAtLeastNDigitStr = (val: number, n: number) => {
    const diff = val.toString().length - n
    return (diff < 0 ? (Array(-diff).fill("0").join("")) : "") + val
}

//A hack for javascript's weirdness
//http://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-in-javascript
export const roundTo2Decimal = (num: number) => Math.round((num + 0.00001) * 100) / 100

const reverseString = (str: string) => str.split('').reverse().join('')

export const formatNumber = (num: number, style: "indian" | "western" = "indian"): string => {
    let numStr = num.toString()
    if (numStr.length <= 3)
        return numStr
    let parts: string[] = [numStr.substr(-3)]
    let numRem = numStr.substr(0, numStr.length - 3)
    let numRemRev = reverseString(numRem)
    let regEx = style == "indian" ? /(\d\d)/ : /(\d\d\d)/
    parts.push(...numRemRev.split(regEx).filter(val => val).map(val => reverseString(val)))
    return parts.reverse().join(",")
}

export const firstLetterCapital = (text: string) => (text && (text = text.trim()) && text.length > 0) ? (text[0].toLocaleUpperCase() + text.substr(1).toLocaleLowerCase()) : ""

/* export const screenTypeToString = (screenType: ContentType): string => {
    switch (screenType) {
        case "passage": return "Passage"
        case "word-meaning": return "Word Meaning"
        case "qna": return "Assessment"
        default: return ""
    }
} */

//https://stackoverflow.com/a/1144788
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_special_characters
export const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
export const replaceContent = (content: string, fileMap: Map<string, string>): string => {
    const keys = Array.from(fileMap.keys()).sort((k1, k2) => k2.length - k1.length)
    keys.forEach(key => {
        const val = fileMap.get(key)
        if (val) {
            content = content.replace(new RegExp(escapeRegExp(key), "g"), val)
        }
    })
    return content
}

export type NumberingType = "roman" | "decimal" | "alphabetical"
export const romanSequence = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xvii', 'xix', 'xx']
export const alphaSequence = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
export const toNumberType = (num: number, numberingType: NumberingType) => {
    switch (numberingType) {
        case 'decimal':
            return num
        case 'roman':
            return romanSequence[num - 1]
        case 'alphabetical':
            return alphaSequence[num - 1]
    }
}

export const secondsToTimeStr = (time: number): string => {
    time = Math.round(time)
    let secs = time % 60
    let mins = ((time - secs) / 60) % 60
    let hours = ((time - secs - mins * 60) / 3600)
    return `${toAtLeast2DigitStr(hours)}:${toAtLeast2DigitStr(mins)}:${toAtLeast2DigitStr(secs)}`
}

export const shortenTxt = (txt: string, length: number = 300) => {
    if (typeof txt != 'string') {
        txt = JSON.stringify(txt)
    }
    if (txt.length < length) {
        return txt
    } else {
        const startLength = Math.round(length * 2 / 3)
        const endLength = length - startLength
        return txt.substr(0, startLength) + " ... " + txt.substr(txt.length - endLength - 1, endLength)
    }
}

export const toArr = <T>(obj: T | T[]): T[] => obj instanceof Array ? obj : [obj]
export const toNonEmptyArr = <T>(obj: T | T[]): T[] => toArr(obj).filter(T => T)
export const arrToRegEx = (arr: string[]) => new RegExp(`^(${arr.join("|")})$`)

//Similar to groupBy in lodash except that the output of iteratee can be string array and it will associate the element T with all the groups
export const groupByArr = <T, TKey extends string>(collection: T[], iteratee: (element: T) => TKey[]): {[K in TKey]?: T[]} => {
    return collection.reduce<{[K in TKey]?: T[]}>((accumulator, element) => {
        const categories = iteratee(element)
        categories.forEach(category => {
            const accQnr = (accumulator[category] || []) as T[]
            accumulator[category] = [...accQnr, element]
        })
        return accumulator
    }, {})
}