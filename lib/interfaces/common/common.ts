export type PerformanceLevelType = "high" | "medium" | "low" | "none"
export const performanceLevelList: PerformanceLevelType[] = ["high", "medium", "low", "none"]

export const performanceTitle = (level: PerformanceLevelType): string => {
    switch(level) {
        case "high": return "HIGH"
        case "medium": return "Medium"
        case "low": return "Low"
        case "none": return "No"
    }
}

export const getPerformanceLevel = (score: number): PerformanceLevelType => {
    if (isNaN(score)) return "none"
    if (score < 50) return "low"
    else if (score > 80) return "high"
    return "medium"
}

export interface TopicsAndSubTopics {
    topics: string[]
    subTopics: string[]
}