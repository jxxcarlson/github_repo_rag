port module ElmParser exposing (main)

import Elm.RawFile
import Json.Encode as Encode
import Elm.Parser
import Elm.Processing
import Elm.Syntax.File
import Elm.Syntax.Node
import Elm.Syntax.Range
import Elm.Syntax.Import
import Elm.Syntax.Declaration
import Elm.Syntax.Expression
import Elm.Syntax.ModuleName
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

encodeResult : Result String (List Chunk) -> Encode.Value
encodeResult result =
    case result of
        Ok chunks ->
            Encode.object
                [ ( "type", Encode.string "ok" )
                , ( "value", Encode.list encodeChunk chunks )
                ]
        Err error ->
            Encode.object
                [ ( "type", Encode.string "error" )
                , ( "error", Encode.string error )
                ]

parseElmFile : String -> Result String (List Chunk)
parseElmFile source =
    case Elm.Parser.parse source of
        Ok rawFile ->
            let
                file =
                    Elm.Processing.process Elm.Processing.init rawFile
            in
            Ok (extractChunks source file)
        Err _ ->
            Err "Failed to parse Elm file"

extractChunks : String -> Elm.Syntax.File.File -> List Chunk
extractChunks source file =
    let
        foo : List (Elm.Syntax.Node.Node Elm.Syntax.Import.Import)
        foo = file.imports
        imports =
            List.map
                (\imp ->
                    let
                        importValue = Elm.Syntax.Node.value imp
                        moduleNameNodes = Elm.Syntax.Node.value importValue.moduleName
                    in
                    String.join "." (List.map Elm.Syntax.Node.value moduleNameNodes)
                )
                file.imports
                |> List.filter (\s -> s /= "")
    in
    List.concatMap
        (\decl ->
            case Elm.Syntax.Node.value decl of
                Elm.Syntax.Declaration.FunctionDeclaration function ->
                    let
                        implementation =
                            Elm.Syntax.Node.value function.declaration
                        name =
                            Elm.Syntax.Node.value implementation.name
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
                Elm.Syntax.Declaration.AliasDeclaration typeAlias ->
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
                Elm.Syntax.Declaration.CustomTypeDeclaration typeDecl ->
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
port parseResult : Encode.Value -> Cmd msg

type alias Model = ()
type alias Msg = Result String (List Chunk)

main : Program () Model Msg
main =
    Platform.worker
        { init = \_ -> ( (), Cmd.none )
        , update = \msg _ -> ( (), parseResult (encodeResult msg) )
        , subscriptions = \_ -> parseFile parseElmFile
        } 