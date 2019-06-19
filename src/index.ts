import * as moment from 'moment'
import { connect } from 'mongoose'
import { check, list } from './dcinside'
import logger from './logger'
import { Post } from './model'

async function loopInsert (minor: boolean, gallery: string) {
  while (1) {
    try {
      const promises = []
      const unreadedPosts = []
      const posts = await list({ minor, gallery })

      for (let i = 0, len = posts.length; i < len; i++) {
        const post = posts[i]
        const query = Post.findOne({ minor, gallery, post })

        const postData = await query.exec()

        // 게시글 정보가 없을 경우 업데이트하기
        if (!postData) {
          unreadedPosts.push(post)
          promises.push(check({ minor, gallery, post }))
        }
      }

      await Promise.all(promises)
    } catch (e) {
      logger.error(e.message)
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

async function loopUpdate (minor: boolean, gallery: string) {
  while (1) {
    try {
      const unix = moment().unix() - 60 * 60
      const query = Post
        .find({
          minor,
          gallery,
          is_deleted: false,
          $or: [
            // 1시간 전 글
            { created_at: { $gte: unix } },

            // 조회수 50 이상
            { view: { $gte: 50 } }
          ]
        })
        .sort({
          created_at: -1,
          view: -1
        })

      const posts = await query.limit(50).exec()
      const promises = posts.map(post => check({ minor, gallery, post: post.post }))
      await Promise.all(promises)
    } catch (e) {
      logger.error(e)
    }
  }
}

(async () => {
  await connect('mongodb://127.0.0.1:27017/otterobo', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })

  loopInsert(true, 'aoegame').catch(e => logger.error)
  loopUpdate(true, 'aoegame').catch(e => logger.error)
})()
  .catch(console.error)
