import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { CodeChunk } from "./tsChunker.js";
import { debugLogger } from "../index.js";

export function chunkElmFile(filePath: string): CodeChunk[] {
  try {
    debugLogger.log(`Processing Elm file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Elm file does not exist: ${filePath}`);
    }

    const scriptPath = path.resolve(__dirname, "elm_ast_parser.py");
    debugLogger.log(`Using Elm parser script: ${scriptPath}`);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Elm parser script not found: ${scriptPath}`);
    }

    debugLogger.log('Executing Elm parser...');
    const result = execSync(`python3 "${scriptPath}" "${filePath}"`, {
      encoding: "utf-8",
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    debugLogger.log('Parsing JSON result...');
    const chunks = JSON.parse(result);
    
    if (!Array.isArray(chunks)) {
      throw new Error(`Expected array of chunks, got ${typeof chunks}`);
    }
    
    debugLogger.log(`Found ${chunks.length} chunks in Elm file`);
    return chunks;
  } catch (error) {
    debugLogger.log(`Error in chunkElmFile for ${filePath}: ${error}`);
    if (error instanceof Error) {
      debugLogger.log(`Error stack: ${error.stack}`);
    }
    throw error;
  }
} 