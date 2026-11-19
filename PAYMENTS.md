# Rupee (INR) purchases: what is built and what is still needed

Built in the game: rupee prices on runner cards (PHANTOM ₹49, ECLIPSE ₹99), a confirm screen,
and `src/game/payments.ts`, which opens Razorpay Checkout and unlocks the runner after payment is verified.

Rupee purchases stay OFF until you finish these steps. The game shows "Rupee purchases are not switched on yet".

1. Create a Razorpay account (test mode is free). Live payments need KYC / business verification.
2. Build a small backend with two endpoints. Keep the Razorpay SECRET key there only, never in the game code:
   - POST /create-order  body {item:"PHANTOM"} -> look up the price on the server, create a Razorpay order, return {id, amount}
   - POST /verify        body {razorpay_order_id, razorpay_payment_id, razorpay_signature, item} -> check the signature
     with your secret and return {ok:true}
3. Add two environment variables to the project:
   - VITE_RAZORPAY_KEY_ID = your public key id
   - VITE_PAYMENTS_API    = the base URL of your backend

Limits to know about:
- Progress (coins, unlocked runners) is saved on the player's device only. A purchase is lost if they clear data or change phone.
  Fixing this needs player accounts and a database.
- Change runner names and prices in `src/game/store.ts` (the `inr` field). Coin runners use `price`.
- If you publish on Google Play, in-app purchases there must use Google Play Billing, not Razorpay.
