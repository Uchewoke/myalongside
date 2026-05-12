const posts = [
  {
    id: "post_1",
    author: "Avery M.",
    event: "job-loss",
    title: "How I rebuilt confidence after being laid off",
    excerpt:
      "Three routines helped me stop spiraling and start applying with intention. Sharing here in case someone needs a place to begin.",
    comments: 28,
    support: 112,
    time: "2h ago",
  },
  {
    id: "post_2",
    author: "Naomi R.",
    event: "grief",
    title: "What grief support looked like in week one",
    excerpt:
      "I thought I had to be strong all the time. My mentor helped me name what I was feeling and ask for practical help from friends.",
    comments: 34,
    support: 140,
    time: "5h ago",
  },
  {
    id: "post_3",
    author: "Jordan T.",
    event: "relocation",
    title: "Starting over in a new city without losing yourself",
    excerpt:
      "Small rituals can make a new place feel safer. Here's what worked for me during month one.",
    comments: 16,
    support: 89,
    time: "1d ago",
  },
];

export default function CommunityPage() {
  return (
    <main className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Community</p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900 md:text-3xl">Shared Strength Stories</h1>
        </div>
        <button className="btn-primary">Create Post</button>
      </div>

      <section className="grid gap-4">
        {posts.map((post) => (
          <article key={post.id} className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-700">{post.author}</p>
              <span className="text-xs text-stone-500">{post.time}</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">{post.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">{post.excerpt}</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-stone-600">
              <span>{post.support} support</span>
              <span>{post.comments} comments</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
