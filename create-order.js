import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) return res.status(500).json({ error: "Payment gateway is not configured." });
    const { amount, booking } = req.body || {};
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000000 || !booking ||
        typeof booking.pickup !== "string" || typeof booking.drop !== "string" ||
        !["oneway","roundtrip","local"].includes(booking.tripType) ||
        !["hatchback","sedan","suv","innova"].includes(booking.car)) {
      return res.status(400).json({ error: "Invalid booking details." });
    }
    // Recalculate amount on server; never trust a client-supplied amount.
    const rates = { hatchback: 11, sedan: 12, suv: 16, innova: 20 };
    const minDistance = booking.tripType === "roundtrip" ? 250 : booking.tripType === "local" ? 80 : 130;
    const distance = Math.max(minDistance, Math.min(Number(booking.distanceKm) || minDistance, 3000));
    const total = Math.round(distance * rates[booking.car] + (booking.tripType === "roundtrip" ? 300 : 0));
    const expectedAdvance = Math.round(total * 0.2);
    if (amount !== expectedAdvance) return res.status(400).json({ error: "Fare changed. Refresh and try again." });
    const razorpay = new Razorpay({ key_id, key_secret });
    const order = await razorpay.orders.create({
      amount: expectedAdvance * 100, currency: "INR",
      receipt: "safar_" + Date.now().toString().slice(-10),
      notes: { pickup: booking.pickup.slice(0, 200), drop: booking.drop.slice(0, 200), tripType: booking.tripType, car: booking.car }
    });
    return res.status(200).json({ orderId: order.id, amount: order.amount, keyId: key_id, total, advance: expectedAdvance });
  } catch (e) {
    console.error("create-order error", e);
    return res.status(500).json({ error: "Unable to create payment order." });
  }
}