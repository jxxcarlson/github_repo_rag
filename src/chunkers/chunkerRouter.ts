import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { CodeChunk, chunkTSFile } from "./tsChunker.js";
import { chunkElmFile } from "./elmChunker.js";

// Import the debugLogger
import { debugLogger } from "../index.js";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PythonChunk {
    type: "function" | "class";
    name: string;
    code: string;
    filePath: string;
    startLine: number;
    endLine: number;
    calls: string[];
    imports: string[];
}

export function chunkPyFile(filePath: string): CodeChunk[] {
    const scriptPath = path.join(__dirname, "py_ast_parser.py");
    debugLogger.log(`Using Python parser script: ${scriptPath}`);
    
    if (!fs.existsSync(scriptPath)) {
        debugLogger.log(`Python parser script not found: ${scriptPath}`);
        return [];
    }
    
    try {
        const result = spawnSync("python3", [scriptPath, filePath]);
    
        if (result.error) {
            debugLogger.log(`Error running Python parser: ${result.error.message}`);
            return [];
        }
        if (result.stderr.length > 0) {
            debugLogger.log(`Python parser stderr: ${result.stderr.toString()}`);
            return [];
        }
    
        const pythonChunks: PythonChunk[] = JSON.parse(result.stdout.toString());
        debugLogger.log(`Found ${pythonChunks.length} Python chunks`);
        
        // Convert Python chunks to CodeChunks
        return pythonChunks.map(chunk => ({
            type: chunk.type,
            name: chunk.name,
            code: chunk.code,
            filePath: chunk.filePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            language: "python",
            calls: chunk.calls,
            imports: chunk.imports
        }));
    } catch (error) {
        debugLogger.log(`Error processing Python file: ${error}`);
        return [];
    }
}
  
  
export function chunkFileByExtension(filePath: string): CodeChunk[] {
    try {
      debugLogger.log(`Processing file: ${filePath}`);
      const ext = path.extname(filePath);
      debugLogger.log(`File extension: ${ext}`);
      
      if (!fs.existsSync(filePath)) {
        debugLogger.log(`File does not exist: ${filePath}`);
        return [];
      }
      
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        debugLogger.log(`Path is not a file: ${filePath}`);
        return [];
      }
      
      debugLogger.log(`File size: ${stats.size} bytes`);
      
      let chunks: CodeChunk[] = [];
      if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
        debugLogger.log('Processing TypeScript/JavaScript file');
        chunks = chunkTSFile(filePath);
      } else if (ext === ".py") {
        debugLogger.log('Processing Python file');
        chunks = chunkPyFile(filePath);
      } else if (ext === ".elm") {
        debugLogger.log('Processing Elm file');
        chunks = chunkElmFile(filePath);
      } else {
        debugLogger.log(`Unsupported file type: ${ext}`);
        return [];
      }
      
      if (!Array.isArray(chunks)) {
        debugLogger.log(`Invalid chunks type: ${typeof chunks}`);
        return [];
      }
      
      debugLogger.log(`Generated ${chunks.length} chunks for ${filePath}`);
      if (chunks.length === 0) {
        debugLogger.log('No chunks were generated from the file');
      } else {
        debugLogger.log('Chunk types:', chunks.map(c => `${c.type}:${c.name}`).join(', '));
      }
      return chunks;
    } catch (error) {
      debugLogger.log(`Error in chunkFileByExtension for ${filePath}:`, error);
      return [];
    }
  }
  
export function walkAndChunkDirectory(dirPath: string): CodeChunk[] {
    try {
      debugLogger.log(`Starting to walk directory: ${dirPath}`);
      
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory does not exist: ${dirPath}`);
      }

      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${dirPath}`);
      }

      let chunks: CodeChunk[] = [];
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      debugLogger.log(`Found ${entries.length} entries in directory: ${dirPath}`);
      debugLogger.log('Entries:', entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n'));
      
      if (entries.length === 0) {
        debugLogger.log(`Directory is empty: ${dirPath}`);
        return chunks;
      }

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        try {
          if (entry.isDirectory()) {
            debugLogger.log(`Processing directory: ${fullPath}`);
            const subChunks = walkAndChunkDirectory(fullPath);
            if (subChunks && subChunks.length > 0) {
              chunks = chunks.concat(subChunks);
              debugLogger.log(`Added ${subChunks.length} chunks from directory ${fullPath}`);
            }
          } else if ([".ts", ".tsx", ".js", ".jsx", ".py", ".elm"].includes(path.extname(fullPath))) {
            debugLogger.log(`Processing supported file: ${fullPath}`);
            try {
              const fileChunks = chunkFileByExtension(fullPath);
              if (fileChunks && Array.isArray(fileChunks)) {
                if (fileChunks.length > 0) {
                  chunks = chunks.concat(fileChunks);
                  debugLogger.log(`Added ${fileChunks.length} chunks from ${fullPath}`);
                } else {
                  debugLogger.log(`No chunks extracted from ${fullPath}`);
                }
              } else {
                debugLogger.log(`Invalid chunks returned from ${fullPath}:`, JSON.stringify(fileChunks, null, 2));
              }
            } catch (err) {
              debugLogger.log(`Error processing file ${fullPath}:`, err);
              if (err instanceof Error) {
                debugLogger.log('Error stack:', err.stack);
              }
            }
          } else {
            debugLogger.log(`Skipping unsupported file: ${fullPath}`);
          }
        } catch (err) {
          debugLogger.log(`Error processing ${fullPath}:`, err);
          if (err instanceof Error) {
            debugLogger.log('Error stack:', err.stack);
          }
        }
      }

      debugLogger.log(`Total chunks collected: ${chunks.length}`);
      return chunks;
    } catch (error) {
      debugLogger.log(`Error in walkAndChunkDirectory: ${error}`);
      if (error instanceof Error) {
        debugLogger.log('Error stack:', error.stack);
      }
      throw error;
    }
  }