import { describe, expect, it } from 'vitest'
import {
  assertTransition,
  canTransition,
  feeOutcomeFor,
  isTerminal,
  UnconfirmedOrderError,
} from './order-status'

describe('order state machine', () => {
  it('seedhi tarteeb chalti hai', () => {
    expect(canTransition('PENDING_CONFIRM', 'CONFIRMED')).toBe(true)
    expect(canTransition('CONFIRMED', 'SENT_TO_SUPPLIER')).toBe(true)
    expect(canTransition('SENT_TO_SUPPLIER', 'ACCEPTED')).toBe(true)
    expect(canTransition('ACCEPTED', 'DISPATCHED')).toBe(true)
    expect(canTransition('DISPATCHED', 'DELIVERED')).toBe(true)
    expect(canTransition('DISPATCHED', 'RTO')).toBe(true)
  })

  it('🔴 wholesaler ke qubool kiye baghair parcel nahi ja sakta', () => {
    // Warna hum us parcel ka intezar karte rahenge jo wholesaler bhej hi nahi raha
    expect(canTransition('SENT_TO_SUPPLIER', 'DISPATCHED')).toBe(false)
  })

  it('wholesaler mana kare to order khatam hota hai', () => {
    expect(canTransition('SENT_TO_SUPPLIER', 'REJECTED')).toBe(true)
    expect(canTransition('REJECTED', 'CANCELLED')).toBe(true)
    // mana karne ke baad wapsi nahi
    expect(canTransition('REJECTED', 'ACCEPTED')).toBe(false)
  })

  it('peechay nahi ja sakta', () => {
    expect(canTransition('CONFIRMED', 'PENDING_CONFIRM')).toBe(false)
    expect(canTransition('DELIVERED', 'DISPATCHED')).toBe(false)
  })

  it('skip nahi kar sakta', () => {
    expect(canTransition('PENDING_CONFIRM', 'SENT_TO_SUPPLIER')).toBe(false)
    expect(canTransition('CONFIRMED', 'DISPATCHED')).toBe(false)
  })

  it('terminal states aage nahi barhtin', () => {
    expect(isTerminal('DELIVERED')).toBe(true)
    expect(isTerminal('RTO')).toBe(true)
    expect(isTerminal('CANCELLED')).toBe(true)
    expect(isTerminal('CONFIRMED')).toBe(false)
  })

  it('🔴 confirmation ke baghair order wholesaler ko nahi ja sakta', () => {
    expect(() =>
      assertTransition('CONFIRMED', 'SENT_TO_SUPPLIER', { confirmedAt: null }),
    ).toThrow(UnconfirmedOrderError)

    expect(() =>
      assertTransition('CONFIRMED', 'SENT_TO_SUPPLIER', { confirmedAt: new Date() }),
    ).not.toThrow()
  })

  it('ghalat transition par throw karta hai — khamoshi se ignore nahi', () => {
    expect(() => assertTransition('DELIVERED', 'CONFIRMED', { confirmedAt: new Date() })).toThrow()
  })
})

describe('feeOutcomeFor', () => {
  it('delivered par fee earned', () => {
    expect(feeOutcomeFor('DELIVERED')).toBe('EARNED')
  })

  it('RTO, reject aur cancel par fee written off (delete nahi)', () => {
    expect(feeOutcomeFor('RTO')).toBe('WRITTEN_OFF')
    expect(feeOutcomeFor('REJECTED')).toBe('WRITTEN_OFF')
    expect(feeOutcomeFor('CANCELLED')).toBe('WRITTEN_OFF')
  })

  it('raaste ke states par pending', () => {
    expect(feeOutcomeFor('DISPATCHED')).toBe('PENDING')
  })
})
