/**
 * 🔴 Zyada tar test ye poochhte hain ke CN kab NAHI chhora ja sakta.
 *
 * Wajah: is ek khaane par teen cheezein khari hain — reseller ka payout, dukan ke
 * sitare, aur hamari apni fee (`FeeLedger.earnedAt`). Agar yahan se khali ya jhoota
 * number guzar gaya to wo saari cheezein us waqt tootengi jab koi gum shuda parcel
 * dhoondh raha hoga — yani us waqt jab dobara likhna mumkin hi nahi.
 */
import { describe, expect, it } from 'vitest'
import { ValidationError } from '@oyebazar/shared'
import { readShipment } from './shipment'

describe('parcel ka record', () => {
  it('CN saaf ho kar rakha jata hai — log space aur dash likhte hain', () => {
    expect(readShipment({ courier: 'tcs', trackingNo: ' 1234-5678 90 ' })).toEqual({
      courier: 'tcs',
      trackingNo: '1234567890',
    })
  })

  it('chhote haroof bare ban jate hain — wohi number do shakl mein na rahe', () => {
    expect(readShipment({ courier: 'postex', trackingNo: 'px12345' }).trackingNo).toBe('PX12345')
  })

  it('🔴 courier ke saath CN chhora nahi ja sakta', () => {
    expect(() => readShipment({ courier: 'leopards' })).toThrow(ValidationError)
  })

  it('🔴 na hi "kuch to likhna tha" wala number chalta hai', () => {
    // `-` aur space hat kar khali reh jata hai
    expect(() => readShipment({ courier: 'leopards', trackingNo: '- - -' })).toThrow(
      ValidationError,
    )
    expect(() => readShipment({ courier: 'leopards', trackingNo: '1' })).toThrow(ValidationError)
  })

  it('🔴 apne rider par CN maanga hi nahi jata — warna log jhoota number likhte', () => {
    expect(readShipment({ courier: 'self' })).toEqual({ courier: 'self', trackingNo: null })
  })

  it('apne rider par diya hua number bhi nahi rakha jata — wo hai hi nahi', () => {
    expect(readShipment({ courier: 'self', trackingNo: '99999999' }).trackingNo).toBeNull()
  })

  it('🔴 anjaan courier qubool nahi — warna is khaane mein kuch bhi likha ja sakta tha', () => {
    expect(() => readShipment({ courier: 'meri-apni-service', trackingNo: '1234567' })).toThrow(
      ValidationError,
    )
  })

  it('bohat lamba number bhi nahi — wo CN nahi, koi aur cheez chipkai gayi hai', () => {
    expect(() => readShipment({ courier: 'tcs', trackingNo: 'A'.repeat(60) })).toThrow(
      ValidationError,
    )
  })
})
