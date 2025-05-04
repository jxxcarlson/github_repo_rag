import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";
import { processRepository } from "./index.js";
// Add debug logging function that uses stderr
function debug(...args) {
    console.error(...args);
}
// Create server instance
const server = new McpServer({
    name: "github_repo_rag_test_server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Add test tool for processing repository
server.tool("test-process-repository", "Test processing a GitHub repository", {
    repoUrl: z.string().describe("URL of the GitHub repository to test"),
}, async ({ repoUrl }) => {
    try {
        debug('Starting test process for repository:', repoUrl);
        // Create a temporary directory for testing
        const tempDir = path.join(os.tmpdir(), 'github_repo_rag_test');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        // Process the repository
        const indexPath = await processRepository({
            repoUrl,
            storagePath: tempDir
        });
        debug('Repository processed successfully');
        debug('Index path:', indexPath);
        // Verify the index file exists
        if (!fs.existsSync(indexPath)) {
            throw new Error('Index file was not created');
        }
        // Read the index file to verify its contents
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        debug('Index data:', JSON.stringify(indexData, null, 2));
        return {
            content: [
                {
                    type: "text",
                    text: `Test successful! Repository processed and indexed at: ${indexPath}`,
                },
            ],
        };
    }
    catch (error) {
        debug('Test failed:', error);
        if (error instanceof Error) {
            debug('Error stack:', error.stack);
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Test failed: ${error.message}`,
                },
            ],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    debug("Test server running on stdio");
}
main().catch((error) => {
    debug("Fatal error in main():", error);
    process.exit(1);
});
