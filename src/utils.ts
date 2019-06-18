import { createHash } from 'crypto'

export function trim (str?: string) {
  if (!str)
    return ''

  return str
  .split(/[^\S\r\n]{2,}/g)
  .join(' ')
  .replace(/(\r?\n){2,}/g, '\n\n')
  .trim()
}

export function toInt (i: any) {
  if (!i)
    i = 0

  if (typeof i === 'number')
    return i

  return parseInt(i.replace(/[^\d]/g, ''), 10)
}

export function isMatch (a: string, b: string) {
  const hashA = createHash('sha1').update(a).digest('hex')
  const hashB = createHash('sha1').update(b).digest('hex')
  return hashA === hashB
}
