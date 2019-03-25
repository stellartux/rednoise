class RedshiftScreen {
  constructor (canvas, analysers) {
    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.analysers = analysers
    this.levelData = []
    this.writeIndex = 0
    this.context.lineWidth = 2
    for (let i = 0; i < analysers.length; i++) {
      this.levelData.push(new Float32Array(this.canvas.width * 4).fill(0))
    }
    this.index = 0
    this.levelHolder = new Float32Array(this.canvas.width * 4)
    this.context.fillStyle = '#03120d'
    window.requestAnimationFrame(this.draw.bind(this))
  }
  draw () {
    this.context.beginPath()
    this.context.rect(0, 0, this.canvas.width, this.canvas.height)
    this.context.fill()
    this.getLevels()

    this.levelData.forEach((data, index) => {

      this.context.translate([0, this.canvas.width / 2 - 3, -this.canvas.width / 2 - 3, this.canvas.width / 2 - 3][index],
         [0, 0, this.canvas.height / 2, 0][index])
      for (let j = 0; j < 3; j++) {
        this.context.translate([0, 6, -3][j], 0)
        this.context.strokeStyle = ['#ad1718', '#0dbda3', '#fcf8fe'][j]
        this.context.beginPath()
        for (let i = 0; i < data.length; i += 8) {
          this.context[i ? 'lineTo' : 'moveTo'](i / 8, data[i] * 90 + 40)
        }
        this.context.stroke()
      }
    })
    this.context.resetTransform()

    this.context.resetTransform()
    window.requestAnimationFrame(this.draw.bind(this))
  }
  getLevels () {
    this.analysers.forEach((a, i) => {
      a.getFloatTimeDomainData(this.levelData[i])
    })
  }
}
