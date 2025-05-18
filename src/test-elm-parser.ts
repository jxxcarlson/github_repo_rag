import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function main() {
    try {
        const filePath = '/Users/carlson/dev/elm-work/scripta/scripta-compiler-v2/src/ScriptaV2/Compiler.elm';
        const source = fs.readFileSync(filePath, 'utf-8');
        
        console.log(`File size: ${source.length} characters`);
        
        // Write the entire file to a temporary file
        const tempFile = path.join(__dirname, 'temp.elm');
        fs.writeFileSync(tempFile, source);
        
        try {
            console.log('Executing Elm parser...');
            const result = execSync(`node src/chunkers/elm_parser.js "${tempFile}"`, {
                encoding: 'utf-8'
            });
            
            console.log('\nRaw parser output:');
            console.log('------------------');
            console.log(result);
            console.log('------------------\n');
            
            if (result.trim()) {
                try {
                    const parsed = JSON.parse(result);
                    console.log('Parsed JSON:');
                    console.log(JSON.stringify(parsed, null, 2));
                } catch (error: unknown) {
                    if (error instanceof SyntaxError) {
                        console.error('JSON Parse Error:', error);
                        console.error('Error occurred at position:', error.message);
                        const position = parseInt(error.message.match(/position (\d+)/)?.[1] || '0');
                        console.error('Context around error:');
                        console.error(result.slice(Math.max(0, position - 50), position + 50));
                    } else {
                        console.error('Unknown error during JSON parsing:', error);
                    }
                }
            } else {
                console.error('Parser returned empty result');
            }
        } catch (error) {
            console.error('Error executing parser:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
        } finally {
            fs.unlinkSync(tempFile);
        }
    } catch (error) {
        console.error('Error reading file:', error);
    }
}

main(); 