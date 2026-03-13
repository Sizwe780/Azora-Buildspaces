import { KnowledgeOcean } from './knowledge-ocean'

export const azoraPilotClient = {
  async ingest(content: string, path?: string) {
    const source = path?.trim() || 'unknown-source'
    const payload = content?.trim()
    if (!payload) {
      throw new Error('Cannot ingest empty content')
    }

    await KnowledgeOcean.getInstance().ingest(payload, source)
    return true
  }
}
