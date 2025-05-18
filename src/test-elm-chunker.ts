import { chunkElmFile } from './chunkers/elmChunker';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    try {
        const filePath = '/Users/carlson/dev/elm-work/scripta/scripta-app/src/Frontend.elm';
        const chunks = await chunkElmFile(filePath, { log: console.log });
        console.log(JSON.stringify(chunks, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 