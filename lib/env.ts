//http://stackoverflow.com/questions/17575790/environment-detection-node-js-or-browser
//This doesn't work be unsafe, inline JS eval is disabled through HTML Security Directive

//These have to be functions because webpack processes them for web in node env. 
//As variables, they will get static values in browsers
export const isBrowser = () => typeof window === 'object'
export const isNode = () => !isBrowser()

export const isNode64: boolean = isNode() && process.arch === 'x64'
export const isNode32: boolean = isNode() && process.arch === 'ia32'

export const isNodeOnWin: boolean = isNode() && process.platform == 'win32'
export const isNodeOnMac: boolean = isNode() && process.platform == 'darwin'
export const isNodeOnLinux: boolean = isNode() && process.platform == 'linux'

//https://coderwall.com/p/0eds7q/detecting-64-bit-windows-in-node-js
export const isNodeOnWin64: boolean = isNodeOnWin && (isNode64 || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432'))
export const isNodeOnWin32: boolean = isNodeOnWin && (isNode32 && !process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432'))

export const isNodeOnLinux64: boolean = isNodeOnLinux && isNode64
export const isNodeOnLinux32: boolean = isNodeOnLinux && isNode32

export const isAndroid: boolean = !!process.env.ANDROID
export const isIOS: boolean = !!process.env.IOS

export const isPhoneApp: boolean = isAndroid || isIOS
export const isWebApp: boolean = !isPhoneApp

export const isDev: boolean = process.env.NODE_ENV == 'development'
export const isStage: boolean = process.env.NODE_ENV == 'production' && !!process.env.STAGE_ENV && !process.env.REVIEW_ENV
export const isReview: boolean = process.env.NODE_ENV == 'production' && !process.env.STAGE_ENV && !!process.env.REVIEW_ENV
export const isTest: boolean = process.env.NODE_ENV == 'test'
export const isInternal: boolean = isDev || isStage || isReview

export const isProd: boolean = process.env.NODE_ENV == 'production' && !isInternal

export const isEnableSw: boolean = !!process.env.ENABLE_SW && isWebApp

if (isAndroid && isIOS) {
    throw new Error("Cannot set android and ios in the same build")
}

if (!isProd && !isDev && !isTest && !isStage && !isReview) {
    //Env should not import anything. Throw an error if ENV is not set
    throw new Error(`The application has to run in either developement, production or test mode. INVALID_CONFIG`)
}

//Required by configuration to decide which database to connect
export const isDocker: boolean = !!process.env.IS_DOCKER
