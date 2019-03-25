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
  constructor (target) {
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
      curve: Float32Array.from([1, 0.8, 0.3, 0, -0.3, -0.8, -1])
    })
    this.compressor = new DynamicsCompressorNode(this.context, {
      attack: 0.18,
      knee: 0,
      ratio: 20,
      release: 0.1,
      threshold: -40
    })
    this.filter.connect(this.compressor)
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
