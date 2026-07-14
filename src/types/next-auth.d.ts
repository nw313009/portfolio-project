import type { DefaultSession } from "next-auth";

/**
 * Module augmentation for the custom fields Slice 3 stamps onto the JWT and
 * session: the resolved primary VERIFIED email and a derived admin flag.
 */
declare module "next-auth" {
  interface Session {
    user: {
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
  }
}
