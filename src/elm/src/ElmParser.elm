port module ElmParser exposing (main)

import Elm.RawFile
import Json.Encode as Encode
import Elm.Parser
import Elm.Processing
import Elm.Syntax.File
import Elm.Syntax.Node
import Elm.Syntax.Range
import Platform
import String

type alias Chunk =
    { type_ : String
    , name : String
    , code : String
    , startLine : Int
    , endLine : Int
    , calls : List String
    , imports : List String
    }

encodeChunk : Chunk -> Encode.Value
encodeChunk chunk =
    Encode.object
        [ ( "type", Encode.string chunk.type_ )
        , ( "name", Encode.string chunk.name )
        , ( "code", Encode.string chunk.code )
        , ( "startLine", Encode.int chunk.startLine )
        , ( "endLine", Encode.int chunk.endLine )
        , ( "calls", Encode.list Encode.string chunk.calls )
        , ( "imports", Encode.list Encode.string chunk.imports )
        ]

parseElmFile : String -> Result String (List Chunk)
parseElmFile source =
    case Elm.Parser.parse source of
        Ok rawFile ->


            case Elm.Processing.process Elm.Processing.init rawFile of
                Ok file ->
                    Ok (extractChunks file)
                Err _ ->
                    Err "Failed to process Elm file"
        Err _ ->
            Err "Failed to parse Elm file"

extractChunks : Elm.Syntax.File.File -> List Chunk
extractChunks file =
    let
        imports =
            List.map
                (\imp ->
                    case Elm.Syntax.Node.value imp of
                        Elm.Syntax.File.Import { moduleName } ->
                            String.join "." (List.map Elm.Syntax.Node.value moduleName)
                        _ ->
                            ""
                )
                file.imports
                |> List.filter (\s -> s /= "")
    in
    List.concatMap
        (\decl ->
            case Elm.Syntax.Node.value decl of
                Elm.Syntax.File.FunctionDeclaration function ->
                    let
                        name =
                            Elm.Syntax.Node.value function.declaration.name
                        range =
                            Elm.Syntax.Node.range decl
                    in
                    [ Chunk
                        "function"
                        name
                        (extractCode source range)
                        range.start.row
                        range.end.row
                        []
                        imports
                    ]
                Elm.Syntax.File.TypeAliasDeclaration typeAlias ->
                    let
                        name =
                            Elm.Syntax.Node.value typeAlias.name
                        range =
                            Elm.Syntax.Node.range decl
                    in
                    [ Chunk
                        "class"
                        name
                        (extractCode source range)
                        range.start.row
                        range.end.row
                        []
                        imports
                    ]
                Elm.Syntax.File.CustomTypeDeclaration typeDecl ->
                    let
                        name =
                            Elm.Syntax.Node.value typeDecl.name
                        range =
                            Elm.Syntax.Node.range decl
                    in
                    [ Chunk
                        "class"
                        name
                        (extractCode source range)
                        range.start.row
                        range.end.row
                        []
                        imports
                    ]
                _ ->
                    []
        )
        file.declarations

extractCode : String -> Elm.Syntax.Range.Range -> String
extractCode source range =
    let
        lines =
            String.split "\n" source
        startLine =
            range.start.row - 1
        endLine =
            range.end.row
    in
    String.join "\n" (List.drop startLine (List.take endLine lines))

port parseFile : (String -> msg) -> Sub msg
port parseResult : Result String (List Chunk) -> Cmd msg

main : Program () () ()
main =
    Platform.worker
        { init = \_ -> ( (), Cmd.none )
        , update = \_ msg -> ( (), parseResult msg )
        , subscriptions = \_ -> parseFile parseElmFile
        } 