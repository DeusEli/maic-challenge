# Dockerfile para Next.js
FROM node:20-alpine AS base

# Instalar dependencias solo cuando sea necesario
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Construir la aplicación
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js recolecta telemetría completamente anónima sobre el uso general
# Aprende más aquí: https://nextjs.org/telemetry
# Descomenta la siguiente línea para deshabilitar la telemetría durante la construcción
# ENV NEXT_TELEMETRY_DISABLED=1

# Pasar variables de entorno al build (Railway las inyecta automáticamente)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Imagen de producción, copiar todos los archivos y ejecutar Next.js
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Descomenta la siguiente línea para deshabilitar la telemetría durante el runtime
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar automáticamente archivos de salida utilizando standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
