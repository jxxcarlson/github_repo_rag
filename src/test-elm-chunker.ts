import { chunkElmFile } from './chunkers/elmChunker';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    try {
        const filePath = path.resolve('src/elm/test.elm');
        const chunks = await chunkElmFile(filePath, { log: console.log });
        console.log(JSON.stringify(chunks, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 