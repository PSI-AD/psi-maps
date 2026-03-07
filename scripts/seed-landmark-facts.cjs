/**
 * seed-landmark-facts.cjs
 * 
 * Uses the Google Gemini API to generate 5 "Wow!" facts for each landmark
 * in the Firestore `landmarks` collection that doesn't already have facts.
 * 
 * Prerequisites:
 *   - service-account.json in the project root
 *   - GOOGLE_GEMINI_API_KEY in .env.local
 * 
 * Usage:
 *   node scripts/seed-landmark-facts.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// ── Firebase Init ────────────────────────────────────────────────────────────
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Missing service-account.json.');
    process.exit(1);
}
const serviceAccount = require(serviceAccountPath);
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// ── Gemini API Key ───────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!GEMINI_KEY) {
    console.error('❌ Missing GOOGLE_GEMINI_API_KEY in .env.local');
    console.error('   Add it: GOOGLE_GEMINI_API_KEY=your_key_here');
    process.exit(1);
}

// ── Quality Criteria ─────────────────────────────────────────────────────────
const WOW_CRITERIA = {
    mustInclude: [
        'Historical records or founding year',
        'Extreme statistics (cost, size, capacity, visitor count)',
        'Famous visitors, events, or cultural significance',
        'Unique architectural "firsts" or engineering feats',
        'Awards, rankings, or world records',
    ],
    strictlyProhibited: [
        'Opening hours or ticket prices',
        'Generic praise ("beautiful", "stunning", "amazing")',
        'Obvious information (the name, location, or category)',
        'Filler phrases ("located in", "known for being")',
    ],
};

const SYSTEM_PROMPT = `You are a luxury concierge and historian specializing in the UAE.
Your goal is to provide exactly 5 "Fun Facts" for the following landmark.

A fact only counts as "Fun" if a visitor would tell their friends about it later.

QUALITY RULES:
✅ MUST INCLUDE: ${WOW_CRITERIA.mustInclude.join('; ')}
❌ STRICTLY PROHIBITED: ${WOW_CRITERIA.strictlyProhibited.join('; ')}

EXAMPLES of good facts:
- "The park contains 12 rare Ghaf trees over 100 years old, each protected by UAE federal law."
- "Construction cost exceeded AED 11 billion, making it the most expensive single-structure project in Abu Dhabi."
- "Home to the world's fastest roller coaster at 240 km/h, certified by Guinness World Records."

Return ONLY a valid JSON array of exactly 5 strings. No markdown, no code blocks, no explanation.`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call the Gemini API to generate facts for a single landmark.
 */
const generateFacts = async (landmark) => {
    const userPrompt = `Landmark: "${landmark.name}"
Category: ${landmark.category || 'Unknown'}
Location: ${landmark.community || 'Unknown'}, ${landmark.city || 'Abu Dhabi'}, UAE

Generate 5 unique, interesting, non-generic facts about this landmark.`;

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: [{ parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    },
                }),
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            console.error(`  ⚠️ Gemini API error for "${landmark.name}": ${res.status} ${errText.substring(0, 200)}`);
            return null;
        }

        const data = await res.json();
        // Gemini 2.5+ may return multiple parts (thinking + output). Check ALL parts.
        const allParts = data?.candidates?.[0]?.content?.parts || [];
        const allText = allParts.map(p => p.text || '').join('\n');

        // Extract JSON array from the full response text
        const jsonMatch = allText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error(`  ⚠️ Could not parse JSON from Gemini response for "${landmark.name}"`);
            return null;
        }

        const facts = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(facts) || facts.length === 0) return null;

        // Take only string items, max 5
        return facts.filter(f => typeof f === 'string').slice(0, 5);
    } catch (err) {
        console.error(`  ⚠️ Error generating facts for "${landmark.name}":`, err.message);
        return null;
    }
};

// ── Main ─────────────────────────────────────────────────────────────────────
const seedFacts = async () => {
    console.log('📡 Fetching landmarks from Firestore...');
    const snapshot = await db.collection('landmarks').get();
    const landmarks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter to landmarks that don't already have facts
    const needFacts = landmarks.filter(l => !l.facts || l.facts.length === 0);

    console.log(`✅ Found ${landmarks.length} total landmarks.`);
    console.log(`🎯 ${needFacts.length} landmarks need facts generated.\n`);

    if (needFacts.length === 0) {
        console.log('🎉 All landmarks already have facts!');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < needFacts.length; i++) {
        const landmark = needFacts[i];
        process.stdout.write(`  [${i + 1}/${needFacts.length}] ${landmark.name}... `);

        const facts = await generateFacts(landmark);

        if (facts && facts.length > 0) {
            await db.collection('landmarks').doc(landmark.id).update({ facts });
            console.log(`✅ ${facts.length} facts saved`);
            successCount++;
        } else {
            console.log('❌ skipped');
            failCount++;
        }

        // Rate limit: 300ms between calls (Gemini free tier = ~15 RPM)
        await sleep(300);

        // Progress update every 20 landmarks
        if ((i + 1) % 20 === 0) {
            console.log(`\n  📊 Progress: ${i + 1}/${needFacts.length} (${successCount} ok, ${failCount} failed)\n`);
        }
    }

    console.log('\n🎉 Fact Seeding Complete!');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed:  ${failCount}`);
    console.log(`  📁 Total:   ${needFacts.length}`);
};

seedFacts().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
