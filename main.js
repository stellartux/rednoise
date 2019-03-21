const keyboardKeymap = {
  '\\': 59, z: 60, x: 62, c: 64, v: 65, b: 67, n: 69, m: 71, ',': 72, '.': 74,
  '/': 76, q: 72, w: 74, e: 76, r: 77, t: 79, y: 81, u: 83, i: 84, o: 86,
  p: 88, '[': 89, ']': 91, s: 61, d: 63, g: 66, h: 68, j: 70, l: 73, ';': 75,
  2: 73, 3: 75, 5: 78, 6: 80, 7: 82, 9: 85, 0: 87, '=': 90
}

class Song {
  constructor (songData) {
    this.patterns = []
    this.elem = document.getElementById('song')
    while (this.elem.lastChild) {
      this.elem.removeChild(this.elem.lastChild)
    }
    this.title = document.createElement('div')
    this.title.classList.add('songtitle')
    this.title.textContent = 'NEW SONG'
    this.title.setAttribute('contenteditable', true)
    this.elem.appendChild(this.title)
    this.container = document.createElement('div')
    this.container.classList.add('songcontainer')
    this.elem.appendChild(this.container)
    if (songData) {
      for (let d of songData) {
        this.addPattern(d)
      }
      this.title.textContent = songData.title
    } else {
      this.addPattern()
    }
    this.addPatternButton = document.createElement('button')
    this.addPatternButton.classList.add('addpatternbutton')
    this.addPatternButton.textContent = 'CREATE NEW PATTERN'
    this.addPatternButton.addEventListener('click', () => this.addPattern())
    this.elem.appendChild(this.addPatternButton)
  }
  addPattern (data, previousSibling) {
    let pattern = new Pattern(data)
    this.patterns.push(pattern)
    if (previousSibling) {
      console.log(previousSibling, previousSibling.nextSibling)
      this.container.insertBefore(pattern.elem, previousSibling.nextSibling)
    } else {
      this.container.appendChild(pattern.elem)
    }
  }

}

class Pattern {
  constructor (
    loadData = [
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', '']
    ]
  ) {
    this.elem = document.createElement('div')
    this.elem.classList.add('patterncontainer')

    this.patternheader = document.createElement('div')
    this.patternheader.classList.add('patternheader')
    this.elem.appendChild(this.patternheader)

    let el = document.createElement('button')
    el.addEventListener('click', () => this.minimize())
    el.textContent = '—'
    this.patternheader.appendChild(el)

    el = document.createElement('button')
    el.addEventListener('click', () => this.duplicate())
    el.textContent = '◫'
    this.patternheader.appendChild(el)

    el = document.createElement('button')
    el.addEventListener('click', () => this.remove())
    el.textContent = 'X'
    this.patternheader.appendChild(el)

    this.patternbody = document.createElement('div')
    this.patternbody.classList.add('patternbody')
    this.container = document.createElement('div')
    this.container.classList.add('pattern')
    this.elem.appendChild(this.patternbody)
    this.patternbody.appendChild(this.container)

    this.rows = []
    for (let d of loadData) {
      let row = new Row(d)
      this.rows.push(row)
      this.container.appendChild(row.elem)
    }

    this.options = document.createElement('div')
    this.options.classList.add('patternoptions')
    this.patternbody.appendChild(this.options)

    let lengthInputDiv = document.createElement('div')
    lengthInputDiv.classList.add('patternoptionkey')
    lengthInputDiv.textContent = 'L'
    this.options.appendChild(lengthInputDiv)

    let lengthInput = document.createElement('input')
    lengthInput.setAttribute('type', 'number')
    lengthInput.setAttribute('min', '1')
    lengthInput.setAttribute('max', '128')
    lengthInput.setAttribute('step', '1')
    lengthInput.setAttribute('value', this.length)
    lengthInput.addEventListener('input', ev => {
      this.length = ev.target.value
    })
    lengthInputDiv.appendChild(lengthInput)
  }
  get length () {
    return this.rows.length
  }
  set length (length) {
    if (length === this.rows.length) {
      this.rows.length = length
    } else if (length < this.rows.length) {
      while (length < this.rows.length) {
        this.container.removeChild(this.rows[this.rows.length - 1].elem)
        this.rows.length--
      }
    } else {
      for (let i = this.rows.length; i < length; i++) {
        this.rows.push(new Row())
        this.container.appendChild(this.rows[i].elem)
      }
    }
  }
  minimize () {
    this.patternbody.classList.toggle('minimized')
  }
  duplicate () {
    song.addPattern(this.toData(), this.elem)
  }
  remove () {
    song.patterns.splice(song.patterns.indexOf(this))
    this.elem.parentNode.removeChild(this.elem)
  }
  /** Get the values of all child cells as an array */
  toData () {
    return this.rows.map(row => row.toData())
  }
}

class Row {
  constructor (cellData = ['', '', '', '']) {
    this.elem = document.createElement('div')
    this.elem.classList.add('row')
    this.cells = []
    for (let c of cellData) {
      let cell = new Cell(c)
      this.cells.push(cell)
      this.elem.appendChild(cell.elem)
    }
    this.elem.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowLeft') {
        console.log(ev)
      }
    })
  }
  toData () {
    return this.cells.map(cell => cell.toData())
  }
  get isEmpty () {
    return this.toData().every(x => x === '')
  }
}

class Cell {
  constructor (value = '') {
    this.elem = document.createElement('div')
    this.elem.classList.add('cell')
    this.elem.setAttribute('tabIndex', -1)
    this.elem.addEventListener('keydown', ev => {
      switch (ev.key) {
        case 'CapsLock':
          this.value = '0'
          break
        case 'Backspace':
        case 'Delete':
          this.value = ''
          break
        default:
          if (ev.key.toLowerCase() in keyboardKeymap) {
            this.value = keyboardKeymap[ev.key.toLowerCase()]
          } else return // avoid preventDefault() for unhandled input
      }
      ev.preventDefault()
    })
    this.value = value
  }
  get value () {
    return this._value
  }
  set value (v) {
    this._value = v
    this.elem.textContent = this.toString()
  }
  static get noteMap () {
    return ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-']
  }
  toString () {
    switch (this.value) {
      case '':
        return '---'
      case '0':
        return 'OFF'
      default:
        return Cell.noteMap[this.value % 12] + Math.floor(this.value / 12)
    }
  }
  toData () {
    return '' + this.value
  }
}
let song = new Song()
