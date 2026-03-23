const { UserRole } = require('../models/User');

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  [UserRole.STUDENT]: 1,
  [UserRole.EDUCATOR]: 2,
  [UserRole.ADMIN]: 3
};

// Permission constants
const PERMISSIONS = {
  // Course permissions
  COURSE_CREATE: 'course:create',
  COURSE_READ: 'course:read',
  COURSE_UPDATE: 'course:update',
  COURSE_DELETE: 'course:delete',
  
  // Quiz permissions
  QUIZ_CREATE: 'quiz:create',
  QUIZ_READ: 'quiz:read',
  QUIZ_UPDATE: 'quiz:update',
  QUIZ_DELETE: 'quiz:delete',
  
  // User management permissions
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_ASSIGN_ROLE: 'user:assign_role',
  
  // Admin permissions
  ADMIN_PANEL: 'admin:panel',
  SYSTEM_MANAGE: 'system:manage',
  
  // Content permissions
  CONTENT_CREATE: 'content:create',
  CONTENT_READ: 'content:read',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete'
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [UserRole.STUDENT]: [
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.QUIZ_READ,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.USER_READ
  ],
  
  [UserRole.EDUCATOR]: [
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.COURSE_UPDATE,
    PERMISSIONS.QUIZ_CREATE,
    PERMISSIONS.QUIZ_READ,
    PERMISSIONS.QUIZ_UPDATE,
    PERMISSIONS.QUIZ_DELETE,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.USER_READ
  ],
  
  [UserRole.ADMIN]: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS)
  ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether role has permission
 */
function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a user role has higher or equal hierarchy level
 * @param {string} userRole - User role
 * @param {string} requiredRole - Required role
 * @returns {boolean} - Whether user has sufficient role level
 */
function hasRoleLevel(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]} - Array of permissions
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user can perform action on resource
 * @param {string} userRole - User role
 * @param {string} action - Action (create, read, update, delete)
 * @param {string} resource - Resource type (course, quiz, user, etc.)
 * @returns {boolean} - Whether user can perform action
 */
function canPerformAction(userRole, action, resource) {
  const permission = `${resource}:${action}`;
  return hasPermission(userRole, permission);
}

module.exports = {
  UserRole,
  ROLE_HIERARCHY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasRoleLevel,
  getRolePermissions,
  canPerformAction
};
