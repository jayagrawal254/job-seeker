/**
 * Resume routes — /api/resumes endpoints.
 */
const express = require('express');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const resumeRepo = require('../repositories/resume.repository');
const resumeCtrl = require('../controllers/resume.controller');

// Resume uploads -> data/resumes, original name kept (sanitised), .pdf/.doc/.docx only.
resumeRepo.ensureDir();
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, resumeRepo.DIR),
        filename: (req, file, cb) => cb(null, path.basename(file.originalname).replace(/[^\w.() -]/g, '_'))
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /\.(pdf|docx?|)$/i.test(file.originalname))
});

router.get('/', resumeCtrl.listResumes);
router.post('/', upload.single('resume'), resumeCtrl.uploadResume);

module.exports = router;
