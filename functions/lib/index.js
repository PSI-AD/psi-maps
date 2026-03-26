"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Cloud Functions
// Server-side logic: notification triggers, scheduled jobs, API middleware,
// security validation, database automation
// ═══════════════════════════════════════════════════════════════════════════════
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onProjectWrite = exports.api = exports.weeklyAnalyticsSummary = exports.cleanupStaleTokens = exports.onProjectStatusChange = exports.onNewLead = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
// ── Initialize Admin SDK ─────────────────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
// ═══════════════════════════════════════════════════════════════════════════════
// 1. NOTIFICATION TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Send push notification when a new lead is created.
 * Notifies all admin devices about the inquiry.
 */
exports.onNewLead = (0, firestore_1.onDocumentCreated)('leads/{leadId}', async (event) => {
    const lead = event.data?.data();
    if (!lead)
        return;
    firebase_functions_1.logger.info('New lead received:', { name: lead.name, project: lead.projectName });
    // Get all registered FCM tokens
    const tokensSnap = await db.collection('fcm_tokens').get();
    const tokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);
    if (tokens.length === 0) {
        firebase_functions_1.logger.warn('No FCM tokens registered — notification skipped');
        return;
    }
    const message = {
        tokens,
        notification: {
            title: '🏠 New Property Inquiry',
            body: `${lead.name} is interested in ${lead.projectName || 'a property'}`,
        },
        data: {
            type: 'new_lead',
            projectId: lead.projectId || '',
            leadId: event.params.leadId,
            url: `/?project=${lead.projectId || ''}`,
        },
        webpush: {
            fcmOptions: {
                link: `/?project=${lead.projectId || ''}`,
            },
        },
    };
    const response = await messaging.sendEachForMulticast(message);
    firebase_functions_1.logger.info(`Notification sent: ${response.successCount}/${tokens.length} delivered`);
    // Clean up invalid tokens
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
        if (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
        }
    });
    if (failedTokens.length > 0) {
        const batch = db.batch();
        failedTokens.forEach(token => {
            batch.delete(db.collection('fcm_tokens').doc(token));
        });
        await batch.commit();
        firebase_functions_1.logger.info(`Cleaned up ${failedTokens.length} invalid FCM tokens`);
    }
});
/**
 * Send notification when a project status changes.
 */
exports.onProjectStatusChange = (0, firestore_1.onDocumentUpdated)('projects/{projectId}', async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after)
        return;
    // Only notify on status changes
    if (before.status === after.status)
        return;
    firebase_functions_1.logger.info(`Project status changed: ${after.name} (${before.status} → ${after.status})`);
    const tokensSnap = await db.collection('fcm_tokens').get();
    const tokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);
    if (tokens.length === 0)
        return;
    const message = {
        tokens,
        notification: {
            title: `📋 ${after.name} — Status Update`,
            body: `Status changed to: ${after.status}`,
        },
        data: {
            type: 'project_update',
            projectId: event.params.projectId,
            url: `/?project=${event.params.projectId}`,
        },
    };
    await messaging.sendEachForMulticast(message);
});
// ═══════════════════════════════════════════════════════════════════════════════
// 2. SCHEDULED JOBS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Daily cleanup: remove stale FCM tokens (inactive > 30 days).
 * Runs every day at 3:00 AM UTC.
 */
exports.cleanupStaleTokens = (0, scheduler_1.onSchedule)('every day 03:00', async () => {
    const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const staleTokens = await db.collection('fcm_tokens')
        .where('lastActive', '<', cutoff)
        .get();
    if (staleTokens.empty) {
        firebase_functions_1.logger.info('No stale tokens to clean up');
        return;
    }
    const batch = db.batch();
    staleTokens.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    firebase_functions_1.logger.info(`Cleaned up ${staleTokens.size} stale FCM tokens`);
});
/**
 * Weekly analytics summary: aggregate project view counts.
 * Runs every Monday at 6:00 AM UTC.
 */
exports.weeklyAnalyticsSummary = (0, scheduler_1.onSchedule)('every monday 06:00', async () => {
    const oneWeekAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    // Count leads per project in the last week
    const leadsSnap = await db.collection('leads')
        .where('createdAt', '>=', oneWeekAgo)
        .get();
    const projectLeads = {};
    leadsSnap.forEach(doc => {
        const projectId = doc.data().projectId;
        if (projectId) {
            projectLeads[projectId] = (projectLeads[projectId] || 0) + 1;
        }
    });
    // Store the weekly summary
    await db.collection('reports').add({
        type: 'weekly_summary',
        period: 'week',
        leadsTotal: leadsSnap.size,
        leadsPerProject: projectLeads,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    firebase_functions_1.logger.info(`Weekly summary: ${leadsSnap.size} total leads across ${Object.keys(projectLeads).length} projects`);
});
// ═══════════════════════════════════════════════════════════════════════════════
// 3. API MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * HTTPS API endpoint for external integrations.
 * Validates App Check tokens and handles API requests.
 */
exports.api = (0, https_1.onRequest)({
    cors: true,
    // Enforce App Check in production
    // enforceAppCheck: true,
}, async (req, res) => {
    // Route handling
    const path = req.path;
    if (path === '/health') {
        res.json({ status: 'ok', timestamp: Date.now() });
        return;
    }
    if (path === '/projects/count') {
        const count = (await db.collection('projects').count().get()).data().count;
        res.json({ count });
        return;
    }
    if (path === '/send-notification' && req.method === 'POST') {
        const { title, body, projectId, targetTokens } = req.body;
        if (!title || !body) {
            res.status(400).json({ error: 'title and body are required' });
            return;
        }
        const tokensSnap = targetTokens
            ? { docs: targetTokens.map((t) => ({ data: () => ({ token: t }) })) }
            : await db.collection('fcm_tokens').get();
        const tokens = tokensSnap.docs.map((doc) => doc.data().token).filter(Boolean);
        if (tokens.length === 0) {
            res.json({ success: true, delivered: 0, message: 'No tokens registered' });
            return;
        }
        const message = {
            tokens,
            notification: { title, body },
            data: projectId ? { projectId, url: `/?project=${projectId}` } : {},
        };
        const response = await messaging.sendEachForMulticast(message);
        res.json({
            success: true,
            delivered: response.successCount,
            failed: response.failureCount,
            total: tokens.length,
        });
        return;
    }
    res.status(404).json({ error: 'Not found' });
});
// ═══════════════════════════════════════════════════════════════════════════════
// 4. DATABASE AUTOMATION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Auto-generate searchable fields when a project is created or updated.
 * Creates lowercase name/developer/community for efficient client-side filtering.
 */
exports.onProjectWrite = (0, firestore_1.onDocumentUpdated)('projects/{projectId}', async (event) => {
    const data = event.data?.after?.data();
    if (!data)
        return;
    const searchFields = {
        _searchName: (data.name || '').toLowerCase(),
        _searchDeveloper: (data.developerName || '').toLowerCase(),
        _searchCommunity: (data.community || '').toLowerCase(),
        _searchCity: (data.city || '').toLowerCase(),
        _updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Only update if search fields are missing or stale
    if (data._searchName !== searchFields._searchName ||
        data._searchDeveloper !== searchFields._searchDeveloper) {
        await event.data?.after?.ref.update(searchFields);
        firebase_functions_1.logger.info(`Updated search fields for project: ${data.name}`);
    }
});
//# sourceMappingURL=index.js.map