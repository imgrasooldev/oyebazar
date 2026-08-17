/**
 * @oyebazar/whatsapp — provider abstraction ke peechay ki duniya.
 *
 * GOLDEN RULE #5: koi service seedha provider SDK call nahi karti. Phase 1 Wati/Interakt,
 * Phase 2 Meta Cloud API — us waqt sirf ye package badlega, web aur worker ko khabar bhi nahi hogi.
 *
 * ⚠ Broadcast yahan se nahi jata: wo worker ka throttled job hai (20 msg/sec se zyada
 * bhejna number restrict karwa deta hai aur wo jaldi recover nahi hota).
 */
import type {
  Logger,
  MessagingProvider,
  OutboundTemplateMessage,
  OutboundTextMessage,
} from '@oyebazar/core'

/** DEV — message kahin nahi jata, terminal par chhap jata hai (OTP wahin se parh lein). */
export class ConsoleMessagingProvider implements MessagingProvider {
  constructor(private readonly logger: Logger) {}

  async sendTemplate(message: OutboundTemplateMessage): Promise<{ providerMessageId: string }> {
    this.logger.info('whatsapp_template_dev', {
      to: message.to,
      template: message.template,
      params: message.params,
    })
    return { providerMessageId: `dev-${Date.now()}` }
  }

  async sendText(message: OutboundTextMessage): Promise<{ providerMessageId: string }> {
    this.logger.info('whatsapp_text_dev', { to: message.to, body: message.body })
    return { providerMessageId: `dev-${Date.now()}` }
  }
}

/** Wati (Phase 1 BSP) — Meta API ki approval aane tak yehi chalega. */
export class WatiMessagingProvider implements MessagingProvider {
  constructor(
    private readonly config: { apiUrl: string; apiKey: string },
    private readonly logger: Logger,
  ) {}

  async sendTemplate(message: OutboundTemplateMessage): Promise<{ providerMessageId: string }> {
    const res = await fetch(
      `${this.config.apiUrl}/api/v1/sendTemplateMessage?whatsappNumber=${message.to}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: message.template,
          broadcast_name: `${message.template}_${Date.now()}`,
          parameters: Object.entries(message.params).map(([name, value]) => ({ name, value })),
        }),
      },
    )

    if (!res.ok) {
      const body = await res.text()
      this.logger.error('whatsapp_send_failed', { status: res.status, body, to: message.to })
      throw new Error(`WhatsApp send failed: ${res.status}`)
    }

    const json = (await res.json()) as { id?: string }
    return { providerMessageId: json.id ?? 'unknown' }
  }

  async sendText(message: OutboundTextMessage): Promise<{ providerMessageId: string }> {
    const res = await fetch(
      `${this.config.apiUrl}/api/v1/sendSessionMessage/${message.to}?messageText=${encodeURIComponent(message.body)}`,
      { method: 'POST', headers: { Authorization: `Bearer ${this.config.apiKey}` } },
    )
    if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status}`)
    const json = (await res.json()) as { id?: string }
    return { providerMessageId: json.id ?? 'unknown' }
  }
}

/** Env se provider chunta hai — web aur worker dono yehi function call karte hain. */
export function createMessagingProvider(
  env: Record<string, string | undefined>,
  logger: Logger,
): MessagingProvider {
  if ((env.WHATSAPP_PROVIDER ?? 'console') === 'wati') {
    const apiUrl = env.WATI_API_URL
    const apiKey = env.WATI_API_KEY
    if (!apiUrl || !apiKey) {
      throw new Error('WHATSAPP_PROVIDER=wati hai magar WATI_API_URL/WATI_API_KEY set nahi')
    }
    return new WatiMessagingProvider({ apiUrl, apiKey }, logger)
  }
  return new ConsoleMessagingProvider(logger)
}
