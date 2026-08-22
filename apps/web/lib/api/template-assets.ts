import { ValidationError, isOwnAssetUrl, type TemplateSpec } from '@oyebazar/shared'

/**
 * 🔴 Har tasveer HAMARI apni storage ki honi chahiye.
 *
 * Zod sirf ye jaanchta hai ke pata dekhne mein pata lagta hai. Ye ke wo HAMARA hai, wo
 * environment ka sawal hai (storage ka base URL wahin se aata hai) — is liye jaanch
 * schema mein nahi, yahan hai.
 *
 * Bahar ka link do darwaze kholta hai:
 *
 *  · Hamara render worker us pate par JATA hai — yani koi bhi hamare server se apni
 *    marzi ke pate par request karwa sakta hai, andar wale network samet.
 *  · Wo tasveer kal badal sakti hai. Aaj logo, kal kuch aur — aur wo har us pack par
 *    chhap jayega jo us waqt bana. Hum ne to sirf ek link mehfooz kiya tha.
 *
 * 🔴 Ye DONO raston par lagti hai — banane par bhi, badalne par bhi. Sirf ek jagah
 * lagana doosre raste ko khula chhor deta hai, aur wo khula raasta bilkul utna hi bura
 * hai jitna koi jaanch na hona.
 *
 * Alag file mein is liye ke Next ke route module se sirf HTTP wale export ho sakte hain
 * (GET/POST/…); koi aur export build hi tor deta hai.
 */
export function assertOwnAssets(spec: TemplateSpec, mediaBaseUrl: string): void {
  for (const layer of spec.layers ?? []) {
    if (layer.kind !== 'image') continue
    if (!isOwnAssetUrl(layer.url, mediaBaseUrl)) {
      throw new ValidationError('Tasveer pehle upload karen — bahar ka link nahi chalta')
    }
  }
}
