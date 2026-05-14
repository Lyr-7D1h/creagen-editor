import { describe, expect, it, vi } from 'vitest'
import type { ClientStorage } from '../creagen-editor/CreagenEditor'
import { Settings } from './Settings'

/**
 * Creates a mock ClientStorage for testing
 */
function createMockStorage(
  storedSettings?: Record<string, unknown> | null,
): ClientStorage {
  return {
    getSettings: vi.fn().mockResolvedValue(storedSettings),
    setSettings: vi.fn().mockResolvedValue(undefined),
    remote: false,
    user: undefined,
  } as unknown as ClientStorage
}

describe('Settings Store', () => {
  describe('Loading settings', () => {
    it('should load all default values when no stored settings exist', async () => {
      const storage = createMockStorage(undefined)
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(false)
      expect(settings.get('editor.folding')).toBe(true)
      expect(settings.get('editor.history_buffer_size')).toBe(10)
      expect(settings.get('controller.qr_size')).toBe(100)
    })

    it('should load default values when stored settings is null', async () => {
      const storage = createMockStorage(null)
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(false)
      expect(settings.get('editor.fullscreen')).toBe(false)
      expect(settings.get('editor.history_buffer_size')).toBe(10)
    })

    it('should load default values when stored settings is not an object', async () => {
      const storage = createMockStorage('invalid' as unknown as null)
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(false)
      expect(settings.get('editor.fullscreen')).toBe(false)
    })

    it('should load valid stored settings correctly', async () => {
      const storage = createMockStorage({
        'editor.vim': true,
        'editor.folding': false,
        'editor.history_buffer_size': 20,
        'controller.qr_size': 150,
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(true)
      expect(settings.get('editor.folding')).toBe(false)
      expect(settings.get('editor.history_buffer_size')).toBe(20)
      expect(settings.get('controller.qr_size')).toBe(150)
    })

    it('should use defaults for settings not present in stored data', async () => {
      const storage = createMockStorage({
        'editor.vim': true,
        // editor.folding is not stored
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(true)
      expect(settings.get('editor.folding')).toBe(true) // default value
    })
  })

  describe('Type drift handling', () => {
    it('should use default when stored value has wrong type (boolean -> number)', async () => {
      const storage = createMockStorage({
        'editor.history_buffer_size': false as unknown as number, // should be number
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.history_buffer_size')).toBe(10) // default
    })

    it('should use default when stored value has wrong type (number -> boolean)', async () => {
      const storage = createMockStorage({
        'editor.vim': 123 as unknown as boolean, // should be boolean
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(false) // default
    })

    it('should use default when stored value has wrong type (string -> number)', async () => {
      const storage = createMockStorage({
        'controller.qr_size': 'not-a-number' as unknown as number,
      })
      const settings = await Settings.create(storage)

      expect(settings.get('controller.qr_size')).toBe(100) // default
    })

    it('should use default when stored value has wrong type (object -> boolean)', async () => {
      const storage = createMockStorage({
        'editor.folding': { nested: 'object' } as unknown as boolean,
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.folding')).toBe(true) // default
    })

    it('should handle mixed valid and invalid types correctly', async () => {
      const storage = createMockStorage({
        'editor.vim': true, // valid
        'editor.history_buffer_size': 'invalid' as unknown as number, // invalid
        'editor.folding': false, // valid
        'controller.qr_size': null as unknown as number, // invalid
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(true)
      expect(settings.get('editor.history_buffer_size')).toBe(10) // default
      expect(settings.get('editor.folding')).toBe(false)
      expect(settings.get('controller.qr_size')).toBe(100) // default
    })
  })

  describe('Validation rules', () => {
    it('should use default when stored value fails custom validation (history buffer size)', async () => {
      const storage = createMockStorage({
        'editor.history_buffer_size': 100, // exceeds max of 50
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.history_buffer_size')).toBe(10) // default
    })

    it('should use default when stored value is below minimum (history buffer size)', async () => {
      const storage = createMockStorage({
        'editor.history_buffer_size': 0, // below min of 1
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.history_buffer_size')).toBe(10) // default
    })

    it('should accept valid value within range (history buffer size)', async () => {
      const storage = createMockStorage({
        'editor.history_buffer_size': 25, // valid: between 1-50
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.history_buffer_size')).toBe(25)
    })

    it('should use default when QR size exceeds maximum', async () => {
      const storage = createMockStorage({
        'controller.qr_size': 2000, // exceeds max of 1000
      })
      const settings = await Settings.create(storage)

      expect(settings.get('controller.qr_size')).toBe(100) // default
    })

    it('should use default when QR size is below minimum', async () => {
      const storage = createMockStorage({
        'controller.qr_size': 0, // below min of 1
      })
      const settings = await Settings.create(storage)

      expect(settings.get('controller.qr_size')).toBe(100) // default
    })

    it('should accept valid QR size within range', async () => {
      const storage = createMockStorage({
        'controller.qr_size': 500, // valid: between 1-1000
      })
      const settings = await Settings.create(storage)

      expect(settings.get('controller.qr_size')).toBe(500)
    })

    it('should handle validation for edge case values', async () => {
      const storage = createMockStorage({
        'editor.history_buffer_size': 1, // minimum valid
        'controller.qr_size': 1000, // maximum valid
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.history_buffer_size')).toBe(1)
      expect(settings.get('controller.qr_size')).toBe(1000)
    })
  })

  describe('Setting values with validation', () => {
    it('should reject invalid values when setting', async () => {
      const storage = createMockStorage({})
      const settings = await Settings.create(storage)

      // Try to set an invalid value
      settings.set('editor.history_buffer_size', 100)

      // Should still have default value
      expect(settings.get('editor.history_buffer_size')).toBe(10)
    })

    it('should accept valid values when setting', async () => {
      const storage = createMockStorage({})
      const settings = await Settings.create(storage)

      settings.set('editor.history_buffer_size', 25)

      expect(settings.get('editor.history_buffer_size')).toBe(25)
    })

    it('should update storage when setting valid value', async () => {
      const storage = createMockStorage({})
      const settings = await Settings.create(storage)

      settings.set('editor.vim', true)

      // Wait for async storage update
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(storage.setSettings).toHaveBeenCalled()
    })

    it('should not update storage when setting invalid value', async () => {
      const storage = createMockStorage({})
      const settings = await Settings.create(storage)
      const setSettingsSpy = vi.mocked(storage.setSettings)
      setSettingsSpy.mockClear()

      // Try to set invalid value
      settings.set('editor.history_buffer_size', 100)

      // Wait a bit to ensure no async calls
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(setSettingsSpy).not.toHaveBeenCalled()
    })
  })

  describe('Complex drift scenarios', () => {
    it('should handle settings from older version with missing keys', async () => {
      const storage = createMockStorage({
        'editor.vim': true,
        // Imagine a new setting 'editor.folding' was added later
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(true)
      expect(settings.get('editor.folding')).toBe(true) // new default
    })

    it('should handle settings with extra unknown keys', async () => {
      const storage = createMockStorage({
        'editor.vim': true,
        'unknown.setting': 'value',
        'old.deprecated.setting': 123,
      })
      const settings = await Settings.create(storage)

      // Should still load valid settings correctly
      expect(settings.get('editor.vim')).toBe(true)
      // Unknown keys are simply ignored
    })

    it('should handle all invalid stored settings', async () => {
      const storage = createMockStorage({
        'editor.vim': 'not-a-boolean' as unknown as boolean,
        'editor.history_buffer_size': true as unknown as number,
        'controller.qr_size': 'string' as unknown as number,
      })
      const settings = await Settings.create(storage)

      // All should fall back to defaults
      expect(settings.get('editor.vim')).toBe(false)
      expect(settings.get('editor.history_buffer_size')).toBe(10)
      expect(settings.get('controller.qr_size')).toBe(100)
    })

    it('should handle settings with correct types but invalid values', async () => {
      const storage = createMockStorage({
        'editor.vim': true, // valid
        'editor.history_buffer_size': 999, // correct type, invalid value
        'controller.qr_size': -5, // correct type, invalid value
      })
      const settings = await Settings.create(storage)

      expect(settings.get('editor.vim')).toBe(true)
      expect(settings.get('editor.history_buffer_size')).toBe(10) // default
      expect(settings.get('controller.qr_size')).toBe(100) // default
    })
  })

  describe('State settings (param-query)', () => {
    it('should initialize param-query settings with defaults', async () => {
      const storage = createMockStorage({})
      const settings = await Settings.create(storage)

      expect(settings.get('hide_all')).toBe(false)
      expect(settings.get('show_control_panel')).toBe(false)
      expect(settings.get('show_qr')).toBe(false)
    })

    it('should restore param-query settings from storage like regular settings', async () => {
      // param-query settings are loaded from storage, they just have special URL handling
      const storage = createMockStorage({
        hide_all: true,
        show_control_panel: true,
        show_qr: true,
      })
      const settings = await Settings.create(storage)

      // param-query settings are loaded from storage
      expect(settings.get('hide_all')).toBe(true)
      expect(settings.get('show_control_panel')).toBe(true)
      expect(settings.get('show_qr')).toBe(true)
    })
  })

  describe('Settings retrieval', () => {
    it('should check if a key is a valid settings key', async () => {
      const storage = createMockStorage({})
      const settings = await Settings.create(storage)

      expect(settings.isSettingsKey('editor.vim')).toBe(true)
      expect(settings.isSettingsKey('invalid.key')).toBe(false)
      expect(settings.isSettingsKey('random')).toBe(false)
    })

    it('should get config for a settings key', async () => {
      const storage = createMockStorage({})
      const settings = await Settings.create(storage)

      const config = settings.getConfig('editor.vim')
      expect(config.type).toBe('param')
      expect(config.label).toBe('Vim')
      expect(config.default).toBe(false)
    })

    it('should return all values as a store object', async () => {
      const storage = createMockStorage({
        'editor.vim': true,
        'editor.folding': false,
      })
      const settings = await Settings.create(storage)

      const values = settings.values
      expect(values['editor.vim']).toBe(true)
      expect(values['editor.folding']).toBe(false)
      expect(values['editor.history_buffer_size']).toBe(10) // default
    })
  })
})
