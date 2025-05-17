import express, { Request, Response, RequestHandler } from 'express';
import { processRepository } from './index';
import { debugLogger } from './index';
import path from 'path';
import os from 'os';
import fs from 'fs';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Default storage path
const DEFAULT_STORAGE_PATH = path.join(os.homedir(), '.github_repo_rag');

// Debug endpoint to test repository processing
const debugRepoHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
      res.status(400).json({ error: 'repoUrl is required' });
      return;
    }

    debugLogger.log('Starting repository debug process...');
    
    // Create the default storage directory if it doesn't exist
    if (!fs.existsSync(DEFAULT_STORAGE_PATH)) {
      debugLogger.log('Creating default storage directory:', DEFAULT_STORAGE_PATH);
      fs.mkdirSync(DEFAULT_STORAGE_PATH, { recursive: true });
    }

    // Create a unique directory for this repository
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repository';
    const repoStoragePath = path.join(DEFAULT_STORAGE_PATH, repoName);
    debugLogger.log('Repository storage path:', repoStoragePath);
    
    if (fs.existsSync(repoStoragePath)) {
      debugLogger.log('Removing existing repository directory');
      fs.rmSync(repoStoragePath, { recursive: true, force: true });
    }
    
    debugLogger.log('Creating repository directory');
    fs.mkdirSync(repoStoragePath, { recursive: true });

    // Process the repository
    const indexPath = await processRepository({
      repoUrl,
      storagePath: repoStoragePath
    });

    // Get debug logs
    const debugLogs = debugLogger.getLastMessages(50);

    res.json({
      success: true,
      indexPath,
      debugLogs
    });
  } catch (error) {
    debugLogger.log('Error in debug-repo endpoint:', error);
    const debugLogs = debugLogger.getLastMessages(50);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      debugLogs
    });
  }
};

// Process repository endpoint
const processRepoHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
      res.status(400).json({ error: 'repoUrl is required' });
      return;
    }

    debugLogger.log('Starting repository processing...');
    
    // Create the default storage directory if it doesn't exist
    if (!fs.existsSync(DEFAULT_STORAGE_PATH)) {
      debugLogger.log('Creating default storage directory:', DEFAULT_STORAGE_PATH);
      fs.mkdirSync(DEFAULT_STORAGE_PATH, { recursive: true });
    }

    // Create a unique directory for this repository
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repository';
    const repoStoragePath = path.join(DEFAULT_STORAGE_PATH, repoName);
    
    // Process the repository
    const indexPath = await processRepository({
      repoUrl,
      storagePath: repoStoragePath
    });

    res.json({
      success: true,
      indexPath
    });
  } catch (error) {
    debugLogger.log('Error in process-repo endpoint:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Register routes
app.post('/debug-repo', debugRepoHandler);
app.post('/process-repo', processRepoHandler);

// Start the server
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
}); 