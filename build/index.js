#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import { simpleGit } from 'simple-git';
import os from 'os';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import faiss from 'faiss-node';
import { createInterface } from 'readline';
import { walkAndChunkDirectory } from './chunkers/chunkerRouter.js';
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
async function askStoragePath() {
    return new Promise((resolve) => {
        rl.question('Enter storage path for repository (press Enter for default): ', (answer) => {
            resolve(answer.trim() || DEFAULT_STORAGE_PATH);
        });
    });
}
// Add debug logging function that uses stderr
function debug(...args) {
    console.error(...args);
}
// Function to clone repository
async function cloneRepository(repoUrl, storagePath) {
    try {
        debug(`Starting repository clone from ${repoUrl} to ${storagePath}`);
        if (!fs.existsSync(storagePath)) {
            debug(`Creating storage directory: ${storagePath}`);
            fs.mkdirSync(storagePath, { recursive: true });
        }
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repository';
        const repoPath = path.join(storagePath, repoName);
        debug(`Repository path will be: ${repoPath}`);
        if (fs.existsSync(repoPath)) {
            debug(`Removing existing repository at: ${repoPath}`);
            fs.rmSync(repoPath, { recursive: true, force: true });
        }
        debug('Initializing git...');
        const git = simpleGit();
        debug('Starting clone...');
        await git.clone(repoUrl, repoPath);
        // Verify the clone was successful
        if (!fs.existsSync(repoPath)) {
            throw new Error(`Repository was not cloned successfully to ${repoPath}`);
        }
        const entries = fs.readdirSync(repoPath);
        if (entries.length === 0) {
            throw new Error(`Cloned repository is empty at ${repoPath}`);
        }
        debug(`Successfully cloned repository to ${repoPath}`);
        debug(`Repository contents: ${entries.join(', ')}`);
        return repoPath;
    }
    catch (error) {
        debug('Error in cloneRepository:', error);
        if (error instanceof Error) {
            debug('Error stack:', error.stack);
        }
        throw error;
    }
}
// Function to extract text from repository
async function extractRepositoryText(repoPath) {
    try {
        debug('Starting text extraction from:', repoPath);
        if (!fs.existsSync(repoPath)) {
            throw new Error(`Repository path does not exist: ${repoPath}`);
        }
        const stats = fs.statSync(repoPath);
        if (!stats.isDirectory()) {
            throw new Error(`Repository path is not a directory: ${repoPath}`);
        }
        debug('Walking and chunking directory...');
        const chunks = walkAndChunkDirectory(repoPath);
        debug(`Found ${chunks.length} chunks`);
        if (!Array.isArray(chunks)) {
            throw new Error(`Expected chunks to be an array, got ${typeof chunks}`);
        }
        debug('Processing chunks...');
        const texts = chunks.map((chunk) => {
            if (!chunk || typeof chunk.code !== 'string') {
                debug('Invalid chunk found:', JSON.stringify(chunk, null, 2));
                return '';
            }
            debug(`Valid chunk found: ${chunk.name} (${chunk.type}) from ${chunk.filePath}`);
            return chunk.code;
        }).filter(text => text.length > 0);
        debug(`Extracted ${texts.length} valid text chunks`);
        if (texts.length === 0) {
            debug('No valid text chunks were extracted. This could mean:');
            debug('1. No supported files were found in the repository');
            debug('2. The files were empty or contained no extractable content');
            debug('3. There was an error during chunking');
        }
        return texts;
    }
    catch (error) {
        debug('Error in extractRepositoryText:', error);
        if (error instanceof Error) {
            debug('Error stack:', error.stack);
        }
        throw error;
    }
}
// Function to create embeddings
async function createEmbeddings(texts, config = { provider: 'xenova' }) {
    const embeddings = [];
    const processedTexts = [];
    // Helper function to chunk text based on token limit
    const chunkText = (text, limit) => {
        if (!limit)
            return [text];
        // Simple token estimation (4 chars per token on average)
        const estimatedTokens = Math.ceil(text.length / 4);
        if (estimatedTokens <= limit)
            return [text];
        // Split into chunks of approximately equal size
        const numChunks = Math.ceil(estimatedTokens / limit);
        const chunkSize = Math.ceil(text.length / numChunks);
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize));
        }
        return chunks;
    };
    switch (config.provider) {
        case 'openai': {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OPENAI_API_KEY environment variable is required');
            const { OpenAI } = await import('openai');
            const openai = new OpenAI({ apiKey });
            for (const text of texts) {
                const chunks = chunkText(text, config.tokenLimit || 8000);
                for (const chunk of chunks) {
                    const response = await openai.embeddings.create({
                        model: config.model || 'text-embedding-3-small',
                        input: chunk,
                    });
                    embeddings.push(response.data[0].embedding);
                    processedTexts.push(chunk);
                }
            }
            break;
        }
        case 'huggingface': {
            const apiKey = process.env.HUGGINGFACE_API_KEY;
            if (!apiKey)
                throw new Error('HUGGINGFACE_API_KEY environment variable is required');
            const { HfInference } = await import('@huggingface/inference');
            const hf = new HfInference(apiKey);
            for (const text of texts) {
                const chunks = chunkText(text, config.tokenLimit || 512);
                for (const chunk of chunks) {
                    const response = await hf.featureExtraction({
                        model: config.model || 'sentence-transformers/all-MiniLM-L6-v2',
                        inputs: chunk,
                    });
                    embeddings.push(response);
                    processedTexts.push(chunk);
                }
            }
            break;
        }
        case 'xenova':
        default: {
            const extractor = await pipeline('feature-extraction', config.model || 'Xenova/all-MiniLM-L6-v2');
            for (const text of texts) {
                const chunks = chunkText(text, config.tokenLimit || 512);
                for (const chunk of chunks) {
                    const output = await extractor(chunk, { pooling: 'mean', normalize: true });
                    const embeddingArray = Array.from(output.data);
                    embeddings.push(embeddingArray);
                    processedTexts.push(chunk);
                }
            }
            break;
        }
    }
    return { embeddings, texts: processedTexts };
}
// Function to create and save FAISS index
async function createFaissIndex(embeddings, texts, indexPath) {
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
async function searchSimilarTexts(query, indexPath, k = 3) {
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
        let searchResult;
        // Handle different possible result formats
        if (Array.isArray(rawResult) && rawResult.length === 2) {
            // If result is [distances, labels]
            searchResult = {
                distances: rawResult[0],
                labels: rawResult[1]
            };
        }
        else if (rawResult && typeof rawResult === 'object') {
            // If result is an object with distances and labels
            searchResult = {
                distances: rawResult.distances || [],
                labels: rawResult.labels || []
            };
        }
        else {
            throw new Error('Unexpected search result format');
        }
        if (!Array.isArray(searchResult.labels) || searchResult.labels.length === 0) {
            throw new Error('No results found');
        }
        // Return the most relevant texts
        return searchResult.labels.map((label) => texts[label]);
    }
    catch (error) {
        debug('Search error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Search failed: ${errorMessage}`);
    }
}
// Function to save repository mapping
async function saveRepositoryMapping(repoUrl, indexPath) {
    let repoMap = {};
    if (fs.existsSync(REPOSITORY_MAP_PATH)) {
        const existingData = fs.readFileSync(REPOSITORY_MAP_PATH, 'utf-8');
        repoMap = JSON.parse(existingData);
    }
    repoMap[repoUrl] = indexPath;
    fs.writeFileSync(REPOSITORY_MAP_PATH, JSON.stringify(repoMap, null, 2));
}
// Function to get repository mapping
function getRepositoryMapping() {
    if (!fs.existsSync(REPOSITORY_MAP_PATH)) {
        return {};
    }
    const data = fs.readFileSync(REPOSITORY_MAP_PATH, 'utf-8');
    return JSON.parse(data);
}
// Function to list available repositories
function listAvailableRepositories() {
    const repoMap = getRepositoryMapping();
    return Object.keys(repoMap);
}
// Function to get index path for a repository
function getIndexPathForRepository(repoUrl) {
    const repoMap = getRepositoryMapping();
    return repoMap[repoUrl] || null;
}
// Main function to process repository
export async function processRepository(config) {
    try {
        debug('Starting repository processing...');
        debug('Config:', JSON.stringify(config, null, 2));
        debug('Cloning repository...');
        const repoPath = await cloneRepository(config.repoUrl, config.storagePath);
        debug('Repository cloned to:', repoPath);
        // List all files in the repository
        debug('Listing all files in repository...');
        const allFiles = getAllFiles(repoPath);
        debug(`Found ${allFiles.length} total files in repository`);
        debug('File types:', [...new Set(allFiles.map(f => path.extname(f)))].join(', '));
        debug('Extracting text from repository...');
        const texts = await extractRepositoryText(repoPath);
        debug(`Extracted ${texts.length} text chunks from repository`);
        if (texts.length === 0) {
            debug('No text was extracted. This could mean:');
            debug('1. No supported files were found');
            debug('2. Files were empty or contained no extractable content');
            debug('3. There was an error during chunking');
            throw new Error('No text was extracted from the repository');
        }
        debug('Creating embeddings...');
        const { embeddings, texts: processedTexts } = await createEmbeddings(texts, config.embeddingConfig);
        debug(`Created ${embeddings.length} embeddings`);
        debug('Creating FAISS index...');
        const indexPath = path.join(config.storagePath, 'index.faiss');
        await createFaissIndex(embeddings, processedTexts, indexPath);
        debug('FAISS index created at:', indexPath);
        // Save the repository mapping
        await saveRepositoryMapping(config.repoUrl, indexPath);
        debug('Repository mapping saved');
        debug('Repository processing completed successfully!');
        return indexPath;
    }
    catch (error) {
        debug('Error in processRepository:', error);
        if (error instanceof Error) {
            debug('Error stack:', error.stack);
        }
        throw error;
    }
}
// Helper function to get all files in a directory recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        }
        else {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
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
export const debugLogger = {
    messages: [],
    getLastMessages: (count) => {
        return debugLogger.messages.slice(-count);
    },
    log: (...args) => {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
        debugLogger.messages.push(message);
        console.error('[DEBUG]', ...args);
    }
};
// Add tool for processing repository
server.tool("process-repository", "Process a GitHub repository for question answering", {
    repoUrl: z.string().describe("URL of the GitHub repository"),
    embeddingProvider: z.enum(['openai', 'huggingface', 'xenova']).optional().describe("Embedding provider to use"),
    embeddingModel: z.string().optional().describe("Model to use for embeddings"),
    tokenLimit: z.number().optional().describe("Maximum number of tokens per chunk")
}, async ({ repoUrl, embeddingProvider, embeddingModel, tokenLimit }) => {
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
            storagePath: repoStoragePath,
            embeddingConfig: {
                provider: embeddingProvider || 'xenova',
                model: embeddingModel,
                tokenLimit
            }
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Repository processed successfully! Index stored at: ${indexPath}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error processing repository: ${error.message}`,
                },
            ],
        };
    }
});
// Add tool for asking questions
server.tool("ask-question", "Ask a question about the processed repository", {
    question: z.string().describe("Question about the repository"),
    repoUrl: z.string().describe("URL of the GitHub repository to query"),
}, async ({ question, repoUrl }) => {
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
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error searching for answers: ${error.message}`,
                },
            ],
        };
    }
});
// Add a new tool to list available repositories
server.tool("list-repositories", "List all available processed repositories", {}, async () => {
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
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error listing repositories: ${error.message}`,
                },
            ],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    debugLogger.log("MCP Server running on stdio");
}
main().catch((error) => {
    debugLogger.log("Fatal error in main():", error);
    process.exit(1);
});
