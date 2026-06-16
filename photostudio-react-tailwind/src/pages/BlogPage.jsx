import { ArrowLeft } from "lucide-react";
import { blogs } from "../data/blogs";
import StoreButtons from "../components/StoreButtons";

/** @param {{ slug?: string }} [props] */
export default function BlogPage({ slug } = {}) {
  const blog = blogs.find((item) => item.slug === slug);

  if (!blog) {
    return (
      <main className="container-page py-16 text-center md:py-20">
        <h1 className="text-2xl font-bold text-slate-900">Blog not found</h1>
        <a href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline">
          <ArrowLeft size={16} />
          Back to home
        </a>
      </main>
    );
  }

  document.title = `${blog.title} | Our Memories`;

  const related = blogs.filter((b) => b.slug !== slug).slice(0, 2);

  return (
    <main className="bg-slate-50 py-10 md:py-14">
      <div className="container-page max-w-3xl">
        <a href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
          <ArrowLeft size={16} />
          Back to home
        </a>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-6 py-7 md:px-8 md:py-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Our Memories Blog</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white md:text-4xl">{blog.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/90 md:text-base">{blog.description}</p>
          </div>

          <div className="space-y-7 px-6 py-7 md:px-8 md:py-8">
            {blog.sections.map((section) => (
              <section key={section.heading} className="border-b border-slate-100 pb-7 last:border-0 last:pb-0">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">{section.heading}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-700 md:text-base">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mx-6 mb-7 rounded-2xl bg-slate-900 p-6 text-white md:mx-8 md:mb-8">
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">Open Our Memories</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Start creating beautiful digital albums, flipbooks, guest books, and event memories today.
            </p>
            <div className="mt-5">
              <StoreButtons />
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">More to read</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <a
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <p className="font-semibold text-slate-900 line-clamp-2">{item.title}</p>
                  <p className="mt-1.5 text-sm font-semibold text-blue-600">Read blog →</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
