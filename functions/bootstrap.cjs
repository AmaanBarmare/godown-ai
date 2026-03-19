/**
 * One-time bootstrap script: creates the organization and admin user docs.
 * Uses Firebase Admin SDK with application default credentials (gcloud auth).
 *
 * Usage: node scripts/bootstrap.js
 */

const admin = require("firebase-admin");

const PROJECT_ID = "godown-ai-01";
const ADMIN_EMAIL = "admin@oltaflock.ai";
const ORG_NAME = "Oltaflock Warehousing LLP";

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

async function bootstrap() {
  // Check if org already exists
  const orgsSnapshot = await db.collection("organizations").limit(1).get();
  if (!orgsSnapshot.empty) {
    console.log("Organization already exists:", orgsSnapshot.docs[0].id);
    console.log("Data:", orgsSnapshot.docs[0].data());
  }

  // Find the Firebase Auth user for admin email
  let adminUser;
  try {
    adminUser = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    console.log("Found Firebase Auth user:", adminUser.uid, adminUser.email);
  } catch (e) {
    console.error("Firebase Auth user not found for", ADMIN_EMAIL);
    console.error("Create the user in Firebase Console > Authentication first.");
    process.exit(1);
  }

  const now = new Date().toISOString();

  // Create or get org
  let orgId;
  if (!orgsSnapshot.empty) {
    orgId = orgsSnapshot.docs[0].id;
    console.log("Using existing org:", orgId);
  } else {
    const orgRef = db.collection("organizations").doc();
    await orgRef.set({
      name: ORG_NAME,
      primaryAdminEmail: ADMIN_EMAIL,
      createdAt: now,
      updatedAt: now,
    });
    orgId = orgRef.id;
    console.log("Created organization:", orgId);
  }

  // Create or update admin user doc
  const userRef = db.collection("users").doc(adminUser.uid);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    console.log("Admin user doc already exists:", userDoc.data());
    // Ensure it has the right data
    await userRef.update({
      role: "admin",
      status: "active",
      organizationId: orgId,
      updatedAt: now,
    });
    console.log("Updated admin user doc");
  } else {
    await userRef.set({
      email: ADMIN_EMAIL,
      fullName: "Admin",
      organizationId: orgId,
      role: "admin",
      status: "active",
      invitedBy: "",
      createdAt: now,
      updatedAt: now,
    });
    console.log("Created admin user doc:", adminUser.uid);
  }

  console.log("\nBootstrap complete!");
  console.log("  Organization ID:", orgId);
  console.log("  Admin UID:", adminUser.uid);
  console.log("  Admin email:", ADMIN_EMAIL);
  console.log("\nYou can now sign in at the app.");
}

bootstrap().catch((e) => {
  console.error("Bootstrap failed:", e);
  process.exit(1);
});
