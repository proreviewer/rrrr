import { model } from 'mongoose'
import { ICommentDocument, IPostDocument } from './interface'
import { commentSchema, postSchema } from './schema'

export const Post = model<IPostDocument>('post', postSchema)

export const Comment = model<ICommentDocument>('comment', commentSchema)
