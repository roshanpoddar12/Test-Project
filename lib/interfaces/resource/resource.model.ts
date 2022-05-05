import { PersistableObject } from "db/persistable/db"
import { TopicsAndSubTopics } from "../common/common"
import * as mongoose from 'mongoose';


export type ResourceType = "learn" | "revise" | "practice" | "test"
//Add function to get resource type from resource ID

export type SceneType = "activity" | "video" | "reading" | "assessment"
export const isSceneType = (s: string): s is SceneType => {
    return ["activity", "video", "reading", "assessment"].indexOf(s) != -1
}

export const getSceneTypeTitle = (type: SceneType): string => {
    switch (type) {
        case "activity": return "ACTIVITY"
        case "video": return "VIDEO"
        case "reading": return "READING"
        case "assessment": return "ASSESSMENT"
    }
}

export interface CommonResourceModel extends TopicsAndSubTopics {
    id: string
    title?: string
    posterImgSrc: string
    subTitle?: string
    description?: string
    estimatedTime?: number      //in minutes
    contentIds?: string[]
    // exams?: ExamType[]
}



export type ResourceModel = CommonResourceModel

export type ResourcePersistable = CommonResourceModel & PersistableObject

export type ResourceDocument = mongoose.Document & ResourcePersistable

export type SessionStatusType = "ongoing" | "exited" | "completed" | "ended_by_system"



