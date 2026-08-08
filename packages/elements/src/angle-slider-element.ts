import {Util, angleDenominator, radian as radianOf} from '@qni/common'

import {attr, controller} from '@github/catalyst'

import {createMachine, interpret} from 'xstate'

import {html, render} from '@github/jtml'

import {format as prettyFormat} from 'pretty-format'

export const isAngleSliderElement = (arg: unknown): arg is AngleSliderElement =>
  arg !== null && arg instanceof AngleSliderElement

type AngleSliderContext = Record<string, never>

type AngleSliderEvent = {type: 'SET_ANGLE'} | {type: 'SET_DENOMINATOR'} | {type: 'START_MOVE'} | {type: 'END_MOVE'}

@controller
export class AngleSliderElement extends HTMLElement {
  @attr angle = '0'
  @attr radian = 0
  @attr denominator = 16
  @attr disabled = false
  @attr debug = false

  private snapAngles: {
    [radian: number]: string
  } = {}

  private isDragging = false

  private angleSliderMachine = createMachine<AngleSliderContext, AngleSliderEvent>(
    {
      id: 'angle-slider',

      initial: 'idle',

      states: {
        idle: {
          on: {
            START_MOVE: {
              target: 'moving',
            },

            SET_ANGLE: {
              target: 'idle',

              actions: [
                'setDenominatorByAngle',
                'updateSnapAngles',
                'setRadianInAngle',
                'updateHandlePosition',
                'dispatchUpdateEvent',
              ],
            },

            SET_DENOMINATOR: {
              target: 'idle',

              actions: ['validateDenominator', 'updateSnapAngles', 'setAngleInRadian', 'updateHandlePosition'],
            },
          },
        },

        moving: {
          on: {
            SET_ANGLE: {
              target: 'moving',

              actions: ['dispatchChangeEvent'],
            },

            END_MOVE: {
              target: 'idle',

              actions: ['dispatchUpdateEvent'],
            },
          },
        },
      },
    },

    {
      actions: {
        validateDenominator: () => {
          if (!Number.isInteger(this.denominator) || this.denominator <= 0) {
            this.denominator = 16
          }
        },

        setDenominatorByAngle: (_context, event) => {
          if (event.type !== 'SET_ANGLE') {
            return
          }

          if (this.angle === '') {
            this.angle = '0'
            this.denominator = 16
            return
          }

          const denominator = angleDenominator(this.angle)

          this.denominator = Math.max(16, denominator)
        },

        setAngleInRadian: (_context, event) => {
          if (event.type !== 'SET_DENOMINATOR') {
            return
          }

          if (Object.keys(this.snapAngles).length === 0) {
            return
          }

          const [, angle] = this.findSnapAngle(this.radian)

          this.angle = angle
        },

        setRadianInAngle: (_context, event) => {
          if (event.type !== 'SET_ANGLE') {
            return
          }

          if (this.angle === '') {
            this.angle = '0'
          }

          if (Object.keys(this.snapAngles).length === 0) {
            return
          }

          const [radian] = this.findSnapAngle(radianOf(this.angle))

          this.radian = radian
        },

        updateSnapAngles: () => {
          this.updateSnapAngles()
        },

        updateHandlePosition: () => {
          this.updateHandlePosition()
        },

        dispatchChangeEvent: () => {
          this.dispatchEvent(
            new Event('angle-slider-change', {
              bubbles: true,
            }),
          )
        },

        dispatchUpdateEvent: () => {
          this.dispatchEvent(
            new Event('angle-slider-update', {
              bubbles: true,
            }),
          )
        },
      },
    },
  )

  private angleSliderService = interpret(this.angleSliderMachine)
    .onTransition(state => {
      if (this.debug) {
        console.log(`angle-slider: ${prettyFormat(state.value)}`)
      }
    })
    .start()

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return
    }

    if (newValue === null) {
      return
    }

    if (name === 'data-angle') {
      if (newValue === '') {
        this.angle = '0'
      }

      this.angleSliderService.send({
        type: 'SET_ANGLE',
      })
    }

    if (name === 'data-denominator' && this.shadowRoot !== null) {
      if (!Number.isInteger(this.denominator) || this.denominator <= 0) {
        this.denominator = 16
      }

      this.angleSliderService.send({
        type: 'SET_DENOMINATOR',
      })
    }
  }

  connectedCallback(): void {
    if (this.shadowRoot === null) {
      this.attachShadow({
        mode: 'open',
      })
    }

    if (this.angle === '') {
      this.angle = '0'
    }

    if (!Number.isInteger(this.denominator) || this.denominator <= 0) {
      this.denominator = 16
    }

    this.update()

    this.updateSnapAngles()

    const [initialRadian] = this.findSnapAngle(radianOf(this.angle))

    this.radian = initialRadian

    this.updateHandlePosition()

    this.initInteraction()
  }

  disconnectedCallback(): void {
    const dial = this.shadowRoot?.querySelector('.dial')

    if (dial instanceof HTMLElement) {
      dial.removeEventListener('pointerdown', this.handlePointerDown)
    }

    window.removeEventListener('pointermove', this.handlePointerMove)

    window.removeEventListener('pointerup', this.handlePointerUp)

    window.removeEventListener('pointercancel', this.handlePointerUp)
  }

  update(): void {
    render(
      html`
        <style>
          :host {
            display: inline-block;
            position: relative;

            width: 220px;
            height: 220px;

            touch-action: none;
          }

          .dial {
            position: relative;

            width: 100%;
            height: 100%;

            box-sizing: border-box;

            border: 2px solid #d1d5db;

            border-radius: 50%;

            background: #ffffff;

            cursor: grab;

            touch-action: none;
            user-select: none;
          }

          .dial:active {
            cursor: grabbing;
          }

          .center {
            position: absolute;

            left: 50%;
            top: 50%;

            width: 8px;
            height: 8px;

            border-radius: 50%;

            background: #6b7280;

            transform: translate(-50%, -50%);

            pointer-events: none;
          }

          .handle {
            position: absolute;

            left: var(--handle-x, 50%);

            top: var(--handle-y, 10%);

            width: 22px;
            height: 22px;

            box-sizing: border-box;

            border: 3px solid #ffffff;

            border-radius: 50%;

            background: #ff9f19;

            box-shadow: 0 1px 5px rgb(0 0 0 / 25%);

            transform: translate(-50%, -50%);

            pointer-events: none;
          }

          .label {
            position: absolute;

            color: #4b5563;

            font-size: 14px;

            line-height: 1;

            pointer-events: none;

            user-select: none;
          }

          .label-0 {
            top: 10px;
            left: 50%;

            transform: translateX(-50%);
          }

          .label-right {
            right: 10px;
            top: 50%;

            transform: translateY(-50%);
          }

          .label-bottom {
            bottom: 10px;
            left: 50%;

            transform: translateX(-50%);
          }

          .label-left {
            left: 10px;
            top: 50%;

            transform: translateY(-50%);
          }
        </style>

        <div class="dial">
          <span
            class="
              label
              label-0
            "
          >
            0
          </span>

          <span
            class="
              label
              label-right
            "
          >
            π/2
          </span>

          <span
            class="
              label
              label-bottom
            "
          >
            π
          </span>

          <span
            class="
              label
              label-left
            "
          >
            -π/2
          </span>

          <div class="center"></div>

          <div class="handle"></div>
        </div>
      `,
      this.shadowRoot!,
    )
  }

  private initInteraction(): void {
    const dial = this.shadowRoot?.querySelector('.dial')

    if (!(dial instanceof HTMLElement)) {
      console.error('angle-slider: dial not found')

      return
    }

    dial.addEventListener('pointerdown', this.handlePointerDown)
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.disabled) {
      return
    }

    event.preventDefault()

    if (!Number.isInteger(this.denominator) || this.denominator <= 0) {
      this.denominator = 16
    }

    if (Object.keys(this.snapAngles).length === 0) {
      this.updateSnapAngles()
    }

    this.isDragging = true

    window.addEventListener('pointermove', this.handlePointerMove)

    window.addEventListener('pointerup', this.handlePointerUp)

    window.addEventListener('pointercancel', this.handlePointerUp)

    this.angleSliderService.send({
      type: 'START_MOVE',
    })

    this.updateAngleFromPointer(event)
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging) {
      return
    }

    event.preventDefault()

    this.updateAngleFromPointer(event)
  }

  private readonly handlePointerUp = (): void => {
    if (!this.isDragging) {
      return
    }

    this.isDragging = false

    window.removeEventListener('pointermove', this.handlePointerMove)

    window.removeEventListener('pointerup', this.handlePointerUp)

    window.removeEventListener('pointercancel', this.handlePointerUp)

    this.angleSliderService.send({
      type: 'END_MOVE',
    })
  }

  private updateAngleFromPointer(event: PointerEvent): void {
    const dial = this.shadowRoot?.querySelector('.dial')

    if (!(dial instanceof HTMLElement)) {
      return
    }

    if (Object.keys(this.snapAngles).length === 0) {
      this.denominator = 16
      this.updateSnapAngles()
    }

    const rect = dial.getBoundingClientRect()

    const centerX = rect.left + rect.width / 2

    const centerY = rect.top + rect.height / 2

    const dx = event.clientX - centerX

    const dy = event.clientY - centerY

    const radian = Math.atan2(dx, -dy)

    const [snapRadian, angle] = this.findSnapAngle(radian)

    console.log('radian:', radian, 'snap:', snapRadian, 'angle:', angle)

    this.radian = snapRadian

    this.updateHandlePosition()

    if (this.angle !== angle) {
      this.angle = angle
    }
  }

  private updateHandlePosition(): void {
    const radius = 40

    const x = 50 + Math.sin(this.radian) * radius

    const y = 50 - Math.cos(this.radian) * radius

    this.style.setProperty('--handle-x', `${x}%`)

    this.style.setProperty('--handle-y', `${y}%`)
  }

  private updateSnapAngles(): void {
    if (!Number.isInteger(this.denominator) || this.denominator <= 0) {
      this.denominator = 16
    }

    const denominator = this.denominator

    const start = -denominator

    const end = denominator

    const numerators = new Array(end - start + 1).fill(null).map((_, index) => index + start)

    this.snapAngles = {}

    for (const numerator of numerators) {
      const radian = (numerator * Math.PI) / denominator

      if (numerator === 0) {
        this.snapAngles[radian] = '0'

        continue
      }

      if (numerator === denominator) {
        this.snapAngles[radian] = 'π'

        continue
      }

      if (numerator === -denominator) {
        this.snapAngles[radian] = '-π'

        continue
      }

      if (numerator === 1) {
        this.snapAngles[radian] = `π/${denominator}`

        continue
      }

      if (numerator === -1) {
        this.snapAngles[radian] = `-π/${denominator}`

        continue
      }

      this.snapAngles[radian] = `${numerator}π/${denominator}`
    }
  }

  private findSnapAngle(radian: number): [number, string] {
    let minDelta: number | null = null

    let snapRadian: number | null = null

    let snapAngle: string | null = null

    for (const key in this.snapAngles) {
      const candidate = parseFloat(key)

      const delta = Math.abs(candidate - radian)

      if (minDelta === null || delta < minDelta) {
        minDelta = delta

        snapRadian = candidate

        snapAngle = this.snapAngles[key]
      }
    }

    Util.notNull(snapRadian)

    Util.notNull(snapAngle)

    return [snapRadian, snapAngle]
  }
}
