/**
 * @fileoverview migrate_mongo_to_postgres.js
 * @module migrate_mongo_to_postgres
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license AGPL-3.0-only
 * ============================================================================
 */
const { MongoClient, ObjectId } = require('mongodb');
const { PrismaClient } = require('../prisma/generated/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
}

const idMap = new Map();

async function migrate() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        const db = client.db();


        console.log('\n--- Migrating Users ---');
        const mongoUsers = await db.collection('users').find().toArray();

        for (const user of mongoUsers) {
            const oldId = user._id.toString();


            let existingUser = await prisma.user.findUnique({
                where: { uid: user.uid }
            });

            if (!existingUser && user.email) {
                existingUser = await prisma.user.findUnique({ where: { email: user.email } });
            }

            let newUserId;
            if (existingUser) {
                console.log(`User exists: ${user.email} (${existingUser.id})`);
                newUserId = existingUser.id;
            } else {

                const newUser = await prisma.user.create({
                    data: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.name || 'User',
                        photoURL: user.photoURL,
                        bio: user.bio,
                        status: user.status || 'offline',
                        lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date(),
                        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
                        updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),


                        githubIntegration: user.integrations?.github || null,
                        googleIntegration: user.integrations?.google || null,
                        chatRequests: user.chatRequests || [],


                        connections: user.connections || [],
                        closeFriends: user.closeFriends || [],


                        isPhoneVerified: false,
                    }
                });
                console.log(`Created User: ${user.email} (${newUser.id})`);
                newUserId = newUser.id;
            }

            idMap.set(oldId, newUserId);
        }
        console.log(`mapped ${idMap.size} users.`);


        console.log('\n--- Migrating Teams ---');
        const mongoTeams = await db.collection('teams').find().toArray();

        for (const team of mongoTeams) {
            const ownerId = idMap.get(team.ownerId?.toString());
            if (!ownerId) {
                console.warn(`Skipping team ${team.name}: Owner ${team.ownerId} not found`);
                continue;
            }


            const members = (team.members || []).map(m => idMap.get(m?.toString())).filter(Boolean);

            const newTeam = await prisma.team.create({
                data: {
                    name: team.name,
                    description: team.description,
                    ownerId: ownerId,
                    members: members,
                    createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
                    updatedAt: team.updatedAt ? new Date(team.updatedAt) : new Date(),
                }
            });
            console.log(`Created Team: ${newTeam.name}`);


            idMap.set(team._id.toString(), newTeam.id);
        }


        console.log('\n--- Migrating Projects ---');
        const mongoProjects = await db.collection('projects').find().toArray();

        for (const project of mongoProjects) {

            const ownerId = idMap.get(project.ownerId?.toString());

            const teamId = project.team ? idMap.get(project.team.toString()) : null;

            if (!ownerId && !teamId) {
                console.warn(`Skipping project ${project.name}: No valid Owner or Team found`);
                continue;
            }


            const collaborators = (project.collaborators || []).map(c => idMap.get(c?.toString())).filter(Boolean);


            const newProject = await prisma.project.create({
                data: {
                    name: project.name,
                    description: project.description,
                    repoName: project.repoName,
                    isPublic: project.isPublic || false,
                    repository: project.repository || null,

                    ownerId: ownerId,


                    team: teamId,
                    collaborators: collaborators,

                    architecture: project.architecture || null,

                    createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
                    updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date(),
                }
            });
            console.log(`Created Project: ${newProject.name} (${newProject.id})`);


            if (project.steps && Array.isArray(project.steps)) {
                for (const step of project.steps) {
                    const newStep = await prisma.step.create({
                        data: {
                            projectId: newProject.id,
                            title: step.title,
                            status: step.status || 'pending',
                            order: step.order || 0,
                        }
                    });

                    if (step.tasks && Array.isArray(step.tasks)) {
                        for (const task of step.tasks) {
                            const assignedTo = idMap.get(task.assignedTo?.toString());

                            await prisma.projectTask.create({
                                data: {
                                    stepId: newStep.id,
                                    title: task.title,
                                    description: task.description,
                                    status: task.status || 'pending',
                                    priority: task.priority || 'medium',
                                    dueDate: task.dueDate ? new Date(task.dueDate) : null,
                                    assignedTo: assignedTo || null,
                                    assignedBy: ownerId,
                                }
                            });
                        }
                    }
                }
            }
        }


        console.log('\n--- Migration Complete ---');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.close();
        await prisma.$disconnect();
    }
}

migrate();
