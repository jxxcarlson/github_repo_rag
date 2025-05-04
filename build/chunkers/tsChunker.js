// 📁 src/chunkers/tsChunker.ts
import fs from "fs";
// Add debug logging function that uses stderr
function debug(...args) {
    console.error(...args);
}
export function chunkTSFile(filePath) {
    try {
        debug(`Reading file: ${filePath}`);
        const code = fs.readFileSync(filePath, "utf-8");
        debug(`File contents length: ${code.length} characters`);
        debug(`First 100 characters: ${code.substring(0, 100)}...`);
        const chunks = [];
        const imports = [];
        // Extract imports
        const importRegex = /import\s+(?:{[^}]*}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(code)) !== null) {
            imports.push(match[1]);
        }
        // Extract functions
        const functionRegex = /(?:function\s+(\w+)\s*\([^)]*\)|const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function\s*\([^)]*\)))\s*{([^}]*)}/g;
        while ((match = functionRegex.exec(code)) !== null) {
            const name = match[1] || match[2];
            const body = match[0];
            const calls = extractCalls(body);
            chunks.push({
                code: body,
                filePath,
                type: "function",
                name,
                language: "typescript",
                calls,
                imports,
            });
        }
        // Extract classes
        const classRegex = /class\s+(\w+)\s*{([^}]*)}/g;
        while ((match = classRegex.exec(code)) !== null) {
            const name = match[1];
            const body = match[0];
            chunks.push({
                code: body,
                filePath,
                type: "class",
                name,
                language: "typescript",
                calls: [], // You can extract method calls here too if needed
                imports,
            });
        }
        debug(`Found ${chunks.length} chunks in ${filePath}`);
        if (chunks.length === 0) {
            debug('No chunks were found in the file. This could mean:');
            debug('1. The file contains no functions or classes');
            debug('2. The file might be empty or contain only imports');
        }
        return chunks;
    }
    catch (error) {
        debug(`Error in chunkTSFile for ${filePath}:`, error);
        if (error instanceof Error) {
            debug('Error stack:', error.stack);
        }
        throw error;
    }
}
// Helper function to extract function calls from a code block
function extractCalls(code) {
    const calls = [];
    const callRegex = /(\w+)\(/g;
    let match;
    while ((match = callRegex.exec(code)) !== null) {
        calls.push(match[1]);
    }
    return calls;
}
