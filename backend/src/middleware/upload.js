/**
 * Upload Middleware
 * Multer configuration for file uploads
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: uuid + original name
    const uniqueSuffix = `${uuidv4()}-${Date.now()}`;
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    cb(null, `${uniqueSuffix}-${basename}${extension}`);
  }
});

// File filter - only CSV files
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
  uploadsDir
};
