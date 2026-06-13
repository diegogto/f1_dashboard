export default {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://f1user:f1pass@localhost:5432/f1db',
  },
}

