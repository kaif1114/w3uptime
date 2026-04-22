#!/usr/bin/env node
// Full MetaMask-style login flow against http://43.204.61.140 using a known
// test private key. Confirms nonce → verify → session all work end-to-end.
const { Wallet } = require("C:/Users/Bachal/AppData/Local/Temp/loginflow/node_modules/ethers");

const BASE = process.env.BASE || "http://43.204.61.140";
// Hardhat's well-known test account #1 — no real funds.
const PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const wallet = new Wallet(PK);

function log(stage, data) {
  console.log(`\n=== ${stage} ===`);
  console.log(data);
}

(async () => {
  const address = wallet.address;
  log("wallet", { address });

  // 1. Ask for a nonce
  const nonceResp = await fetch(`${BASE}/api/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: address }),
  });
  const nonceBody = await nonceResp.json();
  log("nonce response", { status: nonceResp.status, body: nonceBody });
  if (!nonceBody.success) process.exit(1);

  // 2. Sign the nonce. The server computes messageHash = keccak256("\x19Ethereum Signed Message:\n" + len + nonce)
  //    and recovers the address. ethers' wallet.signMessage does exactly that.
  const signature = await wallet.signMessage(nonceBody.nonce);
  log("signed", { signature });

  // 3. POST to verify — parse Set-Cookie manually since fetch doesn't expose it cleanly
  const verifyResp = await fetch(`${BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: address, signature }),
  });
  const verifyBody = await verifyResp.json();
  const setCookie = verifyResp.headers.get("set-cookie") || "(none)";
  log("verify response", {
    status: verifyResp.status,
    body: verifyBody,
    setCookie,
  });

  if (!verifyBody.success) process.exit(2);

  // 4. Parse the sessionId cookie
  const m = setCookie.match(/sessionId=([^;]+)/);
  if (!m) {
    log("ERROR", "No sessionId cookie in Set-Cookie header");
    process.exit(3);
  }
  const sessionId = m[1];
  log("extracted sessionId", sessionId);

  // 5. Check attributes on the cookie — must NOT have Secure (we're on http)
  const hasSecure = /;\s*Secure(;|$)/i.test(setCookie);
  const hasHttpOnly = /;\s*HttpOnly(;|$)/i.test(setCookie);
  const sameSite = (setCookie.match(/;\s*SameSite=([^;]+)/i) || [])[1];
  log("cookie attrs", { hasSecure, hasHttpOnly, sameSite });
  if (hasSecure) {
    console.error("\n!!! Cookie still has Secure flag — browser on HTTP will drop it !!!");
    process.exit(4);
  }

  // 6. Use the cookie to call /api/auth/session — must come back authenticated
  const sessionResp = await fetch(`${BASE}/api/auth/session`, {
    method: "GET",
    headers: { Cookie: `sessionId=${sessionId}` },
  });
  const sessionBody = await sessionResp.json();
  log("session response", {
    status: sessionResp.status,
    body: sessionBody,
  });

  if (sessionResp.status === 200 && sessionBody.authenticated) {
    console.log("\n✅ LOGIN FLOW WORKS END-TO-END");
    process.exit(0);
  } else {
    console.log("\n❌ Session not recognised");
    process.exit(5);
  }
})().catch((e) => {
  console.error("crashed:", e);
  process.exit(99);
});
