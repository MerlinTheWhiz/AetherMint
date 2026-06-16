import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Strips HTML tags from a string.
 * @param str The string to sanitize
 */
const stripHtml = (str: string): string => {
  return str
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '') // Remove script tags AND content
    .replace(/<[^>]*>?/gm, '') // Remove all other tags
    .trim();
};

/**
 * Escapes characters that could be used for NoSQL injection.
 * Specifically prevents the use of MongoDB operators starting with $.
 * @param obj The object to sanitize
 */
const sanitizeNoSql = (obj: any): any => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (key.startsWith('$')) {
        const newKey = key.replace(/^\$/, '');
        obj[newKey] = obj[key];
        delete obj[key];
        sanitizeNoSql(obj[newKey]);
      } else {
        sanitizeNoSql(obj[key]);
      }
    }
  }
  return obj;
};

/**
 * Escapes special characters for SQL queries to prevent SQL injection.
 * Note: Parameterized queries should always be used as the primary defense.
 * @param str The string to sanitize
 */
const escapeSql = (str: string): string => {
  return str.replace(/['"\\\b\f\n\r\t\v\0]/g, (char) => {
    switch (char) {
      case "'": return "''";
      case "\"": return "\\\"";
      case "\\": return "\\\\";
      case "\b": return "\\b";
      case "\f": return "\\f";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\t": return "\\t";
      case "\v": return "\\v";
      case "\0": return "\\0";
      default: return char;
    }
  });
};

/**
 * Recursively sanitizes an object by stripping HTML and escaping SQL/NoSQL patterns.
 * @param obj The object to sanitize
 */
const sanitizeRecursive = (obj: any): any => {
  if (typeof obj === 'string') {
    let sanitized = stripHtml(obj);
    sanitized = escapeSql(sanitized);
    return sanitized;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeRecursive(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Sanitize key for NoSQL injection
        const sanitizedKey = key.startsWith('$') ? key.replace(/^\$/, '') : key;
        sanitizedObj[sanitizedKey] = sanitizeRecursive(obj[key]);
      }
    }
    return sanitizedObj;
  }

  return obj;
};

/**
 * Sanitizes file upload metadata.
 * @param file The file object from multer
 */
const sanitizeFileMetadata = (file: any) => {
  if (file.originalname) {
    file.originalname = stripHtml(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_');
  }
  if (file.fieldname) {
    file.fieldname = stripHtml(file.fieldname);
  }
};

/**
 * Middleware to sanitize all incoming request data.
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize Body
    if (req.body) {
      req.body = sanitizeRecursive(req.body);
    }

    // Sanitize Query Parameters
    if (req.query) {
      req.query = sanitizeRecursive(req.query);
    }

    // Sanitize URL Parameters
    if (req.params) {
      req.params = sanitizeRecursive(req.params);
    }

    // Sanitize File Metadata
    if (req.file) {
      sanitizeFileMetadata(req.file);
    }
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(sanitizeFileMetadata);
      } else {
        Object.values(req.files).forEach((fileArray: any) => {
          fileArray.forEach(sanitizeFileMetadata);
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    next(error);
  }
};

/**
 * Rejects requests with suspicious patterns (XSS, SQLi, NoSQLi).
 */
export const detectSuspiciousPatterns = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousRegex = [
    /<script\b[^>]*>([\s\S]*?)<\/script>/i,
    /on\w+="[^"]*"/i,
    /javascript:[^"]*/i,
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b/i,
    /('\s*--)|(--\s*')|(\/\*)|(\*\/)/i,
    /\{\s*"\$/ // Potential NoSQL operator in JSON string
  ];

  const checkSuspicious = (obj: any): boolean => {
    const str = JSON.stringify(obj);
    return suspiciousRegex.some((regex) => regex.test(str));
  };

  if (checkSuspicious(req.body) || checkSuspicious(req.query) || checkSuspicious(req.params)) {
    logger.warn(`Suspicious activity detected from IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'Request rejected due to suspicious patterns.',
    });
  }

  next();
};
