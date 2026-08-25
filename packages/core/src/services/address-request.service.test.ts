/**
 * Pata mangwane wale link ke qawaid.
 *
 * 🔴 Zyada tar test ye poochhte hain ke link KAB kaam NAHI karta.
 *
 * Wajah: ye link WhatsApp par jata hai, aur WhatsApp par cheezein forward hoti hain,
 * mahino tak chat mein padi rehti hain, aur doosron ke phone tak pohanch jati hain. Ek
 * khula hua link us maal par us qeemat par order banata rehta jo ab mojood hi na ho —
 * aur us ka nuqsan reseller ko us waqt pata chalta jab parcel ja chuka hota.
 */
import { describe, expect, it } from 'vitest'
import { NotFoundError, ValidationError } from '@oyebazar/shared'
import { AddressRequestService, ADDRESS_LINK_DAYS } from './address-request.service'
import type {
  AddressRequestRepository,
  FilledAddressRequestView,
  PublicAddressRequestView,
} from '../ports/address-request-repositories'

const NOW = new Date('2026-08-25T10:00:00Z')
const LATER = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000)

const PATA = {
  customerName: 'Ayesha',
  customerPhone: '03001234567',
  customerAddress: 'House 4, Street 11, Gulberg',
  area: 'Lahore',
}

function makePublic(overrides: Partial<PublicAddressRequestView> = {}): PublicAddressRequestView {
  return {
    token: 'tok',
    shopName: 'Sadia Collection',
    productTitleUr: 'کرتا',
    productTitleEn: 'Kurta',
    imageUrl: null,
    qty: 1,
    retailPrice: 2500,
    expiresAt: LATER(ADDRESS_LINK_DAYS),
    filledAt: null,
    usedAt: null,
    ...overrides,
  }
}

class FakeRequests implements AddressRequestRepository {
  row: PublicAddressRequestView | null = makePublic()
  created: unknown[] = []
  filled: unknown[] = []
  /** DB ne likhne diya ya nahi — race jaanchne ke liye */
  fillWrites = true
  markUsedWrites = true

  async create(input: Parameters<AddressRequestRepository['create']>[0]): Promise<void> {
    this.created.push(input)
  }

  async findPublicByToken(token: string): Promise<PublicAddressRequestView | null> {
    return this.row && this.row.token === token ? this.row : null
  }

  async fill(
    token: string,
    input: Parameters<AddressRequestRepository['fill']>[1],
  ): Promise<boolean> {
    if (!this.fillWrites) return false
    this.filled.push({ token, ...input })
    return true
  }

  async listFilledFor(): Promise<FilledAddressRequestView[]> {
    return []
  }

  async findFilledForReseller(): Promise<FilledAddressRequestView | null> {
    return null
  }

  async markUsed(): Promise<boolean> {
    return this.markUsedWrites
  }
}

function makeService(repo: FakeRequests) {
  let n = 0
  return new AddressRequestService(
    repo,
    {
      randomToken: () => `tok${n++ === 0 ? '' : n}`,
      // Baqi teen is service ke kaam ke nahi — port poora karna parta hai
      numericCode: () => '000000',
      hash: (v) => v,
      verifyHash: (v, h) => v === h,
    },
    { now: () => NOW },
  )
}

describe('link banana', () => {
  it('miyaad saat din — link hamesha ke liye khula nahi rehta', async () => {
    const repo = new FakeRequests()
    const { expiresAt } = await makeService(repo).open({
      resellerId: 'r1',
      productId: 'p1',
      qty: 2,
      retailPrice: 2500,
    })

    expect(expiresAt).toEqual(LATER(ADDRESS_LINK_DAYS))
  })

  it('us waqt ka rate link ke saath rakha jata hai', async () => {
    const repo = new FakeRequests()
    await makeService(repo).open({ resellerId: 'r1', productId: 'p1', qty: 1, retailPrice: 3100 })

    expect(repo.created[0]).toMatchObject({ retailPrice: 3100, resellerId: 'r1' })
  })

  it('bina rate ke link nahi banta', async () => {
    await expect(
      makeService(new FakeRequests()).open({
        resellerId: 'r1',
        productId: 'p1',
        qty: 1,
        retailPrice: 0,
      }),
    ).rejects.toThrow(ValidationError)
  })
})

describe('customer pata bhejti hai', () => {
  it('sahi link par pata likha jata hai', async () => {
    const repo = new FakeRequests()
    await makeService(repo).fill('tok', PATA)

    expect(repo.filled[0]).toMatchObject({ customerName: 'Ayesha', at: NOW })
  })

  it('🔴 purana link nahi chalta — us par likhi qeemat ab mojood hi nahi hoti', async () => {
    const repo = new FakeRequests()
    repo.row = makePublic({ expiresAt: new Date(NOW.getTime() - 1000) })

    await expect(makeService(repo).fill('tok', PATA)).rejects.toThrow(ValidationError)
    expect(repo.filled).toHaveLength(0)
  })

  it('🔴 dobara nahi bhara ja sakta — forward hone par doosra shakhs pehle ka pata daba deta', async () => {
    const repo = new FakeRequests()
    repo.row = makePublic({ filledAt: NOW })

    await expect(makeService(repo).fill('tok', PATA)).rejects.toThrow(ValidationError)
    expect(repo.filled).toHaveLength(0)
  })

  it('🔴 aur jab DB ne mana kiya (do log ek saath) tab bhi ghalti uthti hai', async () => {
    const repo = new FakeRequests()
    // Parhte waqt khali tha, likhte waqt kisi aur ne bhar diya
    repo.fillWrites = false

    await expect(makeService(repo).fill('tok', PATA)).rejects.toThrow(ValidationError)
  })

  it('jis link par order ban chuka, us par kuch nahi likha jata', async () => {
    const repo = new FakeRequests()
    repo.row = makePublic({ filledAt: NOW, usedAt: NOW })

    await expect(makeService(repo).fill('tok', PATA)).rejects.toThrow(ValidationError)
  })

  it('anjaan token par kuch nahi milta', async () => {
    const repo = new FakeRequests()
    await expect(makeService(repo).fill('koi-aur', PATA)).rejects.toThrow(NotFoundError)
  })
})

describe('location ka pin', () => {
  it('dono milen to dono rakhe jate hain', async () => {
    const repo = new FakeRequests()
    await makeService(repo).fill('tok', { ...PATA, locationLat: 31.52, locationLng: 74.35 })

    expect(repo.filled[0]).toMatchObject({ locationLat: 31.52, locationLng: 74.35 })
  })

  it('🔴 akela lat rakha NAHI jata — aadha pin poore pin jaisa dikhta hai', async () => {
    const repo = new FakeRequests()
    await makeService(repo).fill('tok', { ...PATA, locationLat: 31.52 })

    expect(repo.filled[0]).toMatchObject({ locationLat: null, locationLng: null })
  })

  it('pin bhejna lazmi nahi — bohat se log ijazat nahi dete', async () => {
    const repo = new FakeRequests()
    await makeService(repo).fill('tok', PATA)

    expect(repo.filled[0]).toMatchObject({ locationLat: null, locationLng: null })
  })
})

describe('order ban jane par', () => {
  it('link band ho jata hai', async () => {
    const repo = new FakeRequests()
    await expect(makeService(repo).close('r1', 'tok', 'o1')).resolves.toBe(true)
  })

  it('🔴 dobara band karne ki koshish `false` deti hai — magar wo ghalti nahi, retry hai', async () => {
    const repo = new FakeRequests()
    repo.markUsedWrites = false

    await expect(makeService(repo).close('r1', 'tok', 'o2')).resolves.toBe(false)
  })
})
