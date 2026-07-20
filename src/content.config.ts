import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog posts. Add a .md file to src/content/blog/ and it appears on the site.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    // 'blog' for dated posts; 'design-diary' for posts about games you're making.
    category: z.string().default('blog'),
    draft: z.boolean().default(false),
  }),
});

// Evergreen collections, plumbed in now so they're ready when you are.
// Drop markdown files into src/content/reviews/ or src/content/games/
// and build the pages when you launch those sections.
const reviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reviews' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    rating: z.number().min(1).max(10).optional(),
    designer: z.string().optional(),
    playerCount: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const games = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/games' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    status: z.enum(['idea', 'prototype', 'playtesting', 'released']).default('prototype'),
    pnpFile: z.string().optional(), // path to a print & play PDF in /public
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, reviews, games };
