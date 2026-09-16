import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { otpStore } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedOtp = (otp || "").trim();

    if (!trimmedEmail || !trimmedOtp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP code are required." },
        { status: 400 }
      );
    }

    // 1. Check memory store first
    let storedData = otpStore.get(trimmedEmail);

    // 2. Fallback to Firestore if memory store doesn't have it
    const otpDocRef = doc(db, "otps", trimmedEmail);
    if (!storedData) {
      try {
        const docSnap = await getDoc(otpDocRef);
        if (docSnap.exists()) {
          storedData = docSnap.data() as any;
        }
      } catch (firestoreErr) {
        console.warn("Firestore read notice:", firestoreErr);
      }
    }

    if (!storedData) {
      return NextResponse.json(
        { success: false, message: "No active verification code found for this email. Please request a new code." },
        { status: 400 }
      );
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(trimmedEmail);
      try {
        await deleteDoc(otpDocRef);
      } catch (e) {}
      return NextResponse.json(
        { success: false, message: "The verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check maximum attempts
    if (storedData.attempts >= 4) {
      otpStore.delete(trimmedEmail);
      try {
        await deleteDoc(otpDocRef);
      } catch (e) {}
      return NextResponse.json(
        { success: false, message: "Maximum verification attempts exceeded. Please request a fresh OTP." },
        { status: 400 }
      );
    }

    // Check code match
    if (storedData.otp !== trimmedOtp) {
      storedData.attempts += 1;
      otpStore.set(trimmedEmail, storedData);
      try {
        await updateDoc(otpDocRef, {
          attempts: storedData.attempts,
        });
      } catch (e) {}

      const remaining = 4 - storedData.attempts;
      return NextResponse.json(
        {
          success: false,
          message: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
        },
        { status: 400 }
      );
    }

    // Code is valid! Clean up
    otpStore.delete(trimmedEmail);
    try {
      await deleteDoc(otpDocRef);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: "OTP successfully verified.",
    });
  } catch (err: any) {
    console.error("Verify OTP Route Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error during OTP verification." },
      { status: 500 }
    );
  }
}
