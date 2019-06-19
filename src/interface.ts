import { Document } from 'mongoose'

export interface LosseObject {
  [key: string]: any
}

export interface ListOptions {
  /** 마이너 갤러리인지? */
  minor: boolean

  /** 갤러리 아이디 */
  gallery: string

  /** 개념글만 불러올지? */
  recommend?: boolean
}

export interface ViewOptions {
  /** 마이너 갤러리인지? */
  minor: boolean

  /** 갤러리 아이디 */
  gallery: string

  /** 게시글 아이디 */
  post: number
}

export interface CommentsOptions extends ViewOptions {
  page?: number
}

export interface CheckOptions extends ListOptions, ViewOptions { }

export interface IPost {
  minor: boolean
  gallery: string
  post: number

  nickname: string
  username: string
  usertype: UserType
  subject: string
  title: string
  body: string
  view: number
  vote_up: number
  vote_up_fixed: number
  vote_down: number
  history: {
    title: string
    body: string
    checked_at: number
  }[]

  created_at: number
  edited_at: number
  checked_at: number
  deleted_at: number

  is_deleted: boolean
  is_recommended: boolean
  has_image: boolean

  http_code: number
}

export interface IComment {
  minor: boolean,
  gallery: string,
  post: number,
  comment: number,
  parent: number,

  nickname: string,
  username: string,
  usertype: UserType,
  body: string,
  history: {
    body: string,
    checked_at: number
  }[],

  created_at: number,
  edited_at: number,
  checked_at: number,
  deleted_at: number,

  is_deleted: boolean
}

export interface IPostDocument extends IPost, Document { }
export interface ICommentDocument extends IComment, Document { }

export enum UserType {
  ANONYMOUS,
  FIXED,
  MOD,
  ADMIN
}

export enum UpdateOrInsertResult {
  NONE,
  INSERTED,
  CHECKED,
  UPDATED
}
