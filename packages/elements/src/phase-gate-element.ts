import {
  ActivateableMixin,
  AngleableMixin,
  DisableableMixin,
  DraggableMixin,
  HelpableMixin,
  HoverableMixin,
  IconableMixin,
  IfableMixin,
  MenuableMixin,
} from './mixin'
import {ControllableMixin} from './mixin/controllable'
import {SerializedPhaseGateType} from '@qni/common'
import {controller} from '@github/catalyst'
import phaseGateIcon from '../icon/phase-gate-new.svg?raw'
import {cD as connectDraggableGate, rI as renderIconGate, tA as toAngleGateJson} from './gate-element-helpers.js'

export type PhaseGateElementProps = {
  targets: number[]
  disabled?: boolean
}

@controller
export class PhaseGateElement extends MenuableMixin(
  HelpableMixin(
    IfableMixin(
      ControllableMixin(
        AngleableMixin(DraggableMixin(DisableableMixin(IconableMixin(ActivateableMixin(HoverableMixin(HTMLElement)))))),
      ),
    ),
  ),
) {
  get operationType(): typeof SerializedPhaseGateType {
    return SerializedPhaseGateType
  }

  connectedCallback(): void {
    connectDraggableGate(this)
    this.initMenu()
  }

  update(): void {
    renderIconGate(this, phaseGateIcon)
  }

  toJson(): string {
    const json = toAngleGateJson(SerializedPhaseGateType, this.angle)

    return json
  }
}
