/**
 * Resume controller — handles HTTP request/response for resume endpoints.
 */
const resumeRepo = require('../repositories/resume.repository');
const { ValidationError } = require('../utils/errors');

function listResumes(req, res) {
    res.json(resumeRepo.listResumes());
}

function uploadResume(req, res) {
    if (!req.file) throw new ValidationError('no file uploaded (field name must be "resume", pdf/doc/docx)');
    res.json({ filename: req.file.filename });
}

module.exports = { listResumes, uploadResume };
