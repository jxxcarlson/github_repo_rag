import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import fs from "fs";
import { simpleGit } from 'simple-git';
import os from 'os';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import faiss from 'faiss-node';
import { createInterface } from 'readline';
import { walkAndChunkDirectory } from './chunkers/chunkerRouter';
import { CodeChunk } from './chunkers/tsChunker';

// Types
interface RepositoryConfig {
  storagePath: string;
  repoUrl: string;
}

interface EmbeddingResult {
  embeddings: number[][];
  texts: string[];
}

interface SearchResult {
  distances: number[];
  labels: number[];
}

// Default storage path
const DEFAULT_STORAGE_PATH = path.join(os.homedir(), '.github_repo_rag');

// Add this after the DEFAULT_STORAGE_PATH constant
const REPOSITORY_MAP_PATH = path.join(DEFAULT_STORAGE_PATH, 'repository_map.json');

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask user for storage path
async function askStoragePath(): Promise<string> {
  return new Promise((resolve) => {
    rl.question('Enter storage path for repository (press Enter for default): ', (answer) => {
      resolve(answer.trim() || DEFAULT_STORAGE_PATH);
    });
  });
}

// Function to clone repository
async function cloneRepository(repoUrl: string, storagePath: string): Promise<string> {
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repository';
  const repoPath = path.join(storagePath, repoName);

  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }

  const git = simpleGit();
  await git.clone(repoUrl, repoPath);
  return repoPath;
}

// Function to extract text from repository
async function extractRepositoryText(repoPath: string): Promise<string[]> {
  const chunks = await walkAndChunkDirectory(repoPath);
  return chunks.map((chunk: CodeChunk) => chunk.code);
}

// Function to create embeddings
async function createEmbeddings(texts: string[]): Promise<EmbeddingResult> {
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const embeddings: number[][] = [];

  for (const text of texts) {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    // Convert DataArray to number[]
    const embeddingArray = Array.from(output.data);
    embeddings.push(embeddingArray);
  }

  return { embeddings, texts };
}

// Function to create and save FAISS index
async function createFaissIndex(embeddings: number[][], texts: string[], indexPath: string) {
  const dimension = embeddings[0].length;
  const index = new faiss.IndexFlatL2(dimension);
  
  // Convert embeddings to Float32Array
  const float32Embeddings = embeddings.map(emb => new Float32Array(emb));
  const embeddingsArray = new Float32Array(float32Embeddings.length * dimension);
  
  float32Embeddings.forEach((emb, i) => {
    embeddingsArray.set(emb, i * dimension);
  });

  // Convert Float32Array to number[] for FAISS
  const embeddingsNumberArray = Array.from(embeddingsArray);
  index.add(embeddingsNumberArray);
  
  // Save index and texts
  const indexData = {
    dimension,
    embeddings: embeddingsNumberArray
  };
  fs.writeFileSync(indexPath, JSON.stringify(indexData));
  fs.writeFileSync(`${indexPath}.texts.json`, JSON.stringify(texts));
}

// Function to load FAISS index and search
async function searchSimilarTexts(query: string, indexPath: string, k: number = 3): Promise<string[]> {
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const queryEmbedding = await extractor(query, { pooling: 'mean', normalize: true });
  
  // Load index from file
  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  const index = new faiss.IndexFlatL2(indexData.dimension);
  index.add(indexData.embeddings);
  
  const texts = JSON.parse(fs.readFileSync(`${indexPath}.texts.json`, 'utf-8'));
  
  // Convert query embedding to number[]
  const queryArray = Array.from(queryEmbedding.data);
  
  try {
    const rawResult = index.search(queryArray, k);
    let searchResult: SearchResult;
    
    // Handle different possible result formats
    if (Array.isArray(rawResult) && rawResult.length === 2) {
      // If result is [distances, labels]
      searchResult = {
        distances: rawResult[0],
        labels: rawResult[1]
      };
    } else if (rawResult && typeof rawResult === 'object') {
      // If result is an object with distances and labels
      searchResult = {
        distances: (rawResult as any).distances || [],
        labels: (rawResult as any).labels || []
      };
    } else {
      throw new Error('Unexpected search result format');
    }
    
    if (!Array.isArray(searchResult.labels) || searchResult.labels.length === 0) {
      throw new Error('No results found');
    }
    
    // Return the most relevant texts
    return searchResult.labels.map((label: number) => texts[label]);
  } catch (error: unknown) {
    console.error('Search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Search failed: ${errorMessage}`);
  }
}

// Function to save repository mapping
async function saveRepositoryMapping(repoUrl: string, indexPath: string) {
  let repoMap: Record<string, string> = {};
  
  if (fs.existsSync(REPOSITORY_MAP_PATH)) {
    const existingData = fs.readFileSync(REPOSITORY_MAP_PATH, 'utf-8');
    repoMap = JSON.parse(existingData);
  }
  
  repoMap[repoUrl] = indexPath;
  fs.writeFileSync(REPOSITORY_MAP_PATH, JSON.stringify(repoMap, null, 2));
}

// Function to get repository mapping
function getRepositoryMapping(): Record<string, string> {
  if (!fs.existsSync(REPOSITORY_MAP_PATH)) {
    return {};
  }
  
  const data = fs.readFileSync(REPOSITORY_MAP_PATH, 'utf-8');
  return JSON.parse(data);
}

// Function to list available repositories
function listAvailableRepositories(): string[] {
  const repoMap = getRepositoryMapping();
  return Object.keys(repoMap);
}

// Function to get index path for a repository
function getIndexPathForRepository(repoUrl: string): string | null {
  const repoMap = getRepositoryMapping();
  return repoMap[repoUrl] || null;
}

// Main function to process repository
async function processRepository(config: RepositoryConfig) {
  try {
    console.log('Cloning repository...');
    const repoPath = await cloneRepository(config.repoUrl, config.storagePath);
    
    console.log('Extracting text from repository...');
    const texts = await extractRepositoryText(repoPath);
    
    console.log('Creating embeddings...');
    const { embeddings, texts: processedTexts } = await createEmbeddings(texts);
    
    console.log('Creating FAISS index...');
    const indexPath = path.join(config.storagePath, 'index.faiss');
    await createFaissIndex(embeddings, processedTexts, indexPath);
    
    // Save the repository mapping
    await saveRepositoryMapping(config.repoUrl, indexPath);
    
    console.log('Repository processing completed successfully!');
    return indexPath;
  } catch (error) {
    console.error('Error processing repository:', error);
    throw error;
  }
}

// Create server instance
const server = new McpServer({
  name: "github_repo_rag_server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Add tool for processing repository
server.tool(
  "process-repository",
  "Process a GitHub repository for question answering",
  {
    repoUrl: z.string().describe("URL of the GitHub repository"),
  },
  async ({ repoUrl }) => {
    try {
      // Create the default storage directory if it doesn't exist
      if (!fs.existsSync(DEFAULT_STORAGE_PATH)) {
        fs.mkdirSync(DEFAULT_STORAGE_PATH, { recursive: true });
      }

      // Create a unique directory for this repository
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repository';
      const repoStoragePath = path.join(DEFAULT_STORAGE_PATH, repoName);
      
      if (fs.existsSync(repoStoragePath)) {
        fs.rmSync(repoStoragePath, { recursive: true, force: true });
      }
      fs.mkdirSync(repoStoragePath, { recursive: true });

      const indexPath = await processRepository({ 
        repoUrl, 
        storagePath: repoStoragePath 
      });
      
      return {
        content: [
          {
            type: "text",
            text: `Repository processed successfully! Index stored at: ${indexPath}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error processing repository: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Add tool for asking questions
server.tool(
  "ask-question",
  "Ask a question about the processed repository",
  {
    question: z.string().describe("Question about the repository"),
    repoUrl: z.string().describe("URL of the GitHub repository to query"),
  },
  async ({ question, repoUrl }) => {
    try {
      const indexPath = getIndexPathForRepository(repoUrl);
      
      if (!indexPath) {
        return {
          content: [
            {
              type: "text",
              text: `No index found for repository: ${repoUrl}. Please process the repository first using the process-repository tool.`,
            },
          ],
        };
      }
      
      const similarTexts = await searchSimilarTexts(question, indexPath);
      
      return {
        content: [
          {
            type: "text",
            text: `Relevant context:\n${similarTexts.join('\n\n')}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching for answers: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Add a new tool to list available repositories
server.tool(
  "list-repositories",
  "List all available processed repositories",
  {},
  async () => {
    try {
      const repositories = listAvailableRepositories();
      
      if (repositories.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No repositories have been processed yet. Use the process-repository tool to add repositories.",
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: `Available repositories:\n${repositories.join('\n')}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing repositories: ${error.message}`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 