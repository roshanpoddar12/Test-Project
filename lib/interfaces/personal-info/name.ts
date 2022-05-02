import { strEnum } from './../../common/type'
import { isEqual } from 'lodash'

import { firstLetterCapital } from '../../common/transform'

export const NameTitlesEnum = strEnum(["mr", "mr.", "ms", "ms.", "mrs", "mrs.", "dr", "dr.", "er", "er.", "ca", "professor", "prof.", "prof"])
export const NameTitlesEnumList = ["mr", "mr.", "ms", "ms.", "mrs", "mrs.", "dr", "dr.", "er", "er.", "ca", "professor", "prof.", "prof"]

export type NameTitlesType = keyof typeof NameTitlesEnum
export const NameTitlesArr = Object.keys(NameTitlesEnum) as NameTitlesType[]
export const isNameTitle = (str: string): str is NameTitlesType => !!str && NameTitlesArr.indexOf(str.trim().toLocaleLowerCase() as NameTitlesType) != -1

//After retreiving from DB, these values may be set to null
export interface NameModel {
    title?: NameTitlesType | null
    firstName: string
    middleNames?: string[] | null
    lastName?: string | null
}

export const formattedFullName = (nameParts: Partial<NameModel>): string | undefined => {
    if (nameParts.firstName) {
        let names = [firstLetterCapital(nameParts.firstName)]
        if (nameParts.middleNames && nameParts.middleNames.length > 0) {
            names.push(...nameParts.middleNames.map(name => firstLetterCapital(name)).filter(val => val))
        }
        if (nameParts.lastName) {
            names.push(firstLetterCapital(nameParts.lastName))
        }
        return names.join(" ")
    }
}

export const splitName = (name: string): NameModel => {
    name = name && name.trim()
    if (!name) { throw new Error("Name cannot be empty") }
    let nameParts = name.split(" ").map(part => part.trim().toLocaleLowerCase()).filter(part => part)
    let firstPart = nameParts[0]
    let nameModel: NameModel
    if (isNameTitle(firstPart) && nameParts.length > 1) {
        nameModel = {
            title: firstPart,
            firstName: nameParts[1]
        }
        nameParts = nameParts.slice(2)
    } else {
        nameModel = {
            firstName: nameParts[0]
        }
        nameParts = nameParts.slice(1)
    }

    if (nameParts.length > 0) {
        nameModel.lastName = nameParts[nameParts.length - 1]
        if (nameParts.length > 1) {
            nameModel.middleNames = nameParts.slice(0, nameParts.length - 1)
        }
    }
    return nameModel
}

export const isNameEqual = (name1: string | Partial<NameModel>, name2: string | Partial<NameModel>): boolean => {
    let nameParts1 = typeof name1 == 'string' ? splitName(name1) : name1
    let nameParts2 = typeof name2 == 'string' ? splitName(name2) : name2
    return isEqual(nameParts1, nameParts2)
}

export const constructUsername = (nameParts: Partial<NameModel>): string => {
    let userName = ""
    if (nameParts.firstName) {
        userName = nameParts.firstName.toLocaleLowerCase()
        if (nameParts.lastName)
            userName += nameParts.lastName.charAt(0).toLocaleLowerCase()
    }
    return userName
}