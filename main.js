const keyboardKeymap = { '0': 27, '2': 13, '3': 15, '5': 18, '6': 20, '7': 22,
  '9': 25, '\\': -1, 'z': 0, 'x': 2, 'c': 4, 'v': 5, 'b': 7, 'n': 9, 'm': 11,
  ',': 12, '.': 14, '/': 16, 'q': 12, 'w': 14, 'e': 16, 'r': 17, 't': 19,
  'y': 21, 'u': 23, 'i': 24, 'o': 26, 'p': 28, '[': 29, ']': 31, 's': 1,
  'd': 3, 'g': 6, 'h': 8, 'j': 10, 'l': 13, ';': 15, '=': 30 }
const midiToFrequency = n => 13.75 * 2 ** ((n - 9) / 12)

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

    this.elem = document.getElementById('song')
    this.elem.owner = this
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
      if (songData.data) {

      } else if (songData.notes) {
        for (let d of songData.notes) {
          this.addPattern(d)
        }
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
    this._pattern = 0
    this._row = 0

    this.container.addEventListener('keydown', ev => {
      if ((ev.key === 'ArrowUp' && ev.ctrlKey) || ev.key === 'PageUp') {
        this.focus(-1)
        ev.preventDefault()
      } else if ((ev.key === 'ArrowDown' && ev.ctrlKey) || ev.key === 'PageDown') {
        this.focus(1)
        ev.preventDefault()
      } else if (ev.key === 'Space' && ev.ctrlKey) {
        this.pause()
        this.stop()
        this.reset()
      } else if (ev.code === 'Space') {
        if (this.isPlaying) {
          this.pause()
          this.stop()
        } else {
          this.play()
        }
      } else if (ev.key === 'Enter' && ev.target.localName !== 'input') {
        this.pause()
        this.step()
      }
    })
  }
  get playheadPattern () {
    return this._pattern
  }
  set playheadPattern (p) {
    if (document.querySelector('.row.current')) {
      document.querySelector('.row.current').classList.remove('current')
    }
    this._pattern = p
    this.patterns[p].rows[this._row].elem.classList.add('current')
  }
  get playheadRow () {
    return this._row
  }
  set playheadRow (r) {
    if (document.querySelector('.row.current')) {
      document.querySelector('.row.current').classList.remove('current')
    }
    this._row = r
    this.patterns[this._pattern].rows[r].elem.classList.add('current')
  }
  get focusFollowsPlayhead () {
    return document.getElementById('focusPlayhead').checked
  }
  addPattern (data, previousSibling) {
    let pattern = new Pattern(data, this)
    if (previousSibling) {
      this.container.insertBefore(pattern.elem, previousSibling.nextSibling)
    } else {
      this.container.appendChild(pattern.elem)
    }
  }
  get patterns () {
    return Array.from(document.querySelectorAll('.patterncontainer')).map(p => p.owner)
  }
  get isPlaying () {
    return this.clearValue !== undefined
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
    this.playheadRow = 0
    this.playheadPattern = 0
    if (this.focusFollowsPlayhead) {
      this.patterns[0].rows[0].cells[0].elem.focus()
    }
  }
  step () {
    let pattern = this.patterns[this.playheadPattern]
    let row = pattern.rows[this.playheadRow]
    row.play(this.instruments)
    this.playheadRow = (this.playheadRow + 1) % pattern.rows.length
    if (this.playheadRow === 0) {
      this.playheadPattern = (this.playheadPattern + 1) % this.patterns.length
    }
    if (this.focusFollowsPlayhead && this.elem.querySelector('.cell.current')) {
      let cellIndex = this.elem.querySelector('.cell.current').owner.index
      this.patterns[this.playheadPattern].rows[this.playheadRow].focus(cellIndex)
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
  toExacode () {
    let data = this.toData().reduce((acc, val) => acc.concat(val), []),
      isEmpty = rowData => rowData.every(d => d === ''),
      el = document.getElementById('exacode'),
      instructions = [],
      waitLength = 1,
      code = ''
    if (!document.getElementById('loopforever').checked) {
      data.push(['0', '0', '0', '0'])
    }
    if (isEmpty(data[0])) instructions.push('0')
    for (let row of data) {
      if (isEmpty(row)) {
        waitLength += 1
      } else {
        if (row !== data[0]) {
          instructions.push(waitLength + '')
          waitLength = 1
        }
        for (let i = 0; i < row.length; i++) {
          if (row[i] !== '') {
            instructions.push(i + 1 + '')
            instructions.push(row[i])
          }
        }
        instructions.push('0')
      }
    }
    instructions.push(waitLength + '')

    while (instructions.length) {
      let charLength = 5,
        instSet = ['DATA']
      while ((charLength + instructions[0].length + 1) <= 24) {
        charLength += instructions[0].length + 1
        instSet.push(instructions.shift())
        if (instructions.length === 0) {
          break
        }
      }
      code = code.concat(instSet.join(' ')).concat('\n')
    }
    code += this.basecode(document.getElementById('loopforever').checked)
    el.value = code
  }
  basecode (loop = true) {
    return 'LINK 801\nMARK NEWNOTE\n' +
      (loop ? 'TEST EOF\nFJMP CONTINUE\nSEEK -9999\nMARK CONTINUE\n' : '') +
      'COPY F T\nFJMP WAITLOOP\nSUBI T 1 T\nFJMP SQR0\nSUBI T 1 T\nFJMP SQR1\nSUBI T 1 T\nFJMP TRI0\nMARK NSE0\nCOPY F #NSE0\nJUMP NEWNOTE\nMARK TRI0\nCOPY F #TRI0\nJUMP NEWNOTE\nMARK SQR1\nCOPY F #SQR1\nJUMP NEWNOTE\nMARK SQR0\nCOPY F #SQR0\nJUMP NEWNOTE\nMARK WAITLOOP\nCOPY F T\nMARK KEEPWAITING\nSUBI T 1 T\nWAIT\nTJMP KEEPWAITING\nJUMP NEWNOTE'
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
    ], parent
  ) {
    this.parent = parent
    this.elem = document.createElement('div')
    this.elem.owner = this
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
      if (ev.key === 'ArrowUp') {
        this.focus(-1)
        ev.preventDefault()
      } else if (ev.key === 'ArrowDown') {
        this.focus(1)
        ev.preventDefault()
      }
    })

    for (let d of loadData) {
      this.container.appendChild((new Row(d, this)).elem)
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
    lengthInput.addEventListener('change', ev => {
      this.length = ev.target.value
    })
    lengthInputDiv.appendChild(lengthInput)

    this.container.addEventListener('focusin', ev => {
      for (let el of Array.from(document.querySelectorAll('.cell.current:not(:focus)'))) {
        el.classList.remove('current')
      }
    })
  }
  focus (newIndex) {
    let currentRow = document.querySelector('.cell.current').owner.parent
    let rowIndex = (currentRow.index + newIndex + this.length) % this.length
    let cellIndex = document.querySelector('.cell.current').owner.index
    this.rows[rowIndex].cells[cellIndex].elem.focus()
  }
  get index () {
    return Array.prototype.indexOf.call(this.elem.parentNode.childNodes, this.elem)
  }
  get rows () {
    return Array.from(this.elem.querySelectorAll('.row')).map(r => r.owner)
  }
  get length () {
    return this.rows.length
  }
  set length (length) {
    while (length < this.rows.length) {
      this.container.removeChild(this.container.lastChild)
    }
    while (length > this.rows.length) {
      this.container.appendChild((new Row(undefined, this)).elem)
    }
  }
  minimize () {
    this.patternbody.classList.toggle('minimized')
  }
  duplicate () {
    song.addPattern(this.toData(), this.elem)
  }
  remove () {
    if (this.elem.querySelector('.current')) {
      this.parent.playheadRow = 0
      this.parent.playheadPattern = 0
    }
    const isOnlyChild = this.elem.previousSibling === this.elem.nextSibling
    song.patterns.splice(song.patterns.indexOf(this))
    this.elem.parentNode.removeChild(this.elem)
    if (isOnlyChild) {
      song.addPattern()
      this.parent.playheadRow = 0
      this.parent.playheadPattern = 0
    }
  }
  /** Get the values of all child cells as an array */
  toData () {
    return this.rows.map(row => row.toData())
  }
}

class Row {
  constructor (cellData = ['', '', '', ''], parent) {
    this.parent = parent
    this.elem = document.createElement('div')
    this.elem.owner = this
    this.elem.classList.add('row')
    for (let c of cellData) {
      this.elem.appendChild((new Cell(c, this)).elem)
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
  get cells () {
    return Array.from(this.elem.querySelectorAll('.cell')).map(c => c.owner)
  }
  focus (index) {
    this.cells[index].elem.focus()
  }
  toData () {
    return this.cells.map(cell => cell.toData())
  }
  get index () {
    return Array.prototype.indexOf.call(this.elem.parentNode.children, this.elem)
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

/** A single note value and its UI
* @param {string|number} value The exacode of the note value represented
* @param {Row} parent The Row which this Cell belongs to
*/
class Cell {
  constructor (value = '', parent) {
    this.parent = parent
    this.song = parent.parent.parent
    this.elem = document.createElement('div')
    this.elem.owner = this
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
      if (this.song.focusFollowsPlayhead) {
        this.song.playheadPattern = this.parent.parent.index
        this.song.playheadRow = this.parent.index
        this.parent.elem.classList.add('current')
      }
    })
    this.elem.addEventListener('blur', ev => {
      if (ev.relatedTarget
        && ev.relatedTarget.classList.contains('cell')
        && this.song.focusFollowsPlayhead
      ) {
        this.elem.classList.remove('current')
      }
    })
    this.value = value
  }
  get index () {
    return Array.prototype.indexOf.call(this.elem.parentElement.children, this.elem)
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
    if (this.value > 0) { instrument.play(this.value) } else if (this.value === '0') { instrument.stop() }
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
      this.context.sampleRate * 8, this.context.sampleRate)
    let data = this.buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    this.filter = new BiquadFilterNode(this.context, { type: 'bandpass' })
    this.waveshaper = new WaveShaperNode(this.context, {
      curve: Float32Array.from([1, 1, 0.3, 0, -0.3, -1, -1])
    })
    this.compressor = new DynamicsCompressorNode(this.context, {
      knee: 2,
      ratio: 20,
      release: 0.1,
      threshold: -40
    })
    this.gain = new GainNode(this.context, { gain: 2 })
    this.filter.connect(this.compressor)
      .connect(this.gain)
      .connect(this.waveshaper)
      .connect(this.target)
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

let urlparams = new URL(document.location).searchParams,
  title = urlparams.get('title'),
  data = urlparams.get('data')

var song = new Song(masterGain, urlparams.search ? {
  title: title,
  data: data
} : {
  title: 'MY SONG',
  notes: [
    [['', '', '', 38],
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
function copyExacode () {
  navigator.clipboard.writeText(document.getElementById('exacode').value)
}
