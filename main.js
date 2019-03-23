const keyboardKeymap = { '0': 27, '2': 13, '3': 15, '5': 18, '6': 20, '7': 22,
  '9': 25, '\\': -1, 'z': 0, 'x': 2, 'c': 4, 'v': 5, 'b': 7, 'n': 9, 'm': 11,
  ',': 12, '.': 14, '/': 16, 'q': 12, 'w': 14, 'e': 16, 'r': 17, 't': 19,
  'y': 21, 'u': 23, 'i': 24, 'o': 26, 'p': 28, '[': 29, ']': 31, 's': 1,
  'd': 3, 'g': 6, 'h': 8, 'j': 10, 'l': 13, ';': 15, '=': 30 }
const midiToFrequency = n => 13.75 * Math.pow(2, (n - 9) / 12)

function getIndex (el) {
  return Array.prototype.indexOf.call(el.parentNode.childNodes, el)
}

class Song {
  constructor (target, songData) {
    this.context = target.context ? target.context : target
    this.target = target.destination ? target.destination : target
    this.analysers = []
    this.instruments = []
    for (let i = 0; i < 4; i++) {
      this.analysers.push(new AnalyserNode(this.context))
      this.analysers[i].connect(this.target)
    }
    const names = ['square', 'square', 'triangle']
    for (let i = 0; i < 3; i++) {
      this.instruments.push(new Instrument(this.analysers[i], names[i]))
    }
    this.instruments.push(new NoiseInstrument(this.analysers[3]))

    this.patterns = []
    this.playhead = (ps => {
      let pattern = 0, row = 0, patterns = ps
      return {
        get pattern () {
          return pattern
        },
        set pattern (p) {
          patterns[pattern].rows[row].elem.classList.remove('current')
          pattern = p
          patterns[p].rows[row].elem.classList.add('current')
        },
        get row () {
          return row
        },
        set row (r) {
          patterns[pattern].rows[row].elem.classList.remove('current')
          row = r
          patterns[pattern].rows[r].elem.classList.add('current')
        }
      }
    })(this.patterns)
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
      for (let d of songData.notes) {
        this.addPattern(d)
      }
      this.title.textContent = songData.title
    } else {
      this.addPattern()
    }
    this.patterns[0].rows[0].elem.classList.add('current')
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
      this.container.insertBefore(pattern.elem, previousSibling.nextSibling)
    } else {
      this.container.appendChild(pattern.elem)
    }
  }
  play () {
    this.clearValue = window.setInterval(this.step.bind(this), 33)
  }
  pause () {
    if (this.clearValue) {
      window.clearInterval(this.clearValue)
      this.clearValue = undefined
    }
  }
  reset () {
    this.playhead.pattern = 0
    this.playhead.row = 0
  }
  step () {
    let pattern = this.patterns[this.playhead.pattern],
      row = pattern.rows[this.playhead.row]
    row.play(this.instruments)
    if(row.elem.nextSibling) {
      this.playhead.row += 1
    } else {
      this.playhead.row = 0
      if (pattern.elem.nextSibling) {
        this.playhead.pattern += 1
      } else {
        this.playhead.pattern = 0
      }
    }
  }
  stop () {
    this.pause()
    for (let i of this.instruments) {
      i.stop()
    }
  }
  toData () {
    return this.patterns.map(pattern => pattern.toData())
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
    this.container.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        let prevCell = this.elem.querySelector('.current')
        let nextCell = ev.key === 'ArrowLeft' ?
          prevCell.previousSibling : prevCell.nextSibling
        if (nextCell) {
          nextCell.focus()
        }
        ev.preventDefault()
      }
    })

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
    lengthInputDiv.classList.add('tag')
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

    this.container.addEventListener('focusin', ev => {
      for (let el of Array.from(document.querySelectorAll('.cell.current:not(:focus)'))) {
        el.classList.remove('current')
      }
    })
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
    const isOnlyChild = this.elem.previousSibling === this.elem.nextSibling
    song.patterns.splice(song.patterns.indexOf(this))
    this.elem.parentNode.removeChild(this.elem)
    if (isOnlyChild) {
      song.addPattern()
    }
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
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        let prevCell = this.elem.querySelector('.current')
        let nextCell = ev.key === 'ArrowLeft' ?
          prevCell.previousSibling : prevCell.nextSibling
        if (nextCell) {
          nextCell.focus()
        }
        ev.preventDefault()
      }
    })
  }
  toData () {
    return this.cells.map(cell => cell.toData())
  }
  get isEmpty () {
    return this.toData().every(x => x === '')
  }
  play (instruments) {
    for (let i = 0; i < instruments.length; i++) {
      this.cells[i].play(instruments[i])
    }
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
            let note = keyboardKeymap[ev.key.toLowerCase()]
            note += document.getElementById('octave').value * 12
            if (note > 0) {
              this.value = note
            }
          } else return // avoid preventDefault() for unhandled input
      }
      ev.preventDefault()
    })
    this.elem.addEventListener('focus', ev => {
      this.elem.classList.add('current')
    })
    this.elem.addEventListener('blur', ev => {
      if (ev.relatedTarget && ev.relatedTarget.classList.contains('cell')) {
        this.elem.classList.remove('current')
      }
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
  play (instrument) {
    if (this.value > 0) { instrument.play(this.value) }
    else if (this.value === '0') { instrument.stop() }
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

class Instrument {
  constructor (target, type) {
    this.type = type
    this.context = target.context ? target.context : target
    this.target = target.destination ? target.destination : target
  }
  play (pitch, time) {
    if (this.note) this.stop(time)
    this.note = new OscillatorNote(this.target,
      { attack: 0.01, sustain: 0.4, triggerTime: time },
      [{ frequency: midiToFrequency(pitch), type: this.type }])
  }
  release () {
    if (this.note) this.note.releaseNote(time)
    this.note = undefined
  }
  stop (time) {
    if (this.note) this.note.stopNote(time)
    this.note = undefined
  }
}

class NoiseInstrument {
  constructor (target = audio.destination) {
    this.target = target
    this.context = target.context ? target.context : target
    this.buffer = this.context.createBuffer(1,
      this.context.sampleRate * 4, this.context.sampleRate)
    let data = this.buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    this.filter = new BiquadFilterNode(this.context, { type: 'bandpass' })
    this.filter.connect(target)
  }
  play (pitch) {
    if (this.source) this.source.stop()
    this.filter.frequency.value = midiToFrequency(pitch)
    this.source = this.context.createBufferSource()
    this.source.buffer = this.buffer
    this.source.connect(this.filter)
    this.source.start()
  }
  stop () {
    if (this.source) this.source.stop()
    this.source = undefined
  }
}

// Initialization

const audio = new (window.AudioContext || window.webkitAudioContext)(),
  masterGain = new GainNode(audio, { gain: 0.5 })
masterGain.connect(audio.destination)
let song = new Song(masterGain, {
    title: "MY SONG",
    notes: [
    [[62, 65, 69, 60],
    ['', '', '', '0'],
    ['', '', '', 60],
    ['', '', '', '0'],
    ['0', '0', '0', 60],
    ['', '', '', '0'],
    ['', '', '', 60],
    ['', '', '', '0']]
  ]})


// Event handlers

document.getElementById('masterGain').addEventListener('change', e => {
  masterGain.gain.value = e.target.value
})
document.getElementById('masterGain').addEventListener('dblclick', e => {
  masterGain.gain.value = 0.5
  e.target.value = 0.5
})
