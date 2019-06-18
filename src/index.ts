import { connect } from 'mongoose'
import { check, list } from './dcinside'
import logger from './logger'

(async () => {
  await connect('mongodb://127.0.0.1:27017/otterobo', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })

  while (1) {
    try {
      const posts = await list({
        minor: true,
        gallery: 'aoegame'
      })

      const promises = posts.map(post => check({
        minor: true,
        gallery: 'aoegame',
        post
      }))

      await Promise.all(promises)
    } catch (e) {
      logger.error(e.message)
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
})()
  .catch(console.error)
