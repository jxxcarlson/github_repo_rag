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
    const chunks = JSON.parse(result);
    
    if (!Array.isArray(chunks)) {
      throw new Error(`Expected array of chunks, got ${typeof chunks}`);
    }
    
    logger.log(`Found ${chunks.length} chunks in Elm file`);
    console.log('Chunks:', JSON.stringify(chunks, null, 2));
    return chunks;
  } catch (error) {
    logger.log(`Error in chunkElmFile for ${filePath}: ${error}`);
    if (error instanceof Error) {
      logger.log(`Error stack: ${error.stack}`);
    }
    throw error;
  }
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