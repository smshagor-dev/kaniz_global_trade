import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trade News & Blog',
  description: 'Marketplace insights, sourcing content, and trade updates from Kaniz Global Trade.',
}

export default async function BlogsPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 24,
    include: { category: { select: { name: true } } },
  })

  return (
    <div className="w-full px-4 py-12 md:px-6 lg:px-8 2xl:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Trade news</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">Marketplace blog</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
        Read sourcing insights, trade advice, supplier strategy, and marketplace updates.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.length ? posts.map((post) => (
          <Link key={post.id} href={`/blogs/${post.slug}`} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">{post.category?.name || 'Trade insight'}</p>
            <h2 className="mt-3 text-xl font-bold text-slate-950">{post.title}</h2>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt || post.content}</p>
          </Link>
        )) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            No published blog posts yet.
          </div>
        )}
      </div>
    </div>
  )
}
