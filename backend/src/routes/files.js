const express = require('express');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { s3Client, bucketName } = require('../config/s3');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// POST /api/files/upload
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se envió ningún archivo' });
    }

    const ext = req.file.originalname.split('.').pop();
    const key = `uploads/${uuidv4()}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        key,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: 'Error al subir archivo' });
  }
});

// GET /api/files/signed-url/:key — get presigned URL for private files
router.get('/signed-url/*', auth, async (req, res) => {
  try {
    const key = req.params[0];
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
      { expiresIn: 3600 }
    );
    res.json({ success: true, data: { url } });
  } catch (err) {
    console.error('Signed URL error:', err);
    res.status(500).json({ success: false, error: 'Error al generar URL' });
  }
});

module.exports = router;
