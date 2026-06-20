import { notFound } from 'next/navigation'
import prisma from '@/lib/db/prisma'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, seoTitle: true, seoDesc: true },
  })

  if (!post) return { title: 'Blog post' }

  return {
    title: post.seoTitle || post.title,
    description: post.seoDesc || post.excerpt || undefined,
  }
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  })

  if (!post || post.status !== 'PUBLISHED' || post.deletedAt) notFound()

  return (
    <article className="w-full px-4 py-12 md:px-6 lg:px-8 2xl:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">{post.category?.name || 'Trade insight'}</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">{post.title}</h1>
      {post.excerpt ? <p className="mt-4 text-lg leading-8 text-slate-600">{post.excerpt}</p> : null}
      <div className="mt-10 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {post.content}
        </div>
      </div>
      {post.tags.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {post.tags.map(({ tag }) => (
            <span key={tag.id} className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600">
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}
