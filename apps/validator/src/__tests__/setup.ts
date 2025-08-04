import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Setup test environment
beforeAll(() => {
  // Ensure test directories exist
  const testDir = path.join(os.tmpdir(), 'w3uptime-validator-tests');
  fs.ensureDirSync(testDir);
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup test directories
  const testDir = path.join(os.tmpdir(), 'w3uptime-validator-tests');
  if (fs.existsSync(testDir)) {
    fs.removeSync(testDir);
  }
});