/**
 * Server Deployment Script
 * 
 * This script helps deploy the server to a production environment.
 * It builds the TypeScript code and prepares the necessary files.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== Server Deployment Script ===${colors.reset}\n`);

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log(`${colors.yellow}⚠️  No .env file found. Running setup-db.js first...${colors.reset}\n`);
  try {
    execSync('node setup-db.js', { stdio: 'inherit' });
  } catch (error) {
    console.error(`${colors.red}❌ Failed to run setup-db.js${colors.reset}`);
    process.exit(1);
  }
}

// Install dependencies
console.log(`\n${colors.cyan}📦 Installing dependencies...${colors.reset}`);
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log(`${colors.green}✅ Dependencies installed successfully${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}❌ Failed to install dependencies${colors.reset}`);
  process.exit(1);
}

// Build TypeScript code
console.log(`\n${colors.cyan}🔨 Building TypeScript code...${colors.reset}`);
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`${colors.green}✅ Build completed successfully${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}❌ Build failed${colors.reset}`);
  process.exit(1);
}

// Create a deployment package
const deployDir = path.join(__dirname, 'deploy');
console.log(`\n${colors.cyan}📦 Creating deployment package in ${deployDir}...${colors.reset}`);

// Create deploy directory if it doesn't exist
if (!fs.existsSync(deployDir)) {
  fs.mkdirSync(deployDir);
}

// Copy necessary files to deploy directory
const filesToCopy = [
  { src: 'dist', dest: 'dist' },
  { src: 'package.json', dest: 'package.json' },
  { src: 'package-lock.json', dest: 'package-lock.json' },
  { src: '.env', dest: '.env' },
  { src: 'README.md', dest: 'README.md' }
];

filesToCopy.forEach(file => {
  const srcPath = path.join(__dirname, file.src);
  const destPath = path.join(deployDir, file.dest);
  
  if (fs.existsSync(srcPath)) {
    if (fs.lstatSync(srcPath).isDirectory()) {
      // Copy directory recursively
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true });
      }
      fs.mkdirSync(destPath, { recursive: true });
      
      const copyDir = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          
          if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      
      copyDir(srcPath, destPath);
      console.log(`${colors.green}✓ Copied directory: ${file.src} -> ${file.dest}${colors.reset}`);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`${colors.green}✓ Copied file: ${file.src} -> ${file.dest}${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}⚠️  File not found: ${file.src}${colors.reset}`);
  }
});

// Create start script
const startScript = `#!/bin/bash
# Start script for cenovky server
cd "$(dirname "$0")"
npm start
`;

fs.writeFileSync(path.join(deployDir, 'start.sh'), startScript);
console.log(`${colors.green}✓ Created start script: start.sh${colors.reset}`);

console.log(`\n${colors.bright}${colors.green}✅ Deployment package created successfully!${colors.reset}`);
console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
console.log(`1. Upload the contents of the ${colors.bright}deploy${colors.reset} directory to your server`);
console.log(`2. Run ${colors.bright}npm install --production${colors.reset} on your server`);
console.log(`3. Start the server with ${colors.bright}npm start${colors.reset} or ${colors.bright}node dist/index.js${colors.reset}`);
console.log(`\n${colors.bright}${colors.cyan}Happy deploying!${colors.reset}`); 