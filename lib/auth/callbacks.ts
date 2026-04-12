/**
 * NextAuth Callback Functions
 * 
 * Implements secure JWT and session callbacks for NextAuth.
 * Handles user ID persistence and session management.
 * 
 * Requirements: 2.2, 7.3, 7.5
 */

import { CallbacksOptions } from "next-auth"
import { prisma, PRISMA_AVAILABLE } from "@/lib/database/client"

/**
 * NextAuth callbacks configuration
 * Implements JWT and session callbacks for secure authentication flow
 */
export const authCallbacks: Partial<CallbacksOptions> = {
  /**
   * JWT callback - called when JWT is created or updated
   * Requirement 2.2: Persist user ID to token for session access
   * Requirement 7.5: Log authentication events for security auditing
   */
  async jwt(params: any) {
    const { token, user, account, profile, trigger } = params;
    // On sign in, persist user id to token
    if (user) {
      token.id = user.id
      token.sub = user.id // Ensure sub is set
      token.email = user.email
      token.name = user.name
      token.role = user.role // Fix: Add user role to JWT
      console.log('[AUTH] JWT token created for user:', user.id)
    }

    // Session Invalidation Check: Ensure token isn't from before a forced invalidation
    if (token?.id && PRISMA_AVAILABLE) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { sessionValidAfter: true, lockedUntil: true }
        });
        
        // Account Lockout check during active session
        if (dbUser?.lockedUntil && new Date(dbUser.lockedUntil) > new Date()) {
          console.warn(`[AUTH] Session invalidated due to account lockout for user ${token.id}`);
          throw new Error("Account Locked"); // This will reject the JWT
        }

        // Global session invalidation
        if (dbUser?.sessionValidAfter && token.iat) {
          const validAfter = new Date(dbUser.sessionValidAfter).getTime() / 1000;
          if ((token.iat as number) < validAfter) {
            console.warn(`[AUTH] Session invalidated (issued before invalidation timestamp) for user ${token.id}`);
            throw new Error("Session Invalidated");
          }
        }
      } catch (error) {
        // If query fails or manual error thrown on invalidation, clear token identity
        return {};
      }
    }

    
    // Log authentication events for security auditing
    if (trigger === 'signIn') {
      console.log('[AUTH] Sign in event:', {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        timestamp: new Date().toISOString()
      })
    }
    
    if (trigger === 'signUp') {
      console.log('[AUTH] Sign up event:', {
        userId: user?.id,
        email: user?.email,
        timestamp: new Date().toISOString()
      })
    }
    
    return token
  },
  
  /**
   * Session callback - called when session is checked
   * Requirement 2.2: Add user ID from token to session
   */
  // @ts-ignore
  async session({ session, token, user }) {
    // Add user id from token to session (JWT strategy)
    if (session?.user && token?.sub) {
      session.user.id = token.sub
    }
    // Also check for id directly on token if set manually
    else if (session?.user && token?.id) {
       session.user.id = token.id
    }

    // Persist email, name, and role if available in token
    if (session?.user && token?.email) {
      session.user.email = token.email
    }
    if (session?.user && token?.name) {
      session.user.name = token.name
    }
    if (session?.user && token?.role) {
      session.user.role = token.role // Fix: Pass role to session
    }
    
    // Add user id from database user (when using database sessions)
    if (session?.user && user?.id) {
      session.user.id = user.id
    }
    if (session?.user && user?.role) {
      session.user.role = user.role // Fallback for database sessions
    }
    
    return session
  },
  
  /**
   * Sign in callback - called when user signs in
   * Can be used to control who can sign in
   * Requirement 7.5: Log authentication events
   * Requirement 22.3: Account linking when OAuth email matches existing account
   */
  async signIn({ user, account, profile, email, credentials }: any) {
    console.log('[AUTH] Sign in attempt:', {
      userId: user?.id,
      email: user?.email,
      provider: account?.provider,
      timestamp: new Date().toISOString()
    })

    // Requirement 22.3: Link OAuth account to existing user with matching email
    if (
      PRISMA_AVAILABLE &&
      prisma &&
      (account?.provider === 'github' || account?.provider === 'google') &&
      user?.email
    ) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        })

        if (existingUser) {
          // Check if this OAuth account is already linked
          const existingAccount = await prisma.account.findFirst({
            where: { userId: existingUser.id, provider: account.provider }
          })

          if (!existingAccount) {
            // Link the OAuth account to the existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
              }
            })
            console.log(`[AUTH] Linked ${account.provider} account to existing user:`, existingUser.email)
          }
        }
      } catch (e) {
        console.error('[AUTH] Error during OAuth account linking:', e)
        // Don't block sign in on linking failure
      }
    }

    return true
  }
}
