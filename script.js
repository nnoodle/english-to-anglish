
var anglish = { list: {} }

fetch('./wordbook.json')
  .then(resp => resp.json())
  .then(json => {
    anglish.index = new Fuse(json, {
      shouldSort: true,
      includeMatches: true,
      threshhold: 0.7,
      minMatchCharLength: 1,
      keys: [
        { name:'english', weight: 0.4 },
        { name:'attested', weight: 0.3 },
        { name:'unattested', weight: 0.3 },
      ]
    })
    anglish.list = fmtList(json)
  })
  .catch(console.error)

const tr = str => anglify(str, anglish.list)

function escapeHTML(str) {
  const esc = {
    '&': '&amp;',
    '<': '&lt;',
    '"': '&quot;',
    "'": '&#39;'
  }

  const re = /[&<"']/g
  if (str && re.test(str))
    return str.replace(re, chr => esc[chr])
  return str
}

function mark(str, [beg, end], offset = 0) {
  offset = offset*13 // 13 === '<mark></mark>'.length
  beg += offset
  end += offset+1
  return str.slice(0,beg)
    +'<mark>'+str.slice(beg, end)+'</mark>'
    +str.slice(end)
}

function ligatures(str) {
  const simple = {
    // good fonts already do the common ligatures
    'AE': 'Æ',
    'Ae': 'Æ',
    'ae': 'æ',
    'OE': 'Œ',
    'Oe': 'Œ',
    'oe': 'œ',
    'st': 'ﬆ',
    'ſt': 'ﬅ',
  }

  return str
  // no lookaround in firefox yet
    .replace(/(?:^|[^ſSs])s\B/g, x => (x.length === 2 ? x[0] : '')+'ſ')
    .replace(/th\B/gi, th => th[0] === 'T' ? 'Þ' : 'þ')
    .replace(new RegExp(Object.keys(simple).join('|'), 'g'), s => simple[s])
}

var app = new Vue({
  el: '#app',
  data: {
    highlightp: true,
    ligaturep: false,
    pagination: 1,
    search_results: [],
    input_text: '',
    input_search: '',
  },
  computed: {
    output_text: function() {
      const quote = {
        '``': '“',
        "''": '”',
        '`': '‘',
        "'": '’',
        '<<': '«',
        '>>': '»',
        '---': '—',
        '--': '–',
      }
      const out = tr(this.input_text).trim()
            .replace(new RegExp(Object.keys(quote).join('|'), 'g'), s => quote[s])
      return this.ligaturep ? ligatures(out) : out
    },
    output_search: function() {
      return this.search_results.slice(0, this.pagination * 10)
    }
  },
  watch: {
    input_search: function() {
      this.pagination = 1
      if (!this.input_search)
        this.output_search = []
      else if (anglish.index) {
        const now = this.input_search
        setTimeout(() => {
          if (now === this.input_search)
            this.search_results = anglish.index.search(this.input_search)
        }, 500)
      }
    },
    highlightp: function(h) {
      Array.from(document.styleSheets[document.styleSheets.length-1].cssRules)
        .find(r => r.selectorText === 'mark').style['background-color'] = h ? 'yellow' : 'white'
    }
  },
  methods: {
    markup: function(key, item, matches) {
      const match = matches.find(m => m.key === key)
      if (!match)
        return escapeHTML(item[key])
      const ind = match.indices[0]
      let offset = 0
      return escapeHTML(match.indices
                    .reduce((str, ind) => mark(str, ind, offset++), match.value))
        .replace(/&lt;(\/)?mark/g, '<$1mark')
    },
    addSeparator: function(a, b) {
      if (a && b)
        return a+b.includes('\n') ? '\n' : ','
      return ''
    },
  },
})
