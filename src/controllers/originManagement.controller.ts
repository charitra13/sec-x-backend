import { Request, Response } from 'express';
import { originManagementService } from '../services/originManagement.service';
import { IAuthRequest } from '../middleware/auth.middleware';

export const getAllOrigins = async (req: Request, res: Response) => {
  try {
    const origins = originManagementService.getAllOrigins();
    const stats = originManagementService.getOriginStats();

    res.json({
      success: true,
      data: {
        origins,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch origins',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const addOrigin = async (req: IAuthRequest, res: Response) => {
  try {
    const { url, environment, description, tags = [] } = req.body;
    
    if (!url || !environment || !description) {
      return res.status(400).json({
        success: false,
        message: 'url, environment, and description are required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }

    const newOrigin = await originManagementService.addOrigin({
      url,
      environment,
      description,
      addedBy: req.user?.email || 'system',
      isActive: true,
      tags
    });

    res.status(201).json({
      success: true,
      message: 'Origin added successfully',
      data: newOrigin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add origin',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateOrigin = async (req: Request, res: Response) => {
  try {
    const { originId } = req.params;
    const updates = req.body;

    const updatedOrigin = await originManagementService.updateOrigin(originId, updates);
    
    if (!updatedOrigin) {
      return res.status(404).json({
        success: false,
        message: 'Origin not found'
      });
    }

    res.json({
      success: true,
      message: 'Origin updated successfully',
      data: updatedOrigin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update origin',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const removeOrigin = async (req: Request, res: Response) => {
  try {
    const { originId } = req.params;
    
    const removed = await originManagementService.removeOrigin(originId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Origin not found'
      });
    }

    res.json({
      success: true,
      message: 'Origin removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove origin',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 