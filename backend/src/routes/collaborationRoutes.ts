/**
 * @openapi
 * tags:
 *   - name: Collaboration
 *     description: Real-time collaboration room management
 */

import express from 'express';
import { CollaborationRoomController } from '../controllers/collaborationRoomController';

const router: import('express').Router = express.Router();

/**
 * @openapi
 * /api/collaboration/rooms:
 *   post:
 *     tags: [Collaboration]
 *     summary: Create collaboration room
 *     responses:
 *       '200':
 *         description: Room created
 *   get:
 *     tags: [Collaboration]
 *     summary: List collaboration rooms
 *     responses:
 *       '200':
 *         description: Rooms listed
 */
router.post('/rooms', CollaborationRoomController.createRoom);
router.get('/rooms', CollaborationRoomController.listRooms);

/**
 * @openapi
 * /api/collaboration/rooms/{roomId}:
 *   get:
 *     tags: [Collaboration]
 *     summary: Get room by ID
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Room details
 */
router.get('/rooms/:roomId', CollaborationRoomController.getRoomById);

/**
 * @openapi
 * /api/collaboration/rooms/{roomId}/end:
 *   post:
 *     tags: [Collaboration]
 *     summary: End collaboration room
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Room ended
 */
router.post('/rooms/:roomId/end', CollaborationRoomController.endRoom);

export default router;
