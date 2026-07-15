import { Router, json as expressJson } from 'express';
import multer from 'multer';
import { prisma } from '@agentlab/database';
import { authenticate } from '../middleware/auth.js';
import { ragEngine } from '@agentlab/rag';
import { documentProcessingQueue } from '@agentlab/queue';
import { logger } from '../index.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`));
    }
  },
});

router.use(authenticate);

// JSON parser for non-file-upload routes (search, etc.)
router.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/search') {
    expressJson({ limit: '1mb' })(req, res, next);
  } else {
    next();
  }
});

router.get('/', async (req, res) => {
  const { workspaceId } = req.query;

  const documents = await prisma.document.findMany({
    where: {
      workspaceId: workspaceId as string,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: documents });
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const { workspaceId } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  if (!workspaceId) {
    return res.status(400).json({ success: false, error: 'Workspace ID is required' });
  }

  logger.info({ fileName: req.file.originalname, fileSize: req.file.size, mimeType: req.file.mimetype, workspaceId }, 'Uploading document');

  // Verify workspace access
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      users: { some: { userId: req.user!.id } },
    },
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  // Extract content based on file type
  let content: string | null = null;
  const mimeType = req.file.mimetype;

  try {
    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'text/csv' || mimeType === 'application/json') {
      // Text files: store as UTF-8
      content = req.file.buffer.toString('utf-8');
    } else if (mimeType === 'application/pdf') {
      // PDF: extract text using pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(req.file.buffer) }).promise;
      const textContent: string[] = [];
      
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        textContent.push(pageText);
      }
      
      content = textContent.join('\n\n');
      logger.info({ pages: doc.numPages, textLength: content.length }, 'PDF text extracted');
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX: extract text using mammoth
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      content = result.value || '';
      logger.info({ textLength: content?.length ?? 0 }, 'DOCX text extracted');
    } else {
      // Try to read as text, fallback to null
      try {
        content = req.file.buffer.toString('utf-8');
        // Check if content contains null bytes
        if (content.includes('\0')) {
          content = null;
          logger.warn('File contains binary data - stored without content');
        }
      } catch {
        content = null;
      }
    }
  } catch (extractError) {
    logger.error({ error: extractError, mimeType }, 'Failed to extract text from file');
    content = null;
  }

  const document = await prisma.document.create({
    data: {
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      content,
      status: content ? 'PENDING' : 'COMPLETED', // Skip processing if no content
      workspaceId,
    },
  });

  logger.info({ documentId: document.id, hasContent: Boolean(content) }, 'Document created');

  // Queue for processing only if we have content
  if (content) {
    await documentProcessingQueue.add('process-document', {
      documentId: document.id,
      workspaceId,
    });
  }

  res.status(201).json({ success: true, data: document });
});

router.get('/:id', async (req, res) => {
  const document = await prisma.document.findFirst({
    where: {
      id: req.params.id,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
    include: { chunks: { take: 10 } },
  });

  if (!document) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }

  res.json({ success: true, data: document });
});

router.delete('/:id', async (req, res) => {
  await prisma.document.delete({
    where: {
      id: req.params.id,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
  });

  res.json({ success: true, message: 'Document deleted' });
});

router.post('/search', async (req, res) => {
  const { query, workspaceId, topK = 5 } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query required' });
  }

  // Get document IDs for workspace
  const documents = await prisma.document.findMany({
    where: {
      workspaceId,
      workspace: { users: { some: { userId: req.user!.id } } },
    },
    select: { id: true },
  });

  const documentIds = documents.map((d) => d.id);

  const results = await ragEngine.search({
    query,
    topK,
    documentIds,
  });

  res.json({ success: true, data: results });
});

export { router as documentRoutes };
