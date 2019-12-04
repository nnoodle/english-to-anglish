
function parseAnglishTable(tbl) {
  const getel = (e, n) => {
    try {
      let r = e.children[n].innerText.trim()
      return r !== '-' && r
    } catch(err) {
      if (!(err instanceof TypeError)) {
        console.dir({e, n, tbl})
        console.error(err)
        throw err
      }
      return false
    }
  }
  try {
    return Array.from(tbl.rows).slice(2)
      .map((e, i) => (getel(e, 2)||getel(e, 3)) && new Object({
        english: getel(e, 0),
        word_class: getel(e, 1),
        attested: getel(e, 2),
        unattested: getel(e, 3),
      }))
  } catch(err) {
    console.dir(tbl)
    console.warn(err)
    return []
  }
}

async function fetchOneList(rune) {
  let el = document.createElement('html')
  try {
    el.innerHTML = await (await fetch('https://anglish.fandom.com/wiki/English_Wordbook/' + rune)).text()
    return parseAnglishTable(el.getElementsByTagName('table')[0])
  } catch(e) {
    console.error(`Failed on rune '${rune}'`, e)
    return []
  }
}

async function fetchLists(log = console.log) {
  let lst = []
  for (let i of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
    lst.push(await fetchOneList(i))
    if (log)
      log('Finished with', i)
  }
  return lst.flat()
}

function removeParens(str) {
  if (!str) return ''
  return str.replace(/\)/g, '),').match(/\\?(\n|.)|^$/g).reduce((s, c) => {
      if (c === '(')
        s.p++
      if (!s.p)
        s.str += c
      if (c === ')')
        s.p = s.p-1 || 0
      return s
    }, { p: 0, str: '' }).str
}

function clean(s) {
  if (s) {
    return removeParens(s)
    // take out parens, word classes, other random accidents
      .replace(/(?:^|\W).*?:|[(?)]|<.*?>|\/.*?\/|\[.*?\]|".*?"|__+/g, ',')
    // use ',' as sep, & take out all whitespace between seps.
      .replace(/\s*[\n;,/.]\s*/g, ',')
      .split(',').map(s => s.trim()).filter(s => s)
  } else
    return []
}

function formatList(lst) {
  const out = {}
  for (let w of lst) {
    let { english, ...an } = w
    english = removeParens(english).replace(/,/g, '').trim()
    // for (let en of english) {
    if (out[english] === undefined)
      out[english] = { attested:[], unattested:[] }
    out[english] = {
      attested: out[english].attested.concat(clean(an.attested)),
      unattested: out[english].unattested.concat(clean(an.unattested))
    }
    // }
  }
  return out
}

function prepostfixList(lst) {
  let p = {
    re: {},
    ost: {}
  }
  for (const i in lst) {
    if (i.length > 4) { // ignore short suffixes
      if (i[0] === '-')
        p.ost[i] = lst[i]
      if (i[i.length-1] === '-')
        p.re[i] = lst[i]
    }
  }
  return p
}

const randElem = arr => arr[Math.floor(Math.random() * arr.length)]

function fitsuffix(w, p, unattestedp) {
  const build = (fix, beg, end) => Object.keys(p[fix]).map(f => f.slice(beg, end)).join('|')
  const attach = (w, infix, suffix) => suffix[0] === '-'
        ? w + infix + suffix.slice(1)
        : suffix.slice(0,-1) + infix + w
  const pick = e => {
    if (!e || (unattestedp && !e.attested)) return false
    return randElem(unattestedp ? e.attested.concat(e.unattested) : e.attested)
  }

  const re = (new RegExp('^(?:('+build('re', 0, -1)+')(-)?)?(.*?)(?:(-)?('+build('ost', 1)+'))?$'))
  let matches = re.exec(w)

  matches[2] = matches[2] || ''
  matches[3] = matches[3] || ''
  matches[4] = matches[4] || ''

  if (pick(p.ost['-'+matches[5]]))
    return attach(matches[3], matches[4], pick(p.ost['-'+matches[5]]))
  if (pick(p.re[matches[1]+'-']))
    return attach(matches[3], matches[2], pick(p.re[matches[1]+'-']))
  return false
}

function fitWord(w, l, unattestedp) {
  const capitalized = /^[A-Z]/.test(w)

  const upcase = s => (capitalized && s) ? s[0].toUpperCase() + s.slice(1) : s
  const pick = e => {
    if (!e || (unattestedp && !e.attested)) return false
    return randElem(unattestedp ? e.attested.concat(e.unattested) : e.attested)
  }
  const fix = (r, e = '') => {
    const m = r.exec(w)
    if (!m) return m
    const pickee = pick(l[m[1]+e])
    return pickee && pickee+m[2]
  }
  if (pick(l[w]))
    return pick(l[w])

  w = w.toLowerCase()
  return upcase(
    pick(l[w])
      || fix(/(.*?)((?:it)?y|[sdnr])$/)
      || fix(/(.*?)(ly|ing|e(?:st?|d|n|rs?))$/)
      || fix(/(.*?)(ly|ing|e(?:st?|d|n|rs?))$/,'e')
      || fix(/(.*?)(ie[srd])$/,'y')
      || fitsuffix(w, prepostfixList(l), unattestedp))
}

function eng2ang(word, lst, unattestedp) {
  const w = (/(\W*)(\w+)(.*)/).exec(word)
  if (!w)
    return word
  else {
    const m = fitWord(w[2], lst, unattestedp)
    return m ? w[1]+m+w[3] : word
  }
}

function anglify(input, wordlist, unattestedp) {
  return input.split('\n')
    .map(s => s.split(' ').map(word => eng2ang(word, wordlist, unattestedp)).join(' '))
    .join('\n')
    .replace(/(\w)(?:- | -)(\w)/g, '$1$2') // ere- blah/blah -lore
}
