/**
 * Parcel ka record — courier aur CN.
 *
 * 🔴 Ye usool domain mein hai, service ke andar nahi, aur is ki wajah amli hai.
 *
 * DISPATCHED tak pohanchne ke do darwaze hain: dukan ka portal aur WhatsApp wala magic
 * link. Kal ko teesra bhi ban sakta hai (ops ka safha, ya courier ka apna API). Agar ye
 * shart har darwaze par alag likhi hoti to ek din wo alag ho jati — aur jo darwaza narm
 * hota, sab usi se guzarne lagte. Jis shart par paisa aur sitare mauqoof hon, us ka ek
 * hi likha hua matn hona chahiye.
 */
import { ValidationError } from '@oyebazar/shared'
import {
  COURIERS,
  SELF_COURIER,
  TRACKING_MAX,
  TRACKING_MIN,
  isCourierSlug,
  normaliseTracking,
} from '@oyebazar/shared'

export interface Shipment {
  readonly courier: string
  /** `null` sirf apne rider par — us par CN hota hi nahi */
  readonly trackingNo: string | null
}

export function readShipment(input: {
  courier: string
  trackingNo?: string | undefined
}): Shipment {
  if (!isCourierSlug(input.courier)) {
    throw new ValidationError(`Courier chunen — ${COURIERS.map((c) => c.name).join(', ')}`)
  }

  /*
   * Apna rider: number maangna jhoot likhwana hoga.
   *
   * Mandi ki bohat si dukanein apne bandey ke haath maal bhejti hain. Agar hum har
   * soorat CN maangte to wo `1111` ya `-` likh kar aage barh jate — aur us ke baad har
   * number par shak karna parta, yani jo number SAHI hain wo bhi bekar ho jate.
   */
  if (input.courier === SELF_COURIER) return { courier: input.courier, trackingNo: null }

  const tracking = normaliseTracking(input.trackingNo ?? '')

  if (tracking.length < TRACKING_MIN || tracking.length > TRACKING_MAX) {
    throw new ValidationError('CN number likhen — wohi jo courier ki rasid par hai')
  }

  return { courier: input.courier, trackingNo: tracking }
}
