/**
 * Upload Middleware
 * Multer configuration for file uploads
 * Security Audit Remediation (SEC-009): CSV content validation
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const csv = require('csv-parser');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${uuidv4()}-${Date.now()}`;
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    cb(null, `${uniqueSuffix}-${basename}${extension}`);
  }
});

const validateCSVContent = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let lineCount = 0;
    const maxLinesToCheck = 10;
    const suspiciousPatterns = [
      /^=/,
      /^\+/,
      /^-/,
      /^@/,
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i
    ];

    fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 64 * 1024 })
      .pipe(csv())
      .on('data', (row) => {
        if (lineCount < maxLinesToCheck) {
          lineCount++;
          const values = Object.values(row);
          for (const value of values) {
            if (typeof value === 'string') {
              for (const pattern of suspiciousPatterns) {
                if (pattern.test(value.trim())) {
                  return reject(new Error('File contains potentially malicious content'));
                }
              }
            }
          }
          results.push(row);
        }
      })
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error('CSV file is empty or has no valid data rows'));
        } else {
          resolve({ valid: true, sampleRows: results.length });
        }
      })
      .on('error', (err) => {
        reject(new Error(`Invalid CSV format: ${err.message}`));
      });
  });
};

const fileFilter = (req, file, cb) => {
  const allowedMimetypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain'
  ];
  
  const allowedExtensions = ['.csv'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (
    allowedMimetypes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1 // Only one file per request
  }
});

// CSV file upload middleware
const uploadCSV = upload.single('file');

// Error handler middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File Too Large',
        message: 'The uploaded file exceeds the maximum allowed size of 10MB'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Invalid File',
        message: 'Unexpected file field. Please use "file" as the field name.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too Many Files',
        message: 'Only one file can be uploaded at a time'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Upload Error',
      message: err.message
    });
  }
  
  // Other errors
  if (err) {
    return res.status(400).json({
      success: false,
      error: 'Upload Error',
      message: err.message
    });
  }
  
  next();
};

// Delete uploaded file helper
const deleteUploadedFile = (filename) => {
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

module.exports = {
  upload,
  uploadCSV,
  handleUploadError,
  deleteUploadedFile,
  uploadsDir,
  validateCSVContent
};
