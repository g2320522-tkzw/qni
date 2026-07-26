import {Complex} from '@qni/common'
import '../../../../quantum/paint-notation.css'
import {colors} from './colors'

type Amplitudes = {[ket: number]: Complex}

export class PaintNotationElement extends HTMLElement {
  private _qubitCount = 5

  visibleQubitCircleKets: number[] = []

  private amplitudes: Amplitudes = {}

  connectedCallback(): void {
    this.render()
  }

  get qubitCount(): number {
    return this._qubitCount
  }

  set qubitCount(value: number) {
    if (this._qubitCount === value) return

    this._qubitCount = value

    if (this.isConnected) {
      this.render()
    }
  }

  setAmplitudes(amplitudes: Amplitudes): void {
    this.amplitudes = amplitudes
    this.updatePaints()
  }

  private render(): void {
    if (this._qubitCount <= 0) {
      this.innerHTML = ''
      return
    }

    const stateCount = 2 ** this._qubitCount

    this.visibleQubitCircleKets = Array.from({length: stateCount}, (_, ket) => ket)

    this.innerHTML = `
      <div class="paint-notation">
        ${this.visibleQubitCircleKets.map(ket => this.paintElementHtml(ket)).join('')}
      </div>
    `

    this.updatePaints()

    this.dispatchEvent(
      new CustomEvent('circle-notation-visibility-change', {
        detail: this.visibleQubitCircleKets,
        bubbles: true,
      }),
    )
  }

  private paintElementHtml(ket: number): string {
    return `
    <div
      class="paint"
      data-ket="${ket}"
      data-amplitude-real="0"
      data-amplitude-imag="0"
      data-probability="0"
      data-phase="0"
    >
      <div class="paint__container">
        <div class="paint__empty"></div>
        <div class="paint__liquid"></div>

        <div class="paint__phase">
          <div class="paint__phase-arrow"></div>
        </div>

        <img class="paint__outline" src="/paint-bucket.svg" alt="" />

        <div class="paint__value">
          0.0%
        </div>
      </div>

      <div class="paint__bits">
        ${Array.from({length: this._qubitCount}, (_, index) => {
          const qubitColors = ['#ef4444', '#eab308', '#3b82f6', '#ffffff', '#000000']
          const color = qubitColors[index % qubitColors.length]

          return `
            <div
              class="paint__bit"
              data-bit-index="${index}"
              style="--qubit-color: ${color}"
            ></div>
          `
        }).join('')}
      </div>
    </div>
  `
  }

  private updatePaints(): void {
    for (const ket of this.visibleQubitCircleKets) {
      const paint = this.querySelector<HTMLElement>(`.paint[data-ket="${ket}"]`)

      if (!paint) continue

      const amplitude = this.amplitudes[ket]

      if (!amplitude) {
        this.updatePaintElement(paint, ket, new Complex(0, 0))
        continue
      }

      this.updatePaintElement(paint, ket, amplitude)
    }
  }

  private updatePaintElement(paint: HTMLElement, ket: number, amplitude: Complex): void {
    const magnitude = amplitude.abs()
    const probability = magnitude * magnitude
    const phaseRad = amplitude.phase()
    const phaseDeg = (phaseRad * 180) / Math.PI

    paint.style.setProperty('--paint-level', probability.toString())

    const hiddenPercent = (1 - probability) * 100
    paint.style.setProperty('--paint-hidden-percent', `${hiddenPercent}%`)

    paint.style.setProperty('--paint-phase', `${phaseDeg}deg`)

    const color = colors[ket % colors.length]
    paint.style.setProperty('--paint-color', color)

    paint.dataset.amplitudeReal = amplitude.real.toString()
    paint.dataset.amplitudeImag = amplitude.imag.toString()
    paint.dataset.probability = probability.toString()
    paint.dataset.phase = phaseRad.toString()

    const valueElement = paint.querySelector<HTMLElement>('.paint__value')

    if (valueElement) {
      valueElement.textContent = `${(probability * 100).toFixed(1)}%`
    }

    const binaryKet = ket.toString(2).padStart(this._qubitCount, '0')

    const bitElements = paint.querySelectorAll<HTMLElement>('.paint__bit')

    bitElements.forEach(bitElement => {
      const qubitIndex = Number(bitElement.dataset.bitIndex)

      const isOne = ((ket >> qubitIndex) & 1) === 1

      bitElement.classList.toggle('paint__bit--on', isOne)
      bitElement.classList.toggle('paint__bit--off', !isOne)
    })

    const EPSILON = 1e-10

    paint.classList.toggle('paint--empty', probability <= EPSILON)
    paint.classList.toggle('paint--phase-hidden', probability <= EPSILON)
  }
}

if (!customElements.get('paint-notation')) {
  customElements.define('paint-notation', PaintNotationElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'paint-notation': PaintNotationElement
  }
}
