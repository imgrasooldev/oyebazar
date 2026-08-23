/**
 * 🔴 Safai ka har test us soorat par hai jahan file GHALTI se mit sakti thi.
 *
 * Yahan "sab theek chal raha hai" wala test kam qeemat rakhta hai: agar safai kuch bhi
 * na mitaye to sirf jagah zaya hoti hai. Nuqsan doosri taraf hai — ek file jo kisi ke
 * kaam ki thi aur mit gayi. Is liye tests zyada tar yehi poochhte hain ke "ye kyun NAHI
 * miti".
 */
import { describe, expect, it } from 'vitest'
import { ASSET_GRACE_DAYS, orphanedAssets, type StoredAsset } from './asset-sweep'

const NOW = new Date('2026-08-24T12:00:00Z')

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

function asset(name: string, days: number): StoredAsset {
  return {
    key: `template-assets/r1/${name}.png`,
    url: `https://cdn.example/template-assets/r1/${name}.png`,
    createdAt: daysAgo(days),
  }
}

describe('beykar tasveeron ki safai', () => {
  it('purani aur be-hawala file mit sakti hai', () => {
    const gone = asset('purani', 30)
    const result = orphanedAssets({ assets: [gone], referencedUrls: new Set(), now: NOW })
    expect(result.map((a) => a.key)).toEqual([gone.key])
  })

  it('🔴 abhi upload hui file par HAATH nahi — template baad mein mehfooz hota hai', () => {
    const fresh = asset('abhi-lagayi', 0)
    const result = orphanedAssets({ assets: [fresh], referencedUrls: new Set(), now: NOW })
    expect(result).toEqual([])
  })

  it('🔴 muddat ke aakhri din tak mehfooz rehti hai', () => {
    const edge = asset('kinare-par', ASSET_GRACE_DAYS - 0.01)
    const result = orphanedAssets({ assets: [edge], referencedUrls: new Set(), now: NOW })
    expect(result).toEqual([])
  })

  it('🔴 istemal mein hone par kabhi nahi — chahe kitni hi purani ho', () => {
    const used = asset('logo', 400)
    const result = orphanedAssets({
      assets: [used],
      referencedUrls: new Set([used.url]),
      now: NOW,
    })
    expect(result).toEqual([])
  })

  it('🔴 kisi DOOSRE reseller ke template mein hone par bhi nahi', () => {
    /*
     * Aaj key mein reseller ki id hoti hai, is liye ye soorat aati hi nahi. Test phir
     * bhi hai: kal key ki shakl badal sakti hai, aur us din ye jaanch khamoshi se
     * ghalat ho jati — bilkul us qism ki ghalti jo mahinon baad pakri jati hai.
     */
    const shared = asset('shared', 100)
    const result = orphanedAssets({
      assets: [shared],
      referencedUrls: new Set([shared.url]),
      now: NOW,
    })
    expect(result).toEqual([])
  })

  it('mashkook tareekh par haath nahi lagata', () => {
    const broken: StoredAsset = {
      key: 'template-assets/r1/kharab.png',
      url: 'https://cdn.example/template-assets/r1/kharab.png',
      createdAt: new Date('kuch bhi nahi'),
    }
    expect(orphanedAssets({ assets: [broken], referencedUrls: new Set(), now: NOW })).toEqual([])
  })

  it('bhari hui list par sirf wohi chunta hai jo dono shartein poori kare', () => {
    const used = asset('istemal-mein', 90)
    const oldOrphan = asset('purana-beykar', 90)
    const freshOrphan = asset('naya-beykar', 1)

    const result = orphanedAssets({
      assets: [used, oldOrphan, freshOrphan],
      referencedUrls: new Set([used.url]),
      now: NOW,
    })

    expect(result.map((a) => a.key)).toEqual([oldOrphan.key])
  })
})
