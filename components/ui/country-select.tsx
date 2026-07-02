'use client'

import { COUNTRIES } from '@/lib/constants/countries'
import { SearchableSelect } from '@/components/ui/searchable-select'

function countryFlag(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

const countryOptions = COUNTRIES.map((country) => ({
  value: country.name,
  label: country.name,
  searchText: country.code,
  leading: countryFlag(country.code),
}))

export function CountrySelect({
  value,
  onChange,
  placeholder = 'Select country',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={countryOptions}
      placeholder={placeholder}
      searchPlaceholder="Search country..."
      emptyMessage="No country found."
    />
  )
}
