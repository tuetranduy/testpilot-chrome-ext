import type { ProviderConfig, ProviderId } from './types'

export type VisionCapability = 'vision' | 'text' | 'unknown'

const OPENAI_VISION = /^(?:gpt-(?:4o|4\.1|4-turbo|5)(?:[-.]|$)|o(?:1|3|4)(?:[-.]|$))/i
const OPENAI_TEXT = /^(?:o1-(?:mini|preview)(?:-|$)|o3-mini(?:-|$)|gpt-3\.5(?:[-.]|$)|text-|davinci|babbage|.*embedding)/i
const GEMINI_VISION = /^gemini-(?:(?:1\.[5-9]|[2-9](?:\.\d+)?)|flash|pro)(?:-|$)/i
const GEMINI_TEXT = /(?:embedding|aqa)/i
const ANTHROPIC_VISION = /^claude-(?:3(?:[-.]|$)|(?:sonnet|opus|haiku)-[4-9](?:[-.]|$)|[4-9](?:[-.]|$))/i
const ANTHROPIC_TEXT = /^claude-(?:1|2)(?:[-.]|$)/i

export function getVisionCapability(providerId: ProviderId, config: ProviderConfig): VisionCapability {
  const model = config.model.trim()
  if (config.visionOverride?.model === model) return config.visionOverride.supported ? 'vision' : 'text'
  if (providerId === 'local') return 'unknown'
  if (providerId === 'openai') return OPENAI_TEXT.test(model) ? 'text' : OPENAI_VISION.test(model) ? 'vision' : 'unknown'
  if (providerId === 'gemini') return GEMINI_TEXT.test(model) ? 'text' : GEMINI_VISION.test(model) ? 'vision' : 'unknown'
  return ANTHROPIC_TEXT.test(model) ? 'text' : ANTHROPIC_VISION.test(model) ? 'vision' : 'unknown'
}

export function visionCapabilityLabel(capability: VisionCapability): string {
  if (capability === 'vision') return 'Vision'
  if (capability === 'text') return 'Text only'
  return 'Vision unknown'
}
