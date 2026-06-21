'use client'

import { useEffect, useId, useRef } from 'react'

declare global {
  interface Window {
    CKEDITOR?: {
      replace: (element: string | HTMLTextAreaElement, config?: Record<string, unknown>) => {
        setData: (value: string) => void
        getData: () => string
        on: (event: string, handler: () => void) => void
        destroy: (noUpdate?: boolean) => void
      }
    }
  }
}

type CKEditorFieldProps = {
  value: string
  onChange: (value: string) => void
  height?: number
}

const CKEDITOR_CDN = 'https://cdn.ckeditor.com/4.22.1/full-all/ckeditor.js'

export function CKEditorField({ value, onChange, height = 320 }: CKEditorFieldProps) {
  const id = useId().replace(/:/g, '')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const editorRef = useRef<ReturnType<NonNullable<typeof window.CKEDITOR>['replace']> | null>(null)

  useEffect(() => {
    let active = true

    function bootEditor() {
      if (!active || !textareaRef.current || !window.CKEDITOR || editorRef.current) return

      const editor = window.CKEDITOR.replace(textareaRef.current, {
        height,
        removeButtons: '',
        allowedContent: true,
      })

      editor.setData(value || '')
      editor.on('change', () => {
        onChange(editor.getData())
      })
      editorRef.current = editor
    }

    if (window.CKEDITOR) {
      bootEditor()
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[data-ckeditor-cdn="true"]`)
      if (existing) {
        existing.addEventListener('load', bootEditor, { once: true })
      } else {
        const script = document.createElement('script')
        script.src = CKEDITOR_CDN
        script.async = true
        script.dataset.ckeditorCdn = 'true'
        script.addEventListener('load', bootEditor, { once: true })
        document.body.appendChild(script)
      }
    }

    return () => {
      active = false
      if (editorRef.current) {
        editorRef.current.destroy(true)
        editorRef.current = null
      }
    }
  }, [height, onChange])

  useEffect(() => {
    if (editorRef.current && editorRef.current.getData() !== value) {
      editorRef.current.setData(value || '')
    }
  }, [value])

  return <textarea id={id} ref={textareaRef} defaultValue={value} className="hidden" />
}
