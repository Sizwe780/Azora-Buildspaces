/**
 * Semantic Knowledge Engine - Azora-Buildspaces Phase 2
 * Integrates LlamaIndex for RAG and uses SimpleVectorStore as a robust fallback.
 * NOTE: Provider-specific stores (Chroma) require additional @llamaindex/chroma package in 0.12.x.
 */

import { 
  Document, 
  VectorStoreIndex, 
  Settings,
  storageContextFromDefaults,
  MetadataMode,
  SimpleVectorStore
} from "llamaindex";
import * as path from "path";

export interface SemanticChunk {
  id: string;
  text: string;
  metadata: {
    path: string;
    fileName: string;
    type: string;
    language: string;
    lineStart: number;
    lineEnd: number;
  };
}

export class SemanticIndexer {
  private index: VectorStoreIndex | null = null;
  private vectorStore: SimpleVectorStore | null = null;

  constructor(private collectionName: string = "azora-workspace") {}

  /**
   * Initialize the Semantic Index with SimpleVectorStore (file-based)
   */
  async initialize() {
    try {
      // Use SimpleVectorStore for maximum compatibility in current environment
      this.vectorStore = new SimpleVectorStore();

      const storageContext = await storageContextFromDefaults({
        vectorStore: this.vectorStore,
      });

      // We initialize an empty index first or load existing
      this.index = await VectorStoreIndex.fromDocuments([], {
        storageContext,
      });

      console.log(`[SemanticIndexer] Initialized in-memory collection: ${this.collectionName}`);
    } catch (error) {
      console.error("[SemanticIndexer] Initialization failed:", error);
      // Absolute fallback
      this.index = await VectorStoreIndex.fromDocuments([]);
    }
  }

  /**
   * Index a specific file into the vector store
   */
  async indexFile(filePath: string, content: string) {
    if (!this.index) await this.initialize();

    const doc = new Document({
      text: content,
      metadata: {
        path: filePath,
        fileName: path.basename(filePath),
        extension: path.extname(filePath),
      },
    });

    await this.index!.insertNodes([doc]);
    console.log(`[SemanticIndexer] Indexed: ${filePath}`);
  }

  /**
   * Perform a semantic search across the codebase
   */
  async search(query: string, limit: number = 5) {
    if (!this.index) await this.initialize();

    const retriever = this.index!.asRetriever();
    retriever.similarityTopK = limit;

    const results = await retriever.retrieve({ query });
    
    return results.map(res => ({
      score: res.score,
      text: res.node.getContent(MetadataMode.ALL),
      metadata: res.node.metadata
    }));
  }

  /**
   * Natural Language Query (RAG)
   */
  async query(query: string) {
    if (!this.index) await this.initialize();

    const queryEngine = this.index!.asQueryEngine();
    const response = await queryEngine.query({
        query
    });

    return response.toString();
  }
}
