// export interface ModificationNote {
//   created: Date
//    modified: Date
// }

export const meta = {
    created: Date,
    modified: Date
}

export enum response_status_codes {
    success = 200,
    bad_request = 400,
    internal_server_error = 500
}