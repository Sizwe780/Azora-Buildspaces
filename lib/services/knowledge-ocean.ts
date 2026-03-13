export interface KnowledgeFragment {
    id: string
    content: string
    source: string
    relevance: number
}

export class KnowledgeOcean {
    private static instance: KnowledgeOcean
    private fragments: KnowledgeFragment[] = []
    private fragmentCounter = 0

    private constructor() { }

    public static getInstance(): KnowledgeOcean {
        if (!KnowledgeOcean.instance) {
            KnowledgeOcean.instance = new KnowledgeOcean()
        }
        return KnowledgeOcean.instance
    }

    public async query(query: string): Promise<KnowledgeFragment[]> {
        const normalizedQuery = query.trim().toLowerCase()
        if (!normalizedQuery) {
            return []
        }

        const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean)
        const ranked = this.fragments
            .map(fragment => {
                const haystack = `${fragment.content} ${fragment.source}`.toLowerCase()
                const matches = queryTerms.filter(term => haystack.includes(term)).length
                const relevance = queryTerms.length > 0 ? matches / queryTerms.length : 0
                return {
                    ...fragment,
                    relevance,
                }
            })
            .filter(fragment => fragment.relevance > 0)
            .sort((left, right) => right.relevance - left.relevance)

        return ranked.slice(0, 20)
    }

    public async ingest(content: string, source: string): Promise<void> {
        const normalizedContent = content.trim()
        const normalizedSource = source.trim()

        if (!normalizedContent || !normalizedSource) {
            throw new Error('Knowledge ingest requires non-empty content and source')
        }

        this.fragmentCounter += 1
        const fragment: KnowledgeFragment = {
            id: `DOC-${this.fragmentCounter}`,
            content: normalizedContent,
            source: normalizedSource,
            relevance: 0,
        }

        this.fragments.push(fragment)
    }
}
