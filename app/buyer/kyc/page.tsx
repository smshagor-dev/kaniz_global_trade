'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, Loader2, Upload } from 'lucide-react'
import { get, post } from '@/lib/utils/api-client'
import { uploadAsset } from '@/lib/utils/upload'
import { CountrySelect } from '@/components/ui/country-select'

type IdentityDocumentType = 'PASSPORT' | 'NID'

type KycDocuments = {
  passportCopy: string[]
  nationalIdFrontCopy: string[]
  nationalIdBackCopy: string[]
  addressProof: string[]
  businessLicenseCopy: string[]
  bankStatementCopy: string[]
  bankChequeCopy: string[]
  additional: string[]
}

type KycProfile = {
  legalName?: string | null
  identityDocumentType?: IdentityDocumentType | null
  passportNumber?: string | null
  nationalIdNumber?: string | null
  personalCountry?: string | null
  personalCity?: string | null
  personalPostalCode?: string | null
  personalAddress?: string | null
  businessLicenseNumber?: string | null
  bankAccountName?: string | null
  bankAccountNumber?: string | null
  bankName?: string | null
  bankAccountType?: string | null
  bankCurrency?: string | null
  bankBranchName?: string | null
  bankBranchCode?: string | null
  bankRoutingNumber?: string | null
  bankSwiftCode?: string | null
  bankIban?: string | null
  bankCountry?: string | null
  bankCity?: string | null
  bankAddress?: string | null
  notes?: string | null
  status?: string | null
  documentUrls?: string | null
}

const emptyDocuments: KycDocuments = {
  passportCopy: [],
  nationalIdFrontCopy: [],
  nationalIdBackCopy: [],
  addressProof: [],
  businessLicenseCopy: [],
  bankStatementCopy: [],
  bankChequeCopy: [],
  additional: [],
}

function parseStoredDocuments(raw: string | null | undefined): KycDocuments {
  if (!raw) return emptyDocuments

  try {
    const parsed = JSON.parse(raw) as unknown

    if (Array.isArray(parsed)) {
      return {
        ...emptyDocuments,
        additional: parsed.filter((item): item is string => typeof item === 'string'),
      }
    }

    if (parsed && typeof parsed === 'object') {
      const source = parsed as Record<string, unknown>
      const pick = (key: keyof KycDocuments) =>
        Array.isArray(source[key]) ? source[key].filter((item): item is string => typeof item === 'string') : []

      return {
        passportCopy: pick('passportCopy'),
        nationalIdFrontCopy: pick('nationalIdFrontCopy'),
        nationalIdBackCopy: pick('nationalIdBackCopy'),
        addressProof: pick('addressProof'),
        businessLicenseCopy: pick('businessLicenseCopy'),
        bankStatementCopy: pick('bankStatementCopy'),
        bankChequeCopy: pick('bankChequeCopy'),
        additional: pick('additional'),
      }
    }
  } catch {
    return emptyDocuments
  }

  return emptyDocuments
}

type DocumentField = keyof KycDocuments

export default function BuyerKycPage() {
  const { data, refetch } = useQuery({
    queryKey: ['buyer-kyc'],
    queryFn: () => get<KycProfile | null>('/kyc'),
  })

  const current = (data?.data || null) as KycProfile | null
  const [uploadingField, setUploadingField] = useState<DocumentField | null>(null)
  const [form, setForm] = useState({
    legalName: '',
    identityDocumentType: 'PASSPORT' as IdentityDocumentType,
    passportNumber: '',
    nationalIdNumber: '',
    personalCountry: '',
    personalCity: '',
    personalPostalCode: '',
    personalAddress: '',
    businessLicenseNumber: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankAccountType: '',
    bankCurrency: '',
    bankBranchName: '',
    bankBranchCode: '',
    bankRoutingNumber: '',
    bankSwiftCode: '',
    bankIban: '',
    bankCountry: '',
    bankCity: '',
    bankAddress: '',
    notes: '',
  })
  const [documents, setDocuments] = useState<KycDocuments>(emptyDocuments)

  useEffect(() => {
    const identityDocumentType =
      current?.identityDocumentType ||
      (current?.nationalIdNumber ? 'NID' : 'PASSPORT')

    setForm({
      legalName: String(current?.legalName || ''),
      identityDocumentType,
      passportNumber: String(current?.passportNumber || ''),
      nationalIdNumber: String(current?.nationalIdNumber || ''),
      personalCountry: String(current?.personalCountry || ''),
      personalCity: String(current?.personalCity || ''),
      personalPostalCode: String(current?.personalPostalCode || ''),
      personalAddress: String(current?.personalAddress || ''),
      businessLicenseNumber: String(current?.businessLicenseNumber || ''),
      bankAccountName: String(current?.bankAccountName || ''),
      bankAccountNumber: String(current?.bankAccountNumber || ''),
      bankName: String(current?.bankName || ''),
      bankAccountType: String(current?.bankAccountType || ''),
      bankCurrency: String(current?.bankCurrency || ''),
      bankBranchName: String(current?.bankBranchName || ''),
      bankBranchCode: String(current?.bankBranchCode || ''),
      bankRoutingNumber: String(current?.bankRoutingNumber || ''),
      bankSwiftCode: String(current?.bankSwiftCode || ''),
      bankIban: String(current?.bankIban || ''),
      bankCountry: String(current?.bankCountry || ''),
      bankCity: String(current?.bankCity || ''),
      bankAddress: String(current?.bankAddress || ''),
      notes: String(current?.notes || ''),
    })
    setDocuments(parseStoredDocuments(current?.documentUrls))
  }, [current])

  async function handleDocumentUpload(field: DocumentField, fileList: FileList | null) {
    if (!fileList?.length) return

    setUploadingField(field)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(fileList)) {
        const uploaded = await uploadAsset(file, 'kyc_document')
        uploadedUrls.push(uploaded.url)
      }
      setDocuments((currentDocuments) => ({
        ...currentDocuments,
        [field]: [...currentDocuments[field], ...uploadedUrls],
      }))
      toast.success('KYC document uploaded')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || 'KYC document upload failed')
    } finally {
      setUploadingField(null)
    }
  }

  async function submit(submitForReview: boolean) {
    await post('/kyc', {
      ...form,
      passportNumber: form.identityDocumentType === 'PASSPORT' ? form.passportNumber : '',
      nationalIdNumber: form.identityDocumentType === 'NID' ? form.nationalIdNumber : '',
      documentUrls: documents,
      submit: submitForReview,
    })
    toast.success(submitForReview ? 'KYC submitted' : 'KYC draft saved')
    refetch()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KYC Compliance</h1>
        <p className="mt-1 text-sm text-gray-500">Choose passport or NID, provide your address, and upload matching identity plus address proof.</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="mb-4 text-sm text-gray-600">Current status: <span className="font-semibold text-gray-900">{String(current?.status || 'DRAFT')}</span></div>

        <Section
          title="Personal Info"
          description="Select one primary identity type, enter the matching number, and provide your current address."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.legalName}
              onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))}
              placeholder="Legal name"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <select
              value={form.identityDocumentType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  identityDocumentType: e.target.value as IdentityDocumentType,
                }))
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="PASSPORT">Passport</option>
              <option value="NID">National ID</option>
            </select>
            {form.identityDocumentType === 'PASSPORT' ? (
              <input
                value={form.passportNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, passportNumber: e.target.value }))}
                placeholder="Passport number"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              />
            ) : (
              <input
                value={form.nationalIdNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, nationalIdNumber: e.target.value }))}
                placeholder="National ID number"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              />
            )}
            <CountrySelect
              value={form.personalCountry}
              onChange={(value) => setForm((prev) => ({ ...prev, personalCountry: value }))}
            />
            <input
              value={form.personalCity}
              onChange={(e) => setForm((prev) => ({ ...prev, personalCity: e.target.value }))}
              placeholder="City"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.personalPostalCode}
              onChange={(e) => setForm((prev) => ({ ...prev, personalPostalCode: e.target.value }))}
              placeholder="Postal code"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.businessLicenseNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, businessLicenseNumber: e.target.value }))}
              placeholder="Business license number"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <textarea
            value={form.personalAddress}
            onChange={(e) => setForm((prev) => ({ ...prev, personalAddress: e.target.value }))}
            placeholder="Personal address"
            className="mt-4 min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {form.identityDocumentType === 'PASSPORT' ? (
              <DocumentCard
                title="Passport Copy"
                hint="Upload passport image or PDF."
                files={documents.passportCopy}
                loading={uploadingField === 'passportCopy'}
                onUpload={(files) => handleDocumentUpload('passportCopy', files)}
                onRemove={(url) => removeDocument('passportCopy', url)}
              />
            ) : (
              <>
                <DocumentCard
                  title="NID Front Copy"
                  hint="Front side of national ID."
                  files={documents.nationalIdFrontCopy}
                  loading={uploadingField === 'nationalIdFrontCopy'}
                  onUpload={(files) => handleDocumentUpload('nationalIdFrontCopy', files)}
                  onRemove={(url) => removeDocument('nationalIdFrontCopy', url)}
                />
                <DocumentCard
                  title="NID Back Copy"
                  hint="Back side copy is required."
                  files={documents.nationalIdBackCopy}
                  loading={uploadingField === 'nationalIdBackCopy'}
                  onUpload={(files) => handleDocumentUpload('nationalIdBackCopy', files)}
                  onRemove={(url) => removeDocument('nationalIdBackCopy', url)}
                />
              </>
            )}
            <DocumentCard
              title="Address Proof"
              hint="Upload utility bill, bank statement, or similar address proof."
              files={documents.addressProof}
              loading={uploadingField === 'addressProof'}
              onUpload={(files) => handleDocumentUpload('addressProof', files)}
              onRemove={(url) => removeDocument('addressProof', url)}
            />
            <DocumentCard
              title="Trade License Copy"
              hint="Optional if your KYC includes business identity."
              files={documents.businessLicenseCopy}
              loading={uploadingField === 'businessLicenseCopy'}
              onUpload={(files) => handleDocumentUpload('businessLicenseCopy', files)}
              onRemove={(url) => removeDocument('businessLicenseCopy', url)}
            />
          </div>
        </Section>

        <Section
          title="Bank Info"
          description="Provide bank details and a bank cheque/check copy or statement so finance review can verify ownership."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.bankAccountName}
              onChange={(e) => setForm((prev) => ({ ...prev, bankAccountName: e.target.value }))}
              placeholder="Bank account name"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankAccountNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, bankAccountNumber: e.target.value }))}
              placeholder="Bank account number"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankAccountType}
              onChange={(e) => setForm((prev) => ({ ...prev, bankAccountType: e.target.value }))}
              placeholder="Account type"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankCurrency}
              onChange={(e) => setForm((prev) => ({ ...prev, bankCurrency: e.target.value.toUpperCase() }))}
              placeholder="Account currency"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankName}
              onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
              placeholder="Bank name"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankBranchName}
              onChange={(e) => setForm((prev) => ({ ...prev, bankBranchName: e.target.value }))}
              placeholder="Branch name"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankBranchCode}
              onChange={(e) => setForm((prev) => ({ ...prev, bankBranchCode: e.target.value }))}
              placeholder="Branch code"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankRoutingNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, bankRoutingNumber: e.target.value }))}
              placeholder="Routing number"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankSwiftCode}
              onChange={(e) => setForm((prev) => ({ ...prev, bankSwiftCode: e.target.value.toUpperCase() }))}
              placeholder="SWIFT / BIC code"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={form.bankIban}
              onChange={(e) => setForm((prev) => ({ ...prev, bankIban: e.target.value.toUpperCase() }))}
              placeholder="IBAN"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <CountrySelect
              value={form.bankCountry}
              onChange={(value) => setForm((prev) => ({ ...prev, bankCountry: value }))}
              placeholder="Select bank country"
            />
            <input
              value={form.bankCity}
              onChange={(e) => setForm((prev) => ({ ...prev, bankCity: e.target.value }))}
              placeholder="Bank city"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <textarea
            value={form.bankAddress}
            onChange={(e) => setForm((prev) => ({ ...prev, bankAddress: e.target.value }))}
            placeholder="Bank branch address"
            className="mt-4 min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <DocumentCard
              title="Bank Statement / Proof"
              hint="Upload statement, account certificate, or similar bank proof."
              files={documents.bankStatementCopy}
              loading={uploadingField === 'bankStatementCopy'}
              onUpload={(files) => handleDocumentUpload('bankStatementCopy', files)}
              onRemove={(url) => removeDocument('bankStatementCopy', url)}
            />
            <DocumentCard
              title="Bank Cheque Copy"
              hint="Upload cancelled cheque/check copy."
              files={documents.bankChequeCopy}
              loading={uploadingField === 'bankChequeCopy'}
              onUpload={(files) => handleDocumentUpload('bankChequeCopy', files)}
              onRemove={(url) => removeDocument('bankChequeCopy', url)}
            />
          </div>
        </Section>

        <Section
          title="Notes"
          description="Add anything the review team should know about your identity, address, or bank documents."
        >
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Compliance notes"
            className="min-h-28 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </Section>

        {documents.additional.length > 0 ? (
          <Section
            title="Additional Uploaded Files"
            description="These were saved from older KYC records and are kept for compatibility."
          >
            <FileList
              files={documents.additional}
              onRemove={(url) => removeDocument('additional', url)}
            />
          </Section>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button onClick={() => submit(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Save Draft</button>
          <button onClick={() => submit(true)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white">Submit KYC</button>
        </div>
      </div>
    </div>
  )

  function removeDocument(field: DocumentField, url: string) {
    setDocuments((currentDocuments) => ({
      ...currentDocuments,
      [field]: currentDocuments[field].filter((item) => item !== url),
    }))
  }
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function DocumentCard({
  title,
  hint,
  files,
  loading,
  onUpload,
  onRemove,
}: {
  title: string
  hint: string
  files: string[]
  loading: boolean
  onUpload: (files: FileList | null) => void
  onRemove: (url: string) => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {loading ? 'Uploading...' : 'Upload file'}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          multiple
          className="hidden"
          onChange={(event) => {
            onUpload(event.target.files)
            event.target.value = ''
          }}
          disabled={loading}
        />
      </label>

      {files.length > 0 ? (
        <div className="mt-3">
          <FileList files={files} onRemove={onRemove} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-500">No file uploaded yet.</p>
      )}
    </div>
  )
}

function FileList({
  files,
  onRemove,
}: {
  files: string[]
  onRemove: (url: string) => void
}) {
  return (
    <div className="grid gap-2">
      {files.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
        >
          <span className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{url.split('/').pop() || 'Uploaded document'}</span>
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              onRemove(url)
            }}
            className="text-xs font-semibold text-red-600"
          >
            Remove
          </button>
        </a>
      ))}
    </div>
  )
}
