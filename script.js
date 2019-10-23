
var anglish_list = {}
var index

fetch('./wordbook.json')
  .then(resp => resp.json())
  .then(json => {
    index = new Fuse(json, {
      shouldSort: true,
      includeMatches: true,
      threshhold: 0.7,
      // maxPatternLength: 40,
      minMatchCharLength: 1,
      keys: [
        { name:'english', weight: 0.7 },
        { name:'attested', weight: 0.2 },
        { name:'unattested', weight: 0.1 },
      ]
    })
    anglish_list = fmtList(json)
  })
  .catch(console.error)

const tr = str => anglify(str, anglish_list)

function mark(str, beg, end, offset = 0) {
  offset = offset*13 // 13 === '<mark></mark>'.length
  beg += offset
  end += offset+1
  return str.slice(0,beg)
    +'<mark>'+str.slice(beg, end)+'</mark>'
    +str.slice(end)
}

var app = new Vue({
  el: '#app',
  data: {
    highlightp: true,
    input_text: '',
    input_search: '',
    output_search: [],
  },
  computed: {
    output_text: function() {
      return tr(this.input_text).trim()
      .replace(/``/g, '“')
      .replace(/''/g, '”')
      .replace(/`/g, '‘')
      .replace(/'/g, '’')
      .replace(/`/g, '‘')
      .replace(/<</g, '«')
      .replace(/>>/g, '»')
      .replace(/---/g, '—')
      .replace(/--/g, '–')
    },
  },
  watch: {
    input_search: function() {
      if (!this.input_search)
        this.output_search = []
      else if (index) {
        const now = this.input_search
        setTimeout(() => {
          if (now === this.input_search)
            this.output_search = index.search(this.input_search).slice(0, 10)
        }, 350)
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
        return item[key]
      const ind = match.indices[0]
      let offset = 0
      return match.indices.reduce((str, ind) => mark(str, ind[0], ind[1], offset++), match.value)
    },
  },
})
