import { connect } from 'mongoose'
import { check, list } from './dcinside'
import logger from './logger'
import { Post } from './model'

async function loop (minor: boolean, gallery: string) {
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

(async () => {
  await connect('mongodb://127.0.0.1:27017/otterobo', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })

  await loop(true, 'aoegame')
})()
  .catch(console.error)
