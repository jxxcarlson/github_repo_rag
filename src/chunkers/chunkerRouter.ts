import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { CodeChunk, chunkTSFile } from "./tsChunker.js";

// Import the debugLogger
import { debugLogger } from "../index.js";

export function chunkPyFile(filePath: string): CodeChunk[] {
    const scriptPath = path.resolve(__dirname, "py_ast_parser.py");
    const result = spawnSync("python3", [scriptPath, filePath]);
  
    if (result.error) throw result.error;
    if (result.stderr.length > 0) throw new Error(result.stderr.toString());
  
    return JSON.parse(result.stdout.toString());
  }
  
  
  export function chunkFileByExtension(filePath: string): CodeChunk[] {
    try {
      debugLogger.log(`Processing file: ${filePath}`);
      const ext = path.extname(filePath);
      debugLogger.log(`File extension: ${ext}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }
      
      debugLogger.log(`File size: ${stats.size} bytes`);
      
      let chunks: CodeChunk[];
      if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
        debugLogger.log('Processing TypeScript/JavaScript file');
        chunks = chunkTSFile(filePath);
      } else if (ext === ".py") {
        debugLogger.log('Processing Python file');
        chunks = chunkPyFile(filePath);
      } else {
        debugLogger.log(`Unsupported file type: ${ext}`);
        throw new Error(`Unsupported file type: ${ext}`);
      }
      
      if (!Array.isArray(chunks)) {
        debugLogger.log(`Invalid chunks type: ${typeof chunks}`);
        throw new Error(`Expected chunks to be an array, got ${typeof chunks}`);
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
      if (error instanceof Error) {
        debugLogger.log('Error stack:', error.stack);
      }
      throw error;
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
          } else if ([".ts", ".tsx", ".js", ".jsx", ".py"].includes(path.extname(fullPath))) {
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
      debugLogger.log(`Error in walkAndChunkDirectory for ${dirPath}:`, error);
      if (error instanceof Error) {
        debugLogger.log('Error stack:', error.stack);
      }
      throw error;
    }
  }