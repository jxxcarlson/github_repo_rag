# Elm Parser Documentation

## Purpose
The Elm parser (`elm_parser.elm`) is designed to parse Elm source code files and break them down into meaningful "chunks" (like functions, type aliases, and custom types) that can be used for code analysis or documentation. It's part of a larger system for processing Elm code.

## Main Components

### Chunk Type
```elm
type alias Chunk =
    { type_ : String      -- Type of the chunk (e.g., "function", "class")
    , name : String       -- Name of the function/type
    , code : String       -- The actual source code
    , startLine : Int     -- Starting line number
    , endLine : Int       -- Ending line number
    , calls : List String -- List of function calls (currently not implemented)
    , imports : List String -- List of imported modules
    }
```

## Key Functions

### parseFile
```elm
parseFile : String -> Result String (List Chunk)
```
- Takes Elm source code as a string
- Returns either a list of chunks or an error message
- Uses `Elm.Parser` and `Elm.Processing` to parse the code

### extractChunks
```elm
extractChunks : Elm.Syntax.File.File -> List Chunk
```
- Processes the parsed Elm file
- Extracts three types of declarations:
  1. Function declarations
  2. Type alias declarations
  3. Custom type declarations
- For each declaration, creates a `Chunk` with its code and metadata

### extractCode
```elm
extractCode : String -> Elm.Syntax.Range.Range -> String
```
- Extracts the actual source code for a given range of lines
- Used to get the code for each chunk

## Ports
```elm
port parseFile : (String -> msg) -> Sub msg
port parseResult : Result String (List Chunk) -> Cmd msg
```
These ports allow communication between Elm and JavaScript:
- `parseFile` receives the source code from JavaScript
- `parseResult` sends the parsed chunks back to JavaScript

## Operation Flow
1. JavaScript sends Elm source code through the `parseFile` port
2. The code is parsed using `Elm.Parser`
3. The parsed AST is processed using `Elm.Processing`
4. The code is broken down into chunks
5. The chunks are sent back to JavaScript through the `parseResult` port

## Example

### Input Elm File
```elm
module Foo exposing (f)

f : Int -> Int
f x = x + 1
```

### Output Chunk
```json
{
    "type": "function",
    "name": "f",
    "code": "f : Int -> Int\nf x = x + 1",
    "startLine": 3,
    "endLine": 4,
    "calls": [],
    "imports": []
}
```

## Usage
This parser is designed to be used as part of a larger system for analyzing Elm code, possibly for:
- Documentation generation
- Code navigation
- Code analysis tools

The chunks it produces provide a structured way to understand the different components of an Elm file. 