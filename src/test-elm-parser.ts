import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function main() {
    try {
        const filePath = '/Users/carlson/dev/elm-work/scripta/scripta-compiler-v2/src/ScriptaV2/Compiler.elm';
        const source = fs.readFileSync(filePath, 'utf-8');
        
        console.log(`File size: ${source.length} characters`);
        
        // Create a temporary directory for Elm compilation
        const tempDir = path.join(__dirname, 'temp_elm');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        
        // Write the file to the temporary directory
        const tempFile = path.join(tempDir, 'Compiler.elm');
        fs.writeFileSync(tempFile, source);
        
        try {
            console.log('Executing Elm compiler...');
            const result = execSync(`cd ${tempDir} && elm make Compiler.elm --report=json`, {
                encoding: 'utf-8'
            });
            
            console.log('\nCompiler output:');
            console.log('------------------');
            console.log(result);
            console.log('------------------\n');
            
        } catch (error) {
            console.error('Error executing compiler:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
        } finally {
            // Clean up temporary directory
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    } catch (error) {
        console.error('Error reading file:', error);
    }
}

main(); 