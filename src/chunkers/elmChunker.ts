import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { CodeChunk } from "./tsChunker";

export function chunkElmFile(filePath: string, logger: { log: (message: string) => void } = { log: () => {} }): CodeChunk[] {
  try {
    logger.log(`Processing Elm file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Elm file does not exist: ${filePath}`);
    }

    const scriptPath = path.resolve(__dirname, "elm_ast_parser.py");
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
    const chunks = JSON.parse(result);
    
    if (!Array.isArray(chunks)) {
      throw new Error(`Expected array of chunks, got ${typeof chunks}`);
    }
    
    logger.log(`Found ${chunks.length} chunks in Elm file`);
    return chunks;
  } catch (error) {
    logger.log(`Error in chunkElmFile for ${filePath}: ${error}`);
    if (error instanceof Error) {
      logger.log(`Error stack: ${error.stack}`);
    }
    throw error;
  }
} 