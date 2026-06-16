/**
 * Assignment Controller
 * Handles all assignment-related operations
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  Assignment, 
  AssignmentType, 
  SubmissionType, 
  LatePolicy,
  AssignmentStats,
  StudentAssignmentProgress
} from '../models/Assignment';
import { UserRole } from '../models/User';
import { AssignmentService } from '../services/assignmentService';
import { FileUploadService } from '../services/fileUploadService';
import GradingService from '../services/gradingService';
import { PlagiarismService } from '../services/plagiarismService';
import { NotificationService } from '../services/NotificationService';
import { validateAssignment, validateSubmission } from '../utils/validation';
import logger from '../utils/logger';

export class AssignmentController {
  constructor(
    private assignmentService: AssignmentService,
    private fileUploadService: FileUploadService,
    private gradingService: any,
    private plagiarismService: PlagiarismService,
    private notificationService: NotificationService
  ) {}

  private getAuthenticatedUser(req: AuthenticatedRequest, res: Response): { id: string; role: UserRole } | undefined {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return undefined;
    }
    return { id: req.user.id, role: req.user.role };
  }

  // Assignment Management
  async createAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const assignmentData = req.body;
      
      // Validate user is instructor for the course
      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (user.role !== UserRole.EDUCATOR && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Validate assignment data
      const validation = validateAssignment(assignmentData);
      const validationError = Array.isArray(validation.errors) && validation.errors.length > 0 ? (validation.errors[0] as any).message : undefined;
      if (!validation.isValid) {
        return res.status(400).json({ error: (validation as any).error || validationError || 'Validation failed' });
      }

      const assignment = await this.assignmentService.createAssignment({
        ...assignmentData,
        courseId,
        createdBy: user.id
      });

      // Notify enrolled students
      await (this.notificationService as any).notifyAssignmentCreated(assignment);

      logger.info(`Assignment created: ${assignment.id} by ${user.id}`);
      res.status(201).json(assignment);
    } catch (error: unknown) {
      logger.error('Error creating assignment:', error);
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  }

  async getAssignments(req: AuthenticatedRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const { page = 1, limit = 10, status, type } = req.query;

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      const assignments = await this.assignmentService.getAssignments({
        courseId,
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        type: type as AssignmentType,
        userId: user.id,
        userRole: user.role
      });

      res.json(assignments);
    } catch (error: unknown) {
      logger.error('Error fetching assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }

  async getAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;
      
      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      const assignment = await this.assignmentService.getAssignment(
        assignmentId,
        user.id,
        user.role
      );

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      res.json(assignment);
    } catch (error: unknown) {
      logger.error('Error fetching assignment:', error);
      res.status(500).json({ error: 'Failed to fetch assignment' });
    }
  }

  async updateAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;
      const updateData = req.body;

      // Check permissions
      const assignment = await this.assignmentService.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (assignment.createdBy !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updatedAssignment = await this.assignmentService.updateAssignment(
        assignmentId,
        updateData
      );

      logger.info(`Assignment updated: ${assignmentId} by ${user.id}`);
      res.json(updatedAssignment);
    } catch (error: unknown) {
      logger.error('Error updating assignment:', error);
      res.status(500).json({ error: 'Failed to update assignment' });
    }
  }

  async deleteAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;

      // Check permissions
      const assignment = await this.assignmentService.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (assignment.createdBy !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await this.assignmentService.deleteAssignment(assignmentId);

      logger.info(`Assignment deleted: ${assignmentId} by ${user.id}`);
      res.status(204).send();
    } catch (error: unknown) {
      logger.error('Error deleting assignment:', error);
      res.status(500).json({ error: 'Failed to delete assignment' });
    }
  }

  // Submission Management
  async createSubmission(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;
      
      // Validate assignment exists and is accessible
      const assignment = await this.assignmentService.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Check if submission is still allowed
      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (!await this.assignmentService.canSubmit(assignmentId, user.id)) {
        return res.status(403).json({ error: 'Submission not allowed' });
      }

      const submissionData = req.body;
      
      // Handle file uploads if present
      if (req.files && Array.isArray(req.files)) {
        const uploadedFiles = await this.fileUploadService.uploadFiles(
          req.files,
          `assignments/${assignmentId}/submissions/${user.id}`
        );
        submissionData.files = uploadedFiles;
      }

      const submission = await this.assignmentService.createSubmission({
        ...submissionData,
        assignmentId,
        studentId: user.id,
      });

      if (assignment.plagiarismCheck) {
        this.plagiarismService.checkPlagiarism(submission.id).catch((error: unknown) => {
          logger.error('Plagiarism check failed:', error);
        });
      }

      // Auto-grade if enabled and applicable
      if (assignment.autoGrade) {
        this.gradingService.autoGrade(submission.id).catch((error: unknown) => {
          logger.error('Auto-grading failed:', error);
        });
      }

      logger.info(`Submission created: ${submission.id} for assignment: ${assignmentId}`);
      res.status(201).json(submission);
    } catch (error: unknown) {
      logger.error('Error creating submission:', error);
      res.status(500).json({ error: 'Failed to create submission' });
    }
  }

  async getSubmissions(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;
      const { page = 1, limit = 10, status, graded } = req.query;

      // Check permissions - instructors can see all submissions, students only their own
      const assignment = await this.assignmentService.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      const isInstructor = assignment.createdBy === user.id || user.role === UserRole.ADMIN;

      const submissions = await this.assignmentService.getSubmissions({
        assignmentId,
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        graded: graded === 'true',
        userId: isInstructor ? undefined : user.id,
        isInstructor
      });

      res.json(submissions);
    } catch (error: unknown) {
      logger.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  }

  async getSubmission(req: AuthenticatedRequest, res: Response) {
    try {
      const { submissionId } = req.params;
      
      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      const submission = await this.assignmentService.getSubmission(
        submissionId,
        user.id,
        user.role
      );

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      res.json(submission);
    } catch (error: unknown) {
      logger.error('Error fetching submission:', error);
      res.status(500).json({ error: 'Failed to fetch submission' });
    }
  }

  async updateSubmission(req: AuthenticatedRequest, res: Response) {
    try {
      const { submissionId } = req.params;
      const updateData = req.body;

      const submission = await this.assignmentService.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Students can only update their own draft submissions
      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (submission.studentId !== user.id || submission.status !== 'draft') {
        return res.status(403).json({ error: 'Cannot update submission' });
      }

      // Handle file uploads if present
      if (req.files && Array.isArray(req.files)) {
        const uploadedFiles = await this.fileUploadService.uploadFiles(
          req.files,
          `assignments/${submission.assignmentId}/submissions/${user.id}`
        );
        updateData.files = [...(submission.files || []), ...uploadedFiles];
      }

      const updatedSubmission = await this.assignmentService.updateSubmission(
        submissionId,
        updateData
      );

      logger.info(`Submission updated: ${submissionId} by ${user.id}`);
      res.json(updatedSubmission);
    } catch (error: unknown) {
      logger.error('Error updating submission:', error);
      res.status(500).json({ error: 'Failed to update submission' });
    }
  }

  async submitAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const { submissionId } = req.params;

      const submission = await this.assignmentService.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (submission.studentId !== user.id) {
        return res.status(403).json({ error: 'Cannot submit assignment' });
      }

      const submittedSubmission = await this.assignmentService.submitSubmission(submissionId);

      // Trigger plagiarism check if enabled
      const assignment = await this.assignmentService.getAssignment(submission.assignmentId);
      if (assignment?.plagiarismCheck) {
        this.plagiarismService.checkPlagiarism(submissionId).catch((error: unknown) => {
          logger.error('Plagiarism check failed:', error);
        });
      }

      // Auto-grade if enabled
      if (assignment?.autoGrade) {
        this.gradingService.autoGrade(submissionId).catch((error: unknown) => {
          logger.error('Auto-grading failed:', error);
        });
      }

      logger.info(`Assignment submitted: ${submissionId} by ${user.id}`);
      res.json(submittedSubmission);
    } catch (error: unknown) {
      logger.error('Error submitting assignment:', error);
      res.status(500).json({ error: 'Failed to submit assignment' });
    }
  }

  // Grading Management
  async gradeSubmission(req: AuthenticatedRequest, res: Response) {
    try {
      const { submissionId } = req.params;
      const gradingData = req.body;

      // Check permissions
      const submission = await this.assignmentService.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const assignment = await this.assignmentService.getAssignment(submission.assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (assignment.createdBy !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const grade = await this.gradingService.gradeSubmission({
        ...gradingData,
        submissionId,
        gradedBy: user.id
      });

      // Notify student
      await (this.notificationService as any).notifyGradeCreated(grade);

      logger.info(`Submission graded: ${submissionId} by ${user.id}`);
      res.status(201).json(grade);
    } catch (error: unknown) {
      logger.error('Error grading submission:', error);
      res.status(500).json({ error: 'Failed to grade submission' });
    }
  }

  async getGrades(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      // Check permissions
      const assignment = await this.assignmentService.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (assignment.createdBy !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const grades = await this.gradingService.getGrades({
        assignmentId,
        page: Number(page),
        limit: Number(limit),
        status: status as string
      });

      res.json(grades);
    } catch (error: unknown) {
      logger.error('Error fetching grades:', error);
      res.status(500).json({ error: 'Failed to fetch grades' });
    }
  }

  // Statistics and Analytics
  async getAssignmentStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;

      // Check permissions
      const assignment = await this.assignmentService.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (assignment.createdBy !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const stats: AssignmentStats = await this.assignmentService.getAssignmentStats(assignmentId);

      res.json(stats);
    } catch (error: unknown) {
      logger.error('Error fetching assignment stats:', error);
      res.status(500).json({ error: 'Failed to fetch assignment stats' });
    }
  }

  async getStudentProgress(req: AuthenticatedRequest, res: Response) {
    try {
      const { courseId } = req.params;

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      const progress: StudentAssignmentProgress[] = await this.assignmentService.getStudentProgress(courseId, user.id);

      res.json(progress);
    } catch (error: unknown) {
      logger.error('Error fetching student progress:', error);
      res.status(500).json({ error: 'Failed to fetch student progress' });
    }
  }

  // Bulk Operations
  async bulkGrade(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;
      const { operation, criteria, gradingData } = req.body;

      // Check permissions
      const assignment = await this.assignmentService.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const user = this.getAuthenticatedUser(req, res);
      if (!user) return;

      if (assignment.createdBy !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const operationId = await this.gradingService.startBulkGrading({
        assignmentId,
        operation,
        criteria,
        gradingData,
        instructorId: user.id
      });

      logger.info(`Bulk grading started: ${operationId} for assignment: ${assignmentId}`);
      res.status(202).json({ operationId });
    } catch (error: unknown) {
      logger.error('Error starting bulk grading:', error);
      res.status(500).json({ error: 'Failed to start bulk grading' });
    }
  }
}
