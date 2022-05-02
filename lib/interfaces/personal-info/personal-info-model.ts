import { arrToRegEx } from "./../../common/transform"
import { strEnum } from "./../../common/type"
import { PersistableObject } from "./../../db/persistable/db"
import { ContactInfoModel } from "./contact" 
import { NameModel } from "./name"

export const GenderEnum = strEnum(["m", "f", "o"])
export const GenderEnumList = ["m", "f", "o"]
export type GenderType = keyof typeof GenderEnum
export const genderList = Object.keys(GenderEnum) as GenderType[]
export const genderRegEx = arrToRegEx(genderList)
export const isGenderType = (gender?: string): gender is GenderType => !!gender && genderRegEx.test(gender)
export interface PersonalInfoModel extends Partial<NameModel> {
    gender?: GenderType
    profilePic?: string
    dob?: string //Date in ISO
}

export interface PersonalInfoPersistable extends PersonalInfoModel, PersistableObject { }

export interface AdultInfoModel extends PersonalInfoModel, ContactInfoModel { }
export interface AdultInfoPersistable extends AdultInfoModel, PersistableObject { }

export interface CategorizedInterestsModel {
    [x: string]: string[]
}

export interface StudentInfoModel extends PersonalInfoModel {
    referCode?: string
    parentIds?: string[] //TODO
    phone?: string  //To be taken as parent phone number.
    whatsappPhone?: string
    teacherIds?: string[]
    username?: string
    //In case school information is missing. Board is determined from here.
    // board?: BoardType
    email?: string
    badges?: string[]
    googleId?: string
    facebookId?: string
    interests?: string[]
    starsSpent?: number
    gainedStars?: number
    balanceStars?: number
    leaderboard?: LeaderboardData
    weeklyLeaderboardMilestone?: number
}
export interface LeaderboardData {
    highestPoints?: number
    bestRank?: number
}