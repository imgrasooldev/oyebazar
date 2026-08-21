/**
 * Raste mein khare order — ye job haath se chalane ka rasta.
 *
 *   pnpm --filter @oyebazar/worker exec tsx src/cli/transit-check.ts
 *
 * Poora container nahi banate (us ke liye Redis chahiye, jo is sawal se koi taluq nahi
 * rakhta). Repositories ASLI hain — yani query aur nishan dono wahi chalte hain jo
 * asli job chalati hai. Sirf WhatsApp wali jagah par paighaam bheja nahi jata, chhapa
 * jata hai: jaanchte waqt asli dukan ko message chala jana sab se bura anjaam hota.
 */
import { createRepositories, prisma } from '@oyebazar/db'
import { OrderReminderService } from '@oyebazar/core'
import { ConsoleLogger } from '../logger'

async function main(): Promise<void> {
  const repositories = createRepositories()
  const logger = new ConsoleLogger()

  const service = new OrderReminderService(
    repositories.orders,
    {
      async sendTemplate(message) {
        console.log('→ paighaam', message.to, message.template, message.params)
        return { providerMessageId: 'dry-run' }
      },
      async sendText() {
        return { providerMessageId: 'dry-run' }
      },
    },
    { now: () => new Date() },
    { async track() {} },
    logger,
  )

  const result = await service.remindStuckInTransit()
  console.log('poochha gaya:', result.reminded, '| nakaam:', result.failed)

  await prisma.$disconnect()
  process.exit(0)
}

void main()
