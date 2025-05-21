import { execSync } from "child_process";
import path from "path";
import fs from "fs";

interface RAGChunk {
  type: string;
  name: string;
  code: string;
  language: string;
  filePath: string;
  startLine: number;
  endLine: number;
  calls?: string[];
  imports?: string[];
  docstring?: string;
  embedding?: number[];
}

export function chunkElmFile(filePath: string, logger: { log: (message: string) => void } = { log: () => {} }): RAGChunk[] {
  try {
    logger.log(`Processing Elm file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Elm file does not exist: ${filePath}`);
    }

    // Get the directory where this script is located
    const scriptDir = __dirname;
    const scriptPath = path.join(scriptDir, "elm_ast_parser.py");
    logger.log(`Using Elm parser script: ${scriptPath}`);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Elm parser script not found: ${scriptPath}`);
    }

    logger.log('Executing Elm parser...');
    const result = execSync(`python3 "${scriptPath}" "${filePath}"`, {
      encoding: "utf-8",
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    logger.log('Parsing JSON result...');
    const rawChunks = JSON.parse(result);
    
    if (!Array.isArray(rawChunks)) {
      throw new Error(`Expected array of chunks, got ${typeof rawChunks}`);
    }

    // Transform raw chunks into RAG format
    const ragChunks: RAGChunk[] = rawChunks.map((chunk: any) => {
      // Extract function calls and imports from the code
      const calls = extractFunctionCalls(chunk.code);
      const imports = extractImports(chunk.code);
      const docstring = extractDocstring(chunk.code);

      return {
        type: chunk.type || 'function', // Default to function if not specified
        name: chunk.name || 'anonymous',
        code: chunk.code,
        language: 'elm',
        filePath: filePath,
        startLine: chunk.startLine || 0,
        endLine: chunk.endLine || 0,
        calls,
        imports,
        docstring
      };
    });
    
    logger.log(`Found ${ragChunks.length} chunks in Elm file`);
    console.log('RAG Chunks:', JSON.stringify(ragChunks, null, 2));
    return ragChunks;
  } catch (error) {
    logger.log(`Error in chunkElmFile for ${filePath}: ${error}`);
    if (error instanceof Error) {
      logger.log(`Error stack: ${error.stack}`);
    }
    throw error;
  }
}

function extractFunctionCalls(code: string): string[] {
  // Basic regex to find function calls
  // This is a simple implementation and might need to be enhanced
  const functionCallRegex = /\b([a-zA-Z][a-zA-Z0-9_]*)\s*\(/g;
  const calls = new Set<string>();
  let match;
  
  while ((match = functionCallRegex.exec(code)) !== null) {
    calls.add(match[1]);
  }
  
  return Array.from(calls);
}

function extractImports(code: string): string[] {
  // Extract module imports
  const importRegex = /import\s+([A-Z][a-zA-Z0-9_.]*)/g;
  const imports = new Set<string>();
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    imports.add(match[1]);
  }
  
  return Array.from(imports);
}

function extractDocstring(code: string): string | undefined {
  // Extract documentation comments
  const docRegex = /{-|(?:^|\n)\s*--\s*(.+)/;
  const match = code.match(docRegex);
  return match ? match[1].trim() : undefined;
}

// Test the chunkElmFile function if run directly
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide an Elm file path');
    process.exit(1);
  }
  // Resolve the file path relative to the current working directory
  const absolutePath = path.resolve(process.cwd(), filePath);
  console.log(`Testing chunkElmFile on ${absolutePath}`);
  chunkElmFile(absolutePath, { log: console.log });
} 