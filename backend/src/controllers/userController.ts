import { Request, Response } from 'express';
import { userService } from '../services/userService';
import logger from '../utils/logger';

export const userController = {
  getProfile: async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const profile = await userService.getProfile(address);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (error) {
      logger.error('Error in getProfile controller', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateProfile: async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const updateData = req.body;
      
      // Note: In production, ensure the request is authenticated and signed by the address owner
      
      const updatedProfile = await userService.updateProfile(address, updateData);
      res.json(updatedProfile);
    } catch (error) {
      logger.error('Error in updateProfile controller', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getSettings: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const settings = await userService.getSettings(userId);
      res.json(settings);
    } catch (error) {
      logger.error('Error in getSettings controller', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateSettings: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const settingsData = req.body;
      
      const updatedSettings = await userService.updateSettings(userId, settingsData);
      res.json(updatedSettings);
    } catch (error) {
      logger.error('Error in updateSettings controller', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAchievements: async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const achievements = await userService.getAchievements(address);
      res.json(achievements);
    } catch (error) {
      logger.error('Error in getAchievements controller', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  
  getStats: async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const stats = await userService.getProfileStats(address);
      res.json(stats);
    } catch (error) {
      logger.error('Error in getStats controller', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};