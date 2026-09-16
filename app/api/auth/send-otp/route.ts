import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import nodemailer from "nodemailer";
import { otpStore } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const trimmedEmail = (email || "").trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpPass || !smtpUser || smtpPass.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Email dispatch service is not configured. Please check SMTP_USER and SMTP_PASS in .env.local.",
        },
        { status: 500 }
      );
    }

    // Generate secure 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Always store in memory store
    otpStore.set(trimmedEmail, {
      email: trimmedEmail,
      otp: generatedOtp,
      expiresAt,
      attempts: 0,
    });

    // Also store in Firestore collection 'otps'
    try {
      await setDoc(doc(db, "otps", trimmedEmail), {
        email: trimmedEmail,
        otp: generatedOtp,
        expiresAt,
        attempts: 0,
        createdAt: new Date().toISOString(),
      });
    } catch (firestoreErr: any) {
      console.warn("Firestore write notice:", firestoreErr?.message || firestoreErr);
    }

    // Gmail SMTP Transport
    const cleanPass = smtpPass.replace(/\s+/g, "");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: cleanPass,
      },
    });

    const messageId = `<otp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}@gmail.com>`;

    try {
      const info = await transporter.sendMail({
        from: `PharmaNext <${smtpUser}>`,
        replyTo: smtpUser,
        to: trimmedEmail,
        subject: `Your PharmaNext verification code is ${generatedOtp}`,
        text: `Your PharmaNext verification code is: ${generatedOtp}\n\nUse this code to complete your login. This code will expire in 5 minutes.\n\nIf you did not request this code, you can safely ignore this email.\n\n— The PharmaNext Team`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your PharmaNext Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; text-align: left; border-bottom: 1px solid #f3f4f6;">
              <span style="font-size: 22px; font-weight: 800; color: #3b0764; letter-spacing: -0.5px;">Pharma<span style="color: #059669;">Next</span></span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px; text-align: left;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1f2937; line-height: 1.5;">Hello,</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.5;">Use the following 6-digit code to log in to your PharmaNext account. This code is valid for <strong>5 minutes</strong>.</p>
              
              <!-- OTP Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #581c87; display: inline-block;">${generatedOtp}</span>
              </div>
              
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">If you did not request this verification code, please ignore this email or contact support if you have questions.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: left;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.4;">PharmaNext Technologies Pvt Ltd • Smart Pharmacy Management POS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
        messageId: messageId,
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          "Importance": "High",
          "Auto-Submitted": "auto-generated",
          "X-Auto-Response-Suppress": "All",
        },
      });

      console.log(`[INBOX OPTIMIZED EMAIL DELIVERED] OTP sent to ${trimmedEmail}, ID: ${info.messageId}`);

      return NextResponse.json({
        success: true,
        message: `A 6-digit security code has been sent to ${trimmedEmail}. Please check your inbox.`,
      });
    } catch (mailSendError: any) {
      console.error("Nodemailer Dispatch Error:", mailSendError);
      return NextResponse.json(
        {
          success: false,
          message: `Failed to deliver email: ${mailSendError.message || "Authentication failed"}. Please check SMTP credentials.`,
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error("Send OTP General Error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
