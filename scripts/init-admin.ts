/**
 * One-time script: adds initial admin user to Firestore allowedUsers collection.
 * Run: npx tsx scripts/init-admin.ts
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Uses Application Default Credentials
initializeApp({ projectId: 'audit-checklist-4d6ec' })
const db = getFirestore()

async function main() {
  const adminEmail = 'anbelskih@gmail.com'

  await db.collection('allowedUsers').doc(adminEmail).set({
    email: adminEmail,
    role: 'admin',
    name: 'Анатолий Бельских',
    addedAt: new Date().toISOString(),
  })

  console.log(`✅ Admin user ${adminEmail} added to allowedUsers`)
}

main().catch(console.error)
