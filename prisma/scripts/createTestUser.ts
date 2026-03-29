import { prisma } from "../../lib/prisma"

async function main() {

  const user = await prisma.user.create({
    data: {
      email: "test@lexora.dev",
      passwordHash: "test",
      name: "Test User",
      jurisdiction: "UBE"
    }
  })

  console.log("User created:")
  console.log(user)

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })