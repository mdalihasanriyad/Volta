import mongoose from 'mongoose'

// Runs fn inside a MongoDB transaction (requires a replica set; MongoDB Atlas provides one).
export async function withTransaction(fn) {
  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => { result = await fn(session) })
    return result
  } finally {
    session.endSession()
  }
}
