#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as path from 'path';
import { ConfigManager } from '../config/config-manager.js';
import { KeystoreManager } from '../crypto/keystore.js';
import { SecureMessageSigner, ParanoidMessageSigner } from '../crypto/signer.js';
import { ValidatorWebSocketClient } from '../network/websocket-client.js';
import { WebsiteMonitor } from '../monitoring/monitor.js';
import { ValidatorService } from '../services/validator-service.js';

const program = new Command();


let configManager: ConfigManager;

async function initializeConfig(): Promise<void> {
  configManager = new ConfigManager();
  await configManager.loadConfig();
}


program
  .command('init')
  .description('Initialize validator configuration and import an existing wallet')
  .option('-w, --wallet-name <name>', 'Name for the wallet')
  .option('-k, --private-key <key>', 'Private key to import (required)')
  .option('--hub-url <url>', 'Hub WebSocket URL', 'ws://localhost:8080')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Initializing W3Uptime Validator'));
      
      
      if (!options.privateKey) {
        console.error(chalk.red('Private key is required. Use --private-key option to provide your existing wallet private key.'));
        process.exit(1);
      }
      
      await initializeConfig();
      
      
      if (options.hubUrl) {
        configManager.setHubUrl(options.hubUrl);
      }

      const keystoreManager = new KeystoreManager(configManager.getSecurityConfig().keystoreDir);
      
      
      const password = await promptPassword('Enter password to encrypt your wallet:');
      const confirmPassword = await promptPassword('Confirm password:');
      
      if (password !== confirmPassword) {
        console.error(chalk.red('Passwords do not match'));
        process.exit(1);
      }
      
      const walletResult = await keystoreManager.importWallet(
        options.privateKey,
        password,
        options.walletName
      );
      
      console.log(chalk.green('Wallet imported successfully'));
      
      
      const walletName = path.basename(walletResult.keystorePath, '.json');
      configManager.setDefaultWallet(walletName);
      
      
      await configManager.saveConfig();
      
      console.log(chalk.cyan(`Wallet Address: ${walletResult.address}`));
      console.log(chalk.cyan(`📁 Keystore Path: ${walletResult.keystorePath}`));
      console.log(chalk.cyan(`⚙️  Config Path: ${configManager.getConfigPath()}`));
      console.log(chalk.yellow(' Keep your password safe - it cannot be recovered!'));
      
    } catch (error) {
      console.error(chalk.red(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });


program
  .command('start')
  .description('Start the validator daemon')
  .option('-w, --wallet <name>', 'Wallet name to use')
  .option('-d, --daemon', 'Run as daemon (background process)')
  .option('--paranoid', 'Enable paranoid mode (password required for each signing)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🏁 Starting W3Uptime Validator'));
      
      await initializeConfig();
      
      const config = configManager.getConfig();
      
      
      if (options.paranoid) {
        configManager.setParanoidMode(true);
      }
      
      
      const walletName = options.wallet || config.validator.defaultWallet;
      if (!walletName) {
        console.error(chalk.red('No wallet specified. Use --wallet or set default wallet with config command'));
        process.exit(1);
      }
      
      
      const validatorService = new ValidatorService(configManager);
      await validatorService.start(walletName);
      
    } catch (error) {
      console.error(chalk.red(`Failed to start validator: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });


program
  .command('status')
  .description('Show validator status and statistics')
  .action(async () => {
    try {
      await initializeConfig();
      
      const config = configManager.getConfig();
      
      console.log(chalk.blue('📊 W3Uptime Validator Status'));
      console.log(chalk.gray('═'.repeat(50)));
      
      
      console.log(chalk.cyan('Configuration:'));
      console.log(`  Hub URL: ${config.hub.url}`);
      console.log(`  Default Wallet: ${config.validator.defaultWallet || 'Not set'}`);
      console.log(`  Paranoid Mode: ${config.security.paranoidMode ? 'Enabled' : 'Disabled'}`);
      console.log(`  Session Timeout: ${config.security.sessionTimeoutMinutes} minutes`);
      
      
      const keystoreManager = new KeystoreManager(config.security.keystoreDir);
      const wallets = await keystoreManager.listWallets();
      
      console.log(chalk.cyan('\nWallets:'));
      if (wallets.length === 0) {
        console.log('  No wallets found');
      } else {
        wallets.forEach((wallet: { name: string; address: string; path: string }) => {
          const isDefault = wallet.name === config.validator.defaultWallet;
          console.log(`  ${isDefault ? '🔹' : '  '} ${wallet.name}: ${wallet.address}`);
        });
      }
      
      
      console.log(chalk.cyan('\nConnection:'));
      console.log('  Status: Not running (use "start" command)');
      
    } catch (error) {
      console.error(chalk.red(`Failed to get status: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });


const walletCmd = program
  .command('wallet')
  .description('Wallet management commands');

walletCmd
  .command('list')
  .description('List all available wallets')
  .action(async () => {
    try {
      await initializeConfig();
      
      const keystoreManager = new KeystoreManager(configManager.getSecurityConfig().keystoreDir);
      const wallets = await keystoreManager.listWallets();
      
      console.log(chalk.blue('💳 Available Wallets'));
      console.log(chalk.gray('═'.repeat(50)));
      
      if (wallets.length === 0) {
        console.log('No wallets found. Use "init" command to create a wallet.');
        return;
      }
      
      const defaultWallet = configManager.getValidatorConfig().defaultWallet;
      
      wallets.forEach((wallet: { name: string; address: string; path: string }, index: number) => {
        const isDefault = wallet.name === defaultWallet;
        const marker = isDefault ? chalk.green('🔹 [DEFAULT]') : '  ';
        console.log(`${marker} ${wallet.name}`);
        console.log(`     Address: ${wallet.address}`);
        console.log(`     Path: ${wallet.path}`);
        if (index < wallets.length - 1) console.log('');
      });
      
    } catch (error) {
      console.error(chalk.red(`Failed to list wallets: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });


walletCmd
  .command('import <name>')
  .description('Import wallet from private key')
  .action(async (name) => {
    try {
      await initializeConfig();
      
      const keystoreManager = new KeystoreManager(configManager.getSecurityConfig().keystoreDir);
      
      
      if (keystoreManager.keystoreExists(name)) {
        console.error(chalk.red(`Wallet "${name}" already exists`));
        process.exit(1);
      }
      
      const privateKey = await promptPrivateKey('Enter private key:');
      const password = await promptPassword('Enter password to encrypt wallet:');
      const confirmPassword = await promptPassword('Confirm password:');
      
      if (password !== confirmPassword) {
        console.error(chalk.red('Passwords do not match'));
        process.exit(1);
      }
      
      const result = await keystoreManager.importWallet(privateKey, password, name);
      
      console.log(chalk.green('Wallet imported successfully'));
      console.log(chalk.cyan(`Address: ${result.address}`));
      console.log(chalk.cyan(`📁 Path: ${result.keystorePath}`));
      
    } catch (error) {
      console.error(chalk.red(`Failed to import wallet: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });


const configCmd = program
  .command('config')
  .description('Configuration management commands');

configCmd
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    try {
      await initializeConfig();
      
      const config = configManager.getConfig();
      
      console.log(chalk.blue('⚙️  Current Configuration'));
      console.log(chalk.gray('═'.repeat(50)));
      console.log(JSON.stringify(config, null, 2));
      
    } catch (error) {
      console.error(chalk.red(`Failed to show config: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

configCmd
  .command('set <key> <value>')
  .description('Set configuration value')
  .action(async (key, value) => {
    try {
      await initializeConfig();
      
      
      const keys = key.split('.');
      const config = configManager.getConfig();
      
      
      let target: any = config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in target)) {
          target[keys[i]] = {};
        }
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      
      configManager.updateConfig(config);
      await configManager.saveConfig();
      
      console.log(chalk.green(`Configuration updated: ${key} = ${value}`));
      
    } catch (error) {
      console.error(chalk.red(`Failed to set config: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

configCmd
  .command('reset')
  .description('Reset configuration to defaults')
  .action(async () => {
    try {
      const { confirm } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset configuration to defaults?',
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log('Configuration reset cancelled');
        return;
      }
      
      await initializeConfig();
      configManager.resetToDefaults();
      await configManager.saveConfig();
      
      console.log(chalk.green('Configuration reset to defaults'));
      
    } catch (error) {
      console.error(chalk.red(`Failed to reset config: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });


async function promptPassword(message: string): Promise<string> {
  const { password } = await inquirer.default.prompt([
    {
      type: 'password',
      name: 'password',
      message,
      validate: (input: string) => input.length >= 8 || 'Password must be at least 8 characters long'
    }
  ]);
  return password;
}

async function promptPrivateKey(message: string): Promise<string> {
  const { privateKey } = await inquirer.default.prompt([
    {
      type: 'password',
      name: 'privateKey',
      message,
      validate: (input: string) => {
        if (!input) return 'Private key is required';
        if (!input.match(/^(0x)?[a-fA-F0-9]{64}$/)) {
          return 'Invalid private key format';
        }
        return true;
      }
    }
  ]);
  return privateKey;
}



process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});


program
  .name('w3uptime-validator')
  .description('W3Uptime decentralized validator CLI')
  .version('1.0.0');


program.parse();

export { program };