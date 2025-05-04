import { execSync } from "child_process";
import path from "path";
import fs from "fs";
// Add debug logging function that uses stderr
function debug(...args) {
    console.error(...args);
}
export function chunkPyFile(filePath) {
    try {
        debug(`Processing Python file: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Python file does not exist: ${filePath}`);
        }
        const scriptPath = path.resolve(__dirname, "py_ast_parser.py");
        debug(`Using Python parser script: ${scriptPath}`);
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Python parser script not found: ${scriptPath}`);
        }
        debug('Executing Python parser...');
        const result = execSync(`python3 "${scriptPath}" "${filePath}"`, {
            encoding: "utf-8",
            stdio: ['pipe', 'pipe', 'pipe']
        });
        debug('Parsing JSON result...');
        const chunks = JSON.parse(result);
        if (!Array.isArray(chunks)) {
            throw new Error(`Expected array of chunks, got ${typeof chunks}`);
        }
        debug(`Found ${chunks.length} chunks in Python file`);
        return chunks;
    }
    catch (error) {
        debug(`Error in chunkPyFile for ${filePath}:`, error);
        if (error instanceof Error) {
            debug('Error stack:', error.stack);
        }
        throw error;
    }
}
