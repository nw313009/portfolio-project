import { about as generatedAbout } from "../../.velite";
import type { About } from "@/lib/about-schema";

/** The validated "about me" entry plus its compiled MDX body string. */
export type AboutEntry = About & { body: string };

/** Single about-me entry, validated at build time by Velite. */
export const about: AboutEntry = generatedAbout;
