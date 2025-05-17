import { chunkElmFile } from "./elmChunker";
import path from "path";
import fs from "fs";

const filePath = path.resolve(__dirname, "../../sample_elm_files/Foo.elm");

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

try {
  const chunks = chunkElmFile(filePath, console);
  console.log(JSON.stringify(chunks, null, 2));
} catch (error) {
  console.error("Error parsing Elm file:", error);
  process.exit(1);
} 