const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')

require('ts-node/register/transpile-only')
require('tsconfig-paths/register')

function loadWithMocks(modulePath, mocks) {
  const resolved = require.resolve(modulePath)
  delete require.cache[resolved]

  const originalLoad = Module._load
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request]
    }

    return originalLoad.call(this, request, parent, isMain)
  }

  try {
    return require(resolved)
  } finally {
    Module._load = originalLoad
  }
}

function createApiUtilsMock() {
  return {
    successResponse(data, message = 'Success', meta, status = 200) {
      return new Response(JSON.stringify({ success: true, data, message, meta }), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    },
    handleApiError(error) {
      return new Response(JSON.stringify({
        success: false,
        message: error?.message || 'Internal server error',
      }), {
        status: error?.statusCode || 500,
        headers: { 'content-type': 'application/json' },
      })
    },
  }
}

function createPermissionsMock() {
  class ApiError extends Error {
    constructor(statusCode, message) {
      super(message)
      this.statusCode = statusCode
    }
  }

  return {
    ApiError,
    requireAuth: async () => ({
      userId: 'user-1',
      email: 'user@example.com',
      roles: ['BUYER'],
      permissions: [],
      companyId: 'company-a',
    }),
  }
}

function createUploadRequest(file, extraFields = {}) {
  const formData = new FormData()
  formData.append('file', file)
  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, value)
  }

  return {
    headers: new Headers(),
    async formData() {
      return formData
    },
  }
}

test('unauthenticated upload is blocked', async () => {
  const permissions = createPermissionsMock()
  permissions.requireAuth = async () => {
    throw new permissions.ApiError(401, 'Authentication required')
  }

  const route = loadWithMocks('../../app/api/upload/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': createApiUtilsMock(),
    '@/lib/storage': { uploadImage: async () => ({}), uploadFile: async () => ({}) },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
    '@/lib/upload/security': {
      validateUploadPurpose: () => ({ purpose: 'product_image', kind: 'image', folder: 'products', isPrivate: false }),
      sanitizeFilename: (value) => value,
      validateFileMimeType: () => ({ mimeType: 'image/png' }),
      validateFileSize: () => {},
      requireUploadEntityAccess: async () => ({ companyId: 'company-a' }),
      createUploadAuditLog: async () => {},
      createPrivateUploadAccessUrl: async () => null,
    },
    '@prisma/client': { FraudEventType: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
  })

  const response = await route.POST(createUploadRequest(new File(['x'], 'photo.png', { type: 'image/png' })))
  assert.equal(response.status, 401)
})

test('wrong MIME type is blocked', async () => {
  const permissions = createPermissionsMock()
  const route = loadWithMocks('../../app/api/upload/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': createApiUtilsMock(),
    '@/lib/storage': { uploadImage: async () => ({}), uploadFile: async () => ({}) },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
    '@/lib/upload/security': {
      validateUploadPurpose: () => ({ purpose: 'company_certificate', kind: 'image_or_document', folder: 'certificates', isPrivate: true }),
      sanitizeFilename: (value) => value,
      validateFileMimeType: () => {
        throw new permissions.ApiError(400, 'Unsupported file type')
      },
      validateFileSize: () => {},
      requireUploadEntityAccess: async () => ({ companyId: 'company-a' }),
      createUploadAuditLog: async () => {},
      createPrivateUploadAccessUrl: async () => 'https://signed.example/file',
    },
    '@prisma/client': { FraudEventType: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
  })

  const response = await route.POST(createUploadRequest(
    new File(['alert(1)'], 'payload.js', { type: 'application/javascript' }),
    { purpose: 'company_certificate', companyId: 'company-a' }
  ))

  assert.equal(response.status, 400)
})

test('oversized upload is blocked', async () => {
  const permissions = createPermissionsMock()
  const route = loadWithMocks('../../app/api/upload/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': createApiUtilsMock(),
    '@/lib/storage': { uploadImage: async () => ({}), uploadFile: async () => ({}) },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
    '@/lib/upload/security': {
      validateUploadPurpose: () => ({ purpose: 'product_image', kind: 'image', folder: 'products', isPrivate: false }),
      sanitizeFilename: (value) => value,
      validateFileMimeType: () => ({ mimeType: 'image/png' }),
      validateFileSize: () => {
        throw new permissions.ApiError(400, 'File too large. Max 10 MB.')
      },
      requireUploadEntityAccess: async () => ({ companyId: 'company-a' }),
      createUploadAuditLog: async () => {},
      createPrivateUploadAccessUrl: async () => null,
    },
    '@prisma/client': { FraudEventType: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
  })

  const response = await route.POST(createUploadRequest(
    new File([Buffer.alloc(5)], 'huge.png', { type: 'image/png' }),
    { purpose: 'product_image', companyId: 'company-a' }
  ))

  assert.equal(response.status, 400)
})

test('cross-company document attach is blocked', async () => {
  const permissions = createPermissionsMock()
  const route = loadWithMocks('../../app/api/upload/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': createApiUtilsMock(),
    '@/lib/storage': { uploadImage: async () => ({}), uploadFile: async () => ({}) },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
    '@/lib/upload/security': {
      validateUploadPurpose: () => ({ purpose: 'company_doc', kind: 'image_or_document', folder: 'companies/documents', isPrivate: true }),
      sanitizeFilename: (value) => value,
      validateFileMimeType: () => ({ mimeType: 'application/pdf' }),
      validateFileSize: () => {},
      requireUploadEntityAccess: async () => {
        throw new permissions.ApiError(403, 'Access denied: Not a member of this company')
      },
      createUploadAuditLog: async () => {},
      createPrivateUploadAccessUrl: async () => 'https://signed.example/file',
    },
    '@prisma/client': { FraudEventType: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
  })

  const response = await route.POST(createUploadRequest(
    new File(['pdf'], 'certificate.pdf', { type: 'application/pdf' }),
    { purpose: 'company_doc', companyId: 'company-b' }
  ))

  assert.equal(response.status, 403)
})

test('private document access is blocked for unrelated user', async () => {
  const permissions = createPermissionsMock()
  const route = loadWithMocks('../../app/api/upload/access/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': createApiUtilsMock(),
    '@/lib/upload/security': {
      validateUploadPurpose: () => ({ purpose: 'kyc_document', isPrivate: true }),
      extractStorageKeyFromUrl: () => 'kyc/documents/file.pdf',
      requireUploadEntityAccess: async () => {
        throw new permissions.ApiError(403, 'Access denied')
      },
      createPrivateUploadAccessUrl: async () => 'https://signed.example/private-file',
    },
  })

  const response = await route.GET({
    url: 'http://localhost/api/upload/access?purpose=kyc_document&key=kyc/documents/file.pdf',
    headers: new Headers(),
  })

  assert.equal(response.status, 403)
})

test('upload audit log is created', async () => {
  const permissions = createPermissionsMock()
  const auditCalls = []
  const route = loadWithMocks('../../app/api/upload/route', {
    '@/lib/permissions': permissions,
    '@/lib/utils/api': createApiUtilsMock(),
    '@/lib/storage': {
      uploadImage: async () => ({ url: 'https://cdn.example/file.webp', key: 'companies/documents/file.webp', size: 128, mimeType: 'image/webp', filename: 'file.webp' }),
      uploadFile: async () => ({ url: 'https://storage.example/file.pdf', key: 'companies/documents/file.pdf', size: 256, mimeType: 'application/pdf', filename: 'file.pdf' }),
    },
    '@/lib/fraud/service': { assertFraudActionAllowed: async () => {}, screenFraudEvent: async () => {} },
    '@/lib/fraud/shared': { FRAUD_ACTIONS: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
    '@/lib/upload/security': {
      validateUploadPurpose: () => ({ purpose: 'company_certificate', kind: 'image_or_document', folder: 'certificates', isPrivate: true }),
      sanitizeFilename: (value) => value,
      validateFileMimeType: () => ({ mimeType: 'application/pdf' }),
      validateFileSize: () => {},
      requireUploadEntityAccess: async () => ({ companyId: 'company-a' }),
      createUploadAuditLog: async (payload) => auditCalls.push(payload),
      createPrivateUploadAccessUrl: async () => 'https://signed.example/file.pdf',
    },
    '@prisma/client': { FraudEventType: { DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD' } },
  })

  const response = await route.POST(createUploadRequest(
    new File(['pdf'], 'trade-license.pdf', { type: 'application/pdf' }),
    { purpose: 'company_certificate', companyId: 'company-a' }
  ))
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(auditCalls.length, 1)
  assert.equal(auditCalls[0].purpose, 'company_certificate')
})
