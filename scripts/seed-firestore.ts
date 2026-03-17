/**
 * Seed script for Firestore email_mappings collection.
 *
 * Usage:
 *   1. Download your Firebase service account key from:
 *      Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 *   2. Save it as `service-account.json` in the project root
 *   3. Run: npx tsx scripts/seed-firestore.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, "../service-account.json"), "utf-8")
);

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const seedMappings = [
  {
    company: "Apex Logistics",
    primary_email: "billing@apexlogistics.com",
    cc: "manager@apexlogistics.com",
    bcc: "",
  },
  {
    company: "BlueLine Storage",
    primary_email: "accounts@bluelinestorage.com",
    cc: "",
    bcc: "admin@bluelinestorage.com",
  },
  {
    company: "CargoHub Inc.",
    primary_email: "finance@cargohub.com",
    cc: "ops@cargohub.com",
    bcc: "",
  },
  {
    company: "Delta Freight",
    primary_email: "pay@deltafreight.com",
    cc: "",
    bcc: "",
  },
  {
    company: "EastPort Shipping",
    primary_email: "billing@eastport.com",
    cc: "cfo@eastport.com",
    bcc: "",
  },
];

async function seed() {
  const now = new Date().toISOString();
  const batch = db.batch();

  for (const mapping of seedMappings) {
    const ref = db.collection("email_mappings").doc();
    batch.set(ref, { ...mapping, created_at: now, updated_at: now });
  }

  await batch.commit();
  console.log(`Seeded ${seedMappings.length} email mappings.`);
}

seed().catch(console.error);
