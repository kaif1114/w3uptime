import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import type { Transporter } from "nodemailer";

// Try multiple .env file locations
const envPaths: readonly string[] = [
  path.join(__dirname, "../.env"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), ".env.local"),
] as const;

const requiredVars = ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS"] as const;

type RequiredEnvVar = typeof requiredVars[number];

interface EmailConfig {
  EMAIL_HOST: string;
  EMAIL_PORT: string;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  EMAIL_FROM?: string;
}

interface EmailTestResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailConfigError extends Error {
  constructor(
    message: string,
    public readonly missingVars: string[]
  ) {
    super(message);
    this.name = "EmailConfigError";
  }
}

function loadEnvironment(): boolean {
  for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      console.log(`✓ Loaded environment from: ${envPath}`);
      return true;
    }
  }
  console.warn("⚠ No .env file found, using system environment variables");
  return false;
}

function validateAndGetConfig(): EmailConfig {
  const missing = requiredVars.filter((variable): variable is RequiredEnvVar => 
    !process.env[variable] || process.env[variable]?.trim() === ""
  );

  if (missing.length > 0) {
    throw new EmailConfigError(
      `Missing required environment variables: ${missing.join(", ")}`,
      missing
    );
  }

  const port = process.env.EMAIL_PORT!;
  const portNum = parseInt(port, 10);
  
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new EmailConfigError(`Invalid EMAIL_PORT: ${port}`, ["EMAIL_PORT"]);
  }

  return {
    EMAIL_HOST: process.env.EMAIL_HOST!,
    EMAIL_PORT: port,
    EMAIL_USER: process.env.EMAIL_USER!,
    EMAIL_PASS: process.env.EMAIL_PASS!,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };
}

function createTransporter(config: EmailConfig): Transporter {
  const port = parseInt(config.EMAIL_PORT, 10);
  
  return nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS,
    },
    // Additional security options
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

async function verifyConnection(transporter: Transporter): Promise<void> {
  try {
    await transporter.verify();
    console.log("✓ SMTP connection verified successfully");
  } catch (error) {
    const err = error as Error;
    throw new Error(`SMTP connection failed: ${err.message}`);
  }
}

async function sendTestEmail(
  transporter: Transporter, 
  config: EmailConfig,
  recipient?: string
): Promise<EmailTestResult> {
  const to = recipient || config.EMAIL_USER;
  const from = config.EMAIL_FROM || config.EMAIL_USER;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: "Email Test - Configuration Successful ✓",
      text: `Email configuration test successful!

Configuration Details:
Host: ${config.EMAIL_HOST}
Port: ${config.EMAIL_PORT}
From: ${from}
To: ${to}
Time: ${new Date().toLocaleString()}

This is an automated test email to verify your email configuration is working correctly.`,
      html: `
        <h2>Email Configuration Test Successful ✓</h2>
        <p>Your email configuration is working correctly!</p>
        
        <h3>Configuration Details:</h3>
        <ul>
          <li><strong>Host:</strong> ${config.EMAIL_HOST}</li>
          <li><strong>Port:</strong> ${config.EMAIL_PORT}</li>
          <li><strong>From:</strong> ${from}</li>
          <li><strong>To:</strong> ${to}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        
        <p><em>This is an automated test email to verify your email configuration.</em></p>
      `
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
    };
  }
}

async function testEmail(): Promise<void> {
  console.log("🚀 Starting email configuration test...\n");

  try {
    // Load environment
    loadEnvironment();

    // Validate configuration
    const config = validateAndGetConfig();
    console.log(`📧 Testing configuration for: ${config.EMAIL_HOST}:${config.EMAIL_PORT}`);

    // Create transporter
    const transporter = createTransporter(config);

    // Verify connection
    await verifyConnection(transporter);

    // Send test email
    const recipient = process.argv[2];
    if (recipient) {
      console.log(`📤 Sending test email to: ${recipient}`);
    } else {
      console.log(`📤 Sending test email to: ${config.EMAIL_USER} (default)`);
    }

    const result = await sendTestEmail(transporter, config, recipient);

    if (result.success) {
      console.log(`✅ Test email sent successfully!`);
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log("\n🎉 Email configuration is working correctly!");
    } else {
      console.error(`❌ Failed to send test email: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    if (error instanceof EmailConfigError) {
      console.error(`❌ Configuration Error: ${error.message}`);
      console.log("\n📝 Required environment variables:");
      requiredVars.forEach(varName => {
        const isSet = process.env[varName] ? "✓" : "✗";
        console.log(`   ${isSet} ${varName}`);
      });
    } else {
      const err = error as Error;
      console.error(`❌ Email test failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
testEmail();