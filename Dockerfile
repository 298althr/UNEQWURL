# 298EQ Next.js App — Minimal Runtime Dockerfile
# Uses pre-built standalone output from host (npm run build already ran)

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Copy pre-built standalone output from host
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
