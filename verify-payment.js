import crypto from "node:crypto";
import Razorpay from "razorpay";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("Firebase admin credentials are not configured.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking, customerName, phone } = req.body || {};
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) return res.status(401).json({ error: "Sign-in required." });
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking || !uid) {
      return res.status(400).json({ error: "Missing payment or booking details." });
    }
    const expected = crypto.createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    const a = Buffer.from(expected, "hex"), b = Buffer.from(razorpay_signature, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: "Payment signature verification failed." });
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: secret });
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || payment.status !== "captured") {
      return res.status(400).json({ error: "Payment is not captured for this order yet." });
    }
    const db = getAdminDb();
    const bookingId = "SFT-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const doc = {
      bookingId, uid: String(uid), customerName: String(customerName || "Customer").slice(0,100),
      phone: String(phone || "").slice(0,20), pickup: String(booking.pickup || "").slice(0,200),
      drop: String(booking.drop || "").slice(0,200), tripType: booking.tripType,
      car: booking.car, date: booking.date, time: booking.time,
      distanceKm: Number(booking.distanceKm), total: Number(booking.total),
      advance: Number(payment.amount) / 100, paymentId: payment.id, orderId: razorpay_order_id,
      status: "payment_verified_pending_operator_confirmation",
      createdAt: new Date().toISOString()
    };
    await db.collection("bookings").doc(bookingId).create(doc);
    return res.status(200).json({ ok: true, bookingId, status: doc.status });
  } catch (e) {
    console.error("verify-payment error", e);
    return res.status(500).json({ error: "Could not verify and save booking. Contact support with payment ID." });
  }
}