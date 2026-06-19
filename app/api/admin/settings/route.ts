import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import {
  SETTINGS_GROUPS,
  SYSTEM_SETTING_DEFINITIONS,
  ensureSystemSettingsSeeded,
  getSettingsByGroup,
  updateSettings,
} from '@/lib/settings/system'

const updateSchema = z.object({
  group: z.string(),
  values: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
})

const deleteSchema = z.object({
  key: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const group = searchParams.get('group')

    await ensureSystemSettingsSeeded()

    if (group) {
      const settings = await getSettingsByGroup(group)
      return successResponse({
        group,
        groupLabel: SETTINGS_GROUPS.find((item) => item.key === group)?.label || group,
        items: settings,
      }, 'Settings fetched')
    }

    return successResponse({
      groups: SETTINGS_GROUPS,
      definitions: SYSTEM_SETTING_DEFINITIONS,
    }, 'Settings groups fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = updateSchema.parse(await req.json())

    const validKeys = SYSTEM_SETTING_DEFINITIONS
      .filter((item) => item.group === data.group)
      .map((item) => item.key)

    const invalid = data.values.find((item) => !validKeys.includes(item.key))
    if (invalid) throw new ApiError(422, `Invalid setting key ${invalid.key}`)

    const updated = await updateSettings(
      data.group,
      data.values.map((item) => ({
        ...item,
        updatedBy: admin.userId,
      }))
    )

    return successResponse(updated, 'Settings updated')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { key } = deleteSchema.parse(await req.json())
    const definition = SYSTEM_SETTING_DEFINITIONS.find((item) => item.key === key)
    if (!definition) throw new ApiError(404, 'Setting definition not found')

    const updated = await updateSettings(definition.group, [
      {
        key,
        value: definition.fallback || '',
      },
    ])

    return successResponse(updated, 'Setting reset to fallback')
  } catch (error) {
    return handleApiError(error)
  }
}
