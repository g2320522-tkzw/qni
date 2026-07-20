import { Simulator } from '@qni/simulator'
import { Util } from '@qni/common'

self.addEventListener(
  'message',
  function (e) {
    const qubitCount = e.data.qubitCount
    const stepIndex = e.data.stepIndex
    const steps = e.data.steps
    const targets = e.data.targets
    const simulator = new Simulator('0'.repeat(qubitCount))

    Util.notNull(qubitCount)
    Util.notNull(stepIndex)
    Util.notNull(steps)
    Util.notNull(targets)

    if (e.data.type === 'measure') {
      const shots = e.data.shots
      const counts = {}

      Util.notNull(shots)

      for (let shot = 0; shot < shots; shot++) {
        const simulator = new Simulator('0'.repeat(qubitCount))

        steps.forEach((operations) => {
          simulator.runStep(operations)
        })

        const measuredBits = simulator.measuredBits

        const bitString = Object.keys(measuredBits)
          .map(Number)
          .sort((a, b) => a - b)
          .map((bit) => measuredBits[bit].toString())
          .join('')

        counts[bitString] = (counts[bitString] ?? 0) + 1
      }
      self.postMessage({
        type: 'measurement-finish',
        counts,
      })

      return
    }

    steps.forEach((operations, i) => {
      simulator.runStep(operations)

      self.postMessage({
        type: 'step',
        step: i,
        amplitudes:
          i === stepIndex
            ? targets.map((ket) => {
                const amp = simulator.state.amplifier(Number(ket))
                return [amp.real, amp.imag]
              })
            : [],
        blochVectors: simulator.blochVectors,
        measuredBits: simulator.measuredBits,
        flags: simulator.flags,
      })
    })

    self.postMessage({ type: 'finish' })
  },
  false
)
