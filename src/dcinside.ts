import * as cheerio from 'cheerio'
import { get, HTTPError, post } from 'got'
import * as moment from 'moment'
import * as querystring from 'querystring'
import { CheckOptions, CommentsOptions, IComment, IPost, ListOptions, LosseObject, UpdateOrInsertResult, UserType, ViewOptions } from './interface'
import logger from './logger'
import { Comment, Post } from './model'
import { isMatch, toInt, trim } from './utils'

/**
 * 게시글 목록을 불러옵니다.
 * @param opts 옵션
 */
export async function list (opts: ListOptions) {
  let path = `/board/${opts.gallery}?`

  if (opts.recommend)
    path += 'recommend=1'

  // 크롤링 시작하기
  const res = await get(path, {
    baseUrl: 'https://m.dcinside.com',
    timeout: 750,
    headers: {
      'User-Agent': '(Android)'
    }
  })

  // 응답 결과가 비어있다면 리턴하기
  if (!res.body)
    throw new Error('서버가 빈 내용을 반환했습니다.')

  // 파싱 시작하기
  const $ = cheerio.load(res.body, {
    decodeEntities: false
  })

  // 게시글 번호만 긁어오기
  const post = $('.gall-detail-lnktb').toArray().map(el => {
    const node = $(el)
    const match = node.find('a.lt').attr('href').match(/\/\d+(\?|$)/)
    return toInt(match[0])
  })

  return post
}

/**
 * 게시글을 불러옵니다.
 * @param opts 옵션
 */
export async function view (opts: ViewOptions) {
  const res = await get(`/board/${opts.gallery}/${opts.post}`, {
    baseUrl: 'https://m.dcinside.com',
    timeout: 750,
    headers: {
      'User-Agent': '(Android)'
    }
  })

  if (!res.body)
    throw new Error('서버가 빈 내용을 반환했습니다.')

  const $ = cheerio.load(res.body, {
    decodeEntities: false
  })

  const node = $('.gallview-tit-box')

  // 제목 및 말머리
  const titleMatches = trim(node.find('.tit').text()).match(/(\[(.+)\]\n)?(.+)?/)
  const subject = titleMatches[2]
  const title = titleMatches[3]

  // 사용자
  const userMatches = trim(node.find('.rt a').attr('href')).match(/\/([^\/]+)$/) || [ undefined ]
  const nameMatches = trim(node.find('.ginfo2 li').first().text()).match(/([^(]+)(\((.+)\))?/) || [ '', '', '' ]
  const nickname = nameMatches[1]
  const username = userMatches[1] || nameMatches[3]

  // 사용자 종류
  let usertype = UserType.ANONYMOUS

  if (node.find('.gonick').length > 0) usertype = UserType.FIXED
  else if (node.find('.sub-gonick').length > 0) usertype = UserType.MOD
  else if (node.find('.m-gonick').length > 0) usertype = UserType.ADMIN

  // 조회수 및 추천 수
  const info = $('.gall-thum-btm .ginfo2 li')
  const view = toInt(info.first().text())
  const voteUp = toInt($('#recomm_btn').text())
  const voteUpFixed = toInt($('#recomm_btn_member').text())
  const voteDown = toInt($('#nonrecomm_btn').text())

  // 시간
  const createdAt = moment(node.find('.ginfo2 li').last().text(), 'YYYY.MM.DD HH:mm').unix()

  // 내용
  let hasImage = false
  $('.thum-txtin, .thum-txtin *')
    .contents()
    .filter((i, el) => {
      const node = $(el)

      if (el.type === 'comment')
        return true

      if (el.tagName === 'script')
        return true

      if (node.hasClass('adv-groupno'))
        return true

      return false
    })
    .remove()

  $('.thum-txtin img').each((i, el) => {
    const node = $(el)
    const src = node.data('original') || node.attr('src')

    el.attribs = {}
    node.attr('src', src)
    hasImage = true
  })

  const body = trim($('.thum-txtin').html())

  // 제목
  // const subject = trim($('.title_headtext').text()) || null
  // const title = trim($('.title_subject').text())
  // const isMobile = $('.title_device .icon_write_app').length > 0

  // 사용자
  // const writer = $('.gall_writer')
  // const nickname = writer.attr('data-nick')
  // const username = writer.attr('data-uid') || writer.attr('data-ip')
  // const createdAt = moment(writer.find('.gall_date').attr('title')).unix()
  // const view = toInt(writer.find('.gall_count').text())

  // 사용자 종류
  // let usertype = UserType.ANONYMOUS
  // const userpath = writer.find('.writer_nikcon img').attr('src').match(WRITER_TYPE)

  // if (!userpath) usertype = UserType.ANONYMOUS
  // else if (userpath[0] === 'fix_nik') usertype = UserType.FIXED
  // else if (userpath[0] === 'fix_sub_managernik') usertype = UserType.MOD
  // else if (userpath[0] === 'fix_managernik') usertype = UserType.ADMIN

  // 내용
  // const content = $('.writing_view_box')

  // // 필요없는 태그 삭제하기
  // $('.writing_view_box, .writing_view_box *')
  //   .contents()
  //   .filter((i, el) => {
  //     const node = $(el)

  //     if (el.type === 'comment')
  //       return true

  //     if (el.tagName === 'script')
  //       return true

  //     if (node.attr('id') === ('zzbang_div'))
  //       return true

  //     if (node.hasClass('adv-groupno'))
  //       return true

  //     return false
  //   })
  //   .remove()

  // const body = trim(content.html())
  // const hasImage = content.find('img').length > 0

  // 추천
  // const voteUp = toInt($('.up_num').text())
  // const voteUpFixed = toInt($('.sup_num').text())
  // const voteDown = toInt($('.down_num').text())

  const post: IPost = {
    minor: opts.minor,
    gallery: opts.gallery,
    post: opts.post,

    nickname,
    username,
    usertype,
    subject,
    title,
    body,
    view,
    vote_up: voteUp,
    vote_up_fixed: voteUpFixed,
    vote_down: voteDown,
    history: [],

    created_at: createdAt,
    edited_at: null,
    checked_at: moment().unix(),
    deleted_at: null,

    is_deleted: false,
    is_recommended: false,
    has_image: hasImage,

    http_code: res.statusCode
  }

  return post
}

/**
 * 댓글 한 페이지를 불러옵니다.
 * @param opts 옵션
 */
export async function viewComments (opts: CommentsOptions) {
  const res = await post('/ajax/response-comment', {
    baseUrl: 'https://m.dcinside.com',
    timeout: 500,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: querystring.encode({
      id: opts.gallery,
      no: opts.post,
      csort: 'default',
      cpage: opts.page || 1
    })
  })

  if (!res.body)
    throw new Error('서버가 빈 내용을 반환했습니다.')

  // JSON 데이터 반환 시 댓글이 없는 것으로 판단하고 리턴하기
  try {
    JSON.parse(res.body)
    return []
  } catch (e) {
    // 무시하고 다음으로 넘어가기
  }

  const $ = cheerio.load(res.body, {
    decodeEntities: false
  })
  const commentData = $('li').toArray()
  const comments: IComment[] = []

  let latestComment: number

  for (let i = 0, len = commentData.length; i < len; i++) {
    const node = $(commentData[i])
    const parent = node.hasClass('comment-add') ? (latestComment ? latestComment : 0) : null

    const order = toInt(node.attr('ch'))
    const comment = toInt(node.attr('no'))

    // 순서가 잘못 됐다면 페이지 오류로 판단하고 리턴하기
    if (order < 1)
      break

    // 댓글돌이 같이 번호가 없는 댓글은 무시하기
    if (!comment)
      continue

    // 대댓글이 아니라면 지금 댓글을 마지막 댓글로 지정하기
    if (!parent)
      latestComment = comment

    const hasUsername = node.find('.blockCommentId').length > 0
    const nickname = trim(node.find('.nick').contents().first().text())
    const username = trim(node.find(hasUsername ? '.blockCommentId' : '.blockCommentIp').text()).replace(/[\(\)]/g, '')
    const body = trim(node.find('.txt').html())

    const checkedAt = moment().unix()
    let deletedAt = null
    let isDeleted = false

    // 사용자 종류
    let usertype = UserType.ANONYMOUS

    if (node.find('.gonick').length > 0) usertype = UserType.FIXED
    else if (node.find('.sub-gonick').length > 0) usertype = UserType.MOD
    else if (node.find('.m-gonick').length > 0) usertype = UserType.ADMIN

    comments.push({
      minor: opts.minor,
      gallery: opts.gallery,
      post: opts.post,
      comment,
      parent,

      nickname,
      username,
      usertype,
      body,
      history: [],

      created_at: moment(node.find('.date').text(), 'MM-DD HH:mm').unix(),
      edited_at: 0,
      checked_at: checkedAt,
      deleted_at: deletedAt,

      is_deleted: isDeleted
    })
  }

  return comments
}

/**
 * 댓글 전체를 불러옵니다.
 * @param opts 옵션
 */
export async function fetchComments (opts: CommentsOptions) {
  let page = opts.page || 0
  let result = []
  const comments = []

  while (page++ === 0 || result.length > 0) {
    result = await viewComments({
      minor: opts.minor,
      gallery: opts.gallery,
      post: opts.post,
      page
    })

    comments.push(...result)
  }

  return comments
}

/**
 * 게시글을 검사해 데이터베이스에 추가하거나 업데이트합니다.
 * @param opts 옵션
 */
export async function check (opts: CheckOptions) {
  const prefix = `[${opts.gallery}#${opts.post}]`
  const currentUnix = moment().unix()
  const find = {
    minor: opts.minor,
    gallery: opts.gallery,
    post: opts.post
  }

  logger.verbose(`${prefix} Checking...`)

  // 게시글 업데이트
  try {
    let postData = await view(opts)

    if (opts.recommend)
      postData.is_recommended = true

    const result = await updateOrInsertPost(postData)

    if (result === UpdateOrInsertResult.INSERTED) logger.info(`${prefix} Post inserted: ${postData.title}`)
    else if (result === UpdateOrInsertResult.CHECKED) logger.verbose(`${prefix} Post checked`)
    else if (result === UpdateOrInsertResult.UPDATED) logger.info(`${prefix} Post updated`)
  } catch (e) {
    if (e instanceof HTTPError) {
      // HTTP 오류라면 게시글 데이터 업데이트하기
      const update: LosseObject = {
        checked_at: currentUnix,
        http_code: e.statusCode
      }

      // 오류 코드가 403 이라면 삭제된 글로 간주하기
      if (e.statusCode === 403) {
        update.deleted_at = currentUnix
        update.is_deleted = true
        logger.warn(`${prefix} Post deleted`)
      } else {
        logger.error(`${prefix} Cannot fetch the post. could be a restrict (${e.statusCode})`)
      }

      const query = Post.findOneAndUpdate(find, update)
      await query.exec()
      return
    } else {
      throw e
    }
  }

  // 댓글 업데이트
  try {
    const query = Comment.find(find)
    const commentData = await query.exec()
    const comments = await fetchComments({
      minor: opts.minor,
      gallery: opts.gallery,
      post: opts.post
    })

    const commentIds = comments.map(c => c.comment)

    let insertedComments = 0
    let updatedComments = 0

    // 저장된 데이터 중 삭제된 댓글이 있는지 확인하기
    for (let i = 0, len = commentData.length; i < len; i++) {
      const comment = commentData[i]

      // 새로 받아온 데이터 중 저장된 댓글이 없을 경우 삭제된 댓글로 표시하기
      if (!commentIds.includes(comment.comment)) {
        comment.deleted_at = currentUnix
        comment.is_deleted = true
        await updateOrInsertComment(comment)
        ++updatedComments
      }
    }

    // 추가 또는 업데이트하기
    for (let i = 0, len = comments.length; i < len; i++) {
      const result = await updateOrInsertComment(comments[i])
      if (result === UpdateOrInsertResult.INSERTED) ++insertedComments
      else if (result === UpdateOrInsertResult.UPDATED) ++updatedComments
    }

    logger.info(`${prefix} Comments checked (${comments.length} found, ${insertedComments} inserted, ${updatedComments} updated)`)
  } catch (e) {
    if (e instanceof HTTPError) {
      logger.error(`${prefix} Cannot fetch the commands. could be a restrict or API update (${e.statusCode})`)
    } else {
      throw e
    }
  }
}

/**
 * 게시글 데이터를 토대로 데이터베이스에 추가하거나 업데이트합니다.
 * @param data 게시글 데이터
 */
async function updateOrInsertPost (data: IPost) {
  let result = UpdateOrInsertResult.CHECKED

  try {
    const post = new Post(data)
    await post.save()
    result = UpdateOrInsertResult.INSERTED
  } catch (e) {
    const find = {
      minor: data.minor,
      gallery: data.gallery,
      post: data.post
    }
    const update: LosseObject = {
      view: data.view,
      vote_up: data.vote_up,
      vote_up_fixed: data.vote_up_fixed,
      vote_down: data.vote_down,
      checked_at: data.checked_at,
      deleted_at: data.deleted_at,
      is_deleted: data.is_deleted,
      is_recommended: data.is_recommended
    }

    const beforeQuery = Post.findOne(find)
    const before = await beforeQuery.exec()

    // 이전 게시글 데이터가 없다면 오류 리턴하기
    if (!before)
      throw e

    let title = before.title
    let body = before.body

    // 기록이 있다면 마지막 기록과 비교하기
    if (before.history.length > 0) {
      title = before.history[before.history.length - 1].title
      body = before.history[before.history.length - 1].body
    }

    // 내용과 제목이 완전히 일치하지 않는다면 기록에 추가하기
    if (!isMatch(data.title, title) || !isMatch(data.body, body)) {
      result = UpdateOrInsertResult.UPDATED
      update.$push = {
        history: {
          title: data.title,
          body: data.body,
          checked_at: data.checked_at
        }
      }
    }

    // 업데이트 실행하기
    const query = Post.findOneAndUpdate(find, update)
    await query.exec()
  }

  return result
}

/**
 * 댓글 데이터를 토대로 데이터베이스에 추가하거나 업데이트합니다.
 * @param data 댓글 데이터
 */
async function updateOrInsertComment (data: IComment) {
  let result = UpdateOrInsertResult.CHECKED

  try {
    const comment = new Comment(data)
    await comment.save()
    result = UpdateOrInsertResult.INSERTED
  } catch (e) {
    const find = {
      minor: data.minor,
      gallery: data.gallery,
      post: data.post,
      comment: data.comment
    }
    const update: LosseObject = {
      checked_at: data.checked_at,
      deleted_at: data.deleted_at,
      is_deleted: data.is_deleted
    }

    const beforeQuery = Comment.findOne(find)
    const before = await beforeQuery.exec()

    // 이전 게시글 데이터가 없다면 오류 리턴하기
    if (!before)
      throw e

    let body = before.body

    // 기록이 있다면 마지막 기록과 비교하기
    if (before.history.length > 0)
      body = before.history[before.history.length - 1].body

    // 내용이 완전히 일치하지 않는다면 기록에 넣기
    if (!isMatch(data.body, body)) {
      result = UpdateOrInsertResult.UPDATED
      update.$push = {
        history: {
          body: data.body,
          checked_at: data.checked_at
        }
      }
    }

    // 업데이트 실행하기
    const query = Comment.findOneAndUpdate(find, update)
    await query.exec()
  }

  return result
}
