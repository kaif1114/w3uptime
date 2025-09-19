import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import emailService from "@/lib/email";
import bullMQEscalationService from "@/lib/escalationBullmq";

// POST /api/escalation/test - Test email configuration
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { testType, email, monitorId } = body;

    if (testType === 'email') {
      if (!email) {
        return NextResponse.json(
          { error: "Email address is required for email test" },
          { status: 400 }
        );
      }

      // Test email connection first
      const connectionTest = await emailService.testConnection();
      if (!connectionTest) {
        return NextResponse.json(
          { 
            error: "Email service not configured properly. Check your environment variables.",
            details: "Required: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS"
          },
          { status: 500 }
        );
      }

      // Send test email
      const success = await emailService.sendEmail({
        to: email,
        subject: "🧪 W3Uptime - Test Email Notification",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #007bff;">Test Email Successful! 🎉</h2>
            <p>This is a test email from your W3Uptime monitoring system.</p>
            <p><strong>Sent to:</strong> ${email}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>User:</strong> ${user.walletAddress}</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p><strong>✅ Email Configuration Status:</strong> Working correctly</p>
              <p>Your escalation policies will now be able to send email notifications when monitors go down.</p>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
              This is a test message from W3Uptime. No action is required.
            </p>
          </div>
        `,
        text: `
Test Email Successful!

This is a test email from your W3Uptime monitoring system.

Sent to: ${email}
Time: ${new Date().toLocaleString()}
User: ${user.walletAddress}

✅ Email Configuration Status: Working correctly

Your escalation policies will now be able to send email notifications when monitors go down.

This is a test message from W3Uptime. No action is required.
        `
      });

      if (success) {
        return NextResponse.json({
          message: "Test email sent successfully",
          email,
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json(
          { error: "Failed to send test email. Check server logs for details." },
          { status: 500 }
        );
      }
    }

    if (testType === 'escalation' && monitorId) {
      // Test escalation flow with fake incident using BullMQ
      await bullMQEscalationService.startEscalation({
        monitorId,
        incidentTitle: 'Test escalation - Monitor simulation',
        timestamp: new Date()
      });

      return NextResponse.json({
        message: "Test escalation started (BullMQ)",
        monitorId,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: "Invalid test type. Use 'email' or 'escalation'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Test endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error during test" },
      { status: 500 }
    );
  }
});

// GET /api/escalation/test - Get escalation service status
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url);
    const monitorId = url.searchParams.get('monitorId');

    let escalationStatus = null;
    if (monitorId) {
      // Note: BullMQ escalation service doesn't have getEscalationStatus method
      // This would need to be implemented if needed for testing
      escalationStatus = { message: "BullMQ escalation service active" };
    }

    // Test email connection
    const emailConnectionStatus = await emailService.testConnection();

    return NextResponse.json({
      email: {
        configured: emailConnectionStatus,
        host: process.env.EMAIL_HOST ? '***configured***' : 'not configured',
        user: process.env.EMAIL_USER ? '***configured***' : 'not configured'
      },
      escalation: escalationStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Status endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
});
