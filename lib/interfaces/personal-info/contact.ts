import { strEnum } from "common/type"

export const IndiaStatesEnum = strEnum(["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh",
    "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Lakshadweep", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Delhi", "Odisha", "Puducherry", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"])
    
export type IndiaStateType = keyof typeof IndiaStatesEnum

export const indiaStatesArr = Object.keys(IndiaStatesEnum) as IndiaStateType[]

export interface ContactInfoModel {
    address?: AddressModel
    //One phone/email identifies one person
    //With an array, it creates a very complex scenario of mapping unique phones to many children
    phone: string
    email?: string
}

export interface AddressModel {
    flatBuilding?: string
    locality?: string
    city?: string
    zip?: string
    state?: IndiaStateType
    country?: "india"
    //Long-term Planning! Go Elon Musk!
    planet?: "earth" | "mars"
}


export const getCityZipStr = (addr: AddressModel) => {
    if (addr.city || addr.zip) {
        return (addr.city || "") + " - " + (addr.zip || "")
    }
}
