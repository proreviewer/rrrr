import { model, Schema } from 'mongoose'
import { ICommentDocument, IPostDocument } from './interface'

export const postSchema = new Schema<IPostDocument>({
  minor: Boolean,
  gallery: String,
  post: Number,

  nickname: String,
  username: String,
  usertype: Number,
  subject: String,
  title: String,
  body: String,
  view: { required: true, type: Number, default: 0 },
  vote_up: { required: true, type: Number, default: 0 },
  vote_up_fixed: { required: true, type: Number, default: 0 },
  vote_down: { required: true, type: Number, default: 0 },
  history: [
    {
      title: String,
      body: String,
      checked_at: Number
    }
  ],

  created_at: Number,
  edited_at: Number,
  checked_at: Number,
  deleted_at: Number,

  is_mobile: Boolean,
  is_deleted: Boolean,
  is_recommended: Boolean,
  has_image: Boolean,

  http_code: Number
})

export const commentSchema = new Schema<ICommentDocument>({
  minor: Boolean,
  gallery: String,
  post: Number,
  parent: Number,
  comment: Number,

  nickname: String,
  username: String,
  usertype: Number,
  body: String,
  history: [
    {
      body: String,
      checked_at: Number
    }
  ],

  created_at: Number,
  edited_at: Number,
  checked_at: Number,
  deleted_at: Number,

  is_deleted: Boolean
})

postSchema.index({ minor: 1, gallery: 1, post: -1 }, { unique: true })
commentSchema.index({ minor: 1, gallery: 1, post: -1, comment: -1 }, { unique: true })

export const Post = model<IPostDocument>('post', postSchema)

export const Comment = model<ICommentDocument>('comment', commentSchema)
