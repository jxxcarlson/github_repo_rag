const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { chunkElmFile } = require('./elmChunker');

// Mock child_process.execSync
const mockExecSync = jest.fn();
jest.spyOn(require('child_process'), 'execSync').mockImplementation(mockExecSync);

// Mock fs.existsSync
jest.spyOn(fs, 'existsSync');

// Mock path.resolve
const mockScriptPath = '/path/to/elm_ast_parser.py';
jest.spyOn(path, 'resolve').mockReturnValue(mockScriptPath);

// Mock logger
const mockLogger = {
  log: jest.fn()
};

describe('elmChunker', () => {
  const mockFilePath = '/path/to/test.elm';
  const mockChunks = [
    {
      code: 'test code',
      filePath: 'test.elm',
      type: 'function',
      name: 'testFunction',
      language: 'elm',
      calls: ['otherFunction'],
      imports: ['TestModule']
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to true for all tests
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('should successfully parse a valid Elm file', () => {
    mockExecSync.mockReturnValue(JSON.stringify(mockChunks));

    const result = chunkElmFile(mockFilePath, mockLogger);
    
    expect(result).toEqual(mockChunks);
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('python3'),
      expect.any(Object)
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Processing Elm file')
    );
  });

  it('should throw error when Elm file does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    expect(() => chunkElmFile(mockFilePath, mockLogger)).toThrow(
      'Elm file does not exist: ' + mockFilePath
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Error in chunkElmFile')
    );
  });

  it('should throw error when parser script does not exist', () => {
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(true)  // Elm file exists
      .mockReturnValueOnce(false); // Parser script doesn't exist

    expect(() => chunkElmFile(mockFilePath, mockLogger)).toThrow(
      'Elm parser script not found: ' + mockScriptPath
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Error in chunkElmFile')
    );
  });

  it('should throw error when Python script fails', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Python script failed');
    });

    expect(() => chunkElmFile(mockFilePath, mockLogger)).toThrow(
      'Python script failed'
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Error in chunkElmFile')
    );
  });

  it('should throw error when JSON parsing fails', () => {
    mockExecSync.mockReturnValue('invalid json');

    expect(() => chunkElmFile(mockFilePath, mockLogger)).toThrow();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Error in chunkElmFile')
    );
  });

  it('should throw error when result is not an array', () => {
    mockExecSync.mockReturnValue(JSON.stringify({ not: 'an array' }));

    expect(() => chunkElmFile(mockFilePath, mockLogger)).toThrow(
      'Expected array of chunks'
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Error in chunkElmFile')
    );
  });

  it('should handle empty chunk array', () => {
    mockExecSync.mockReturnValue(JSON.stringify([]));

    const result = chunkElmFile(mockFilePath, mockLogger);
    expect(result).toEqual([]);
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Found 0 chunks')
    );
  });

  it('should handle chunks with missing optional fields', () => {
    const mockChunks = [
      {
        code: 'test code',
        filePath: 'test.elm',
        type: 'function',
        name: 'testFunction',
        language: 'elm',
        calls: [],
        imports: []
      }
    ];

    mockExecSync.mockReturnValue(JSON.stringify(mockChunks));

    const result = chunkElmFile(mockFilePath, mockLogger);
    expect(result).toEqual(mockChunks);
  });

  it('should handle chunks with all fields', () => {
    const mockChunks = [
      {
        code: 'test code',
        filePath: 'test.elm',
        type: 'function',
        name: 'testFunction',
        language: 'elm',
        calls: ['otherFunction'],
        imports: ['TestModule']
      }
    ];

    mockExecSync.mockReturnValue(JSON.stringify(mockChunks));

    const result = chunkElmFile(mockFilePath, mockLogger);
    expect(result).toEqual(mockChunks);
  });
}); 